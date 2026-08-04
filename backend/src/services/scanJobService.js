import crypto from "crypto";
import ScanRun from "../models/ScanRun.js";
import {
  SCAN_CONTROL_CHANNEL,
  createRedisConnection,
  scanQueue,
} from "../jobs/queues.js";
import { publishRealtimeEvent } from "./realtimeEvents.js";
import { logger } from "./structuredLogger.js";

const maxAttempts = Number(process.env.SCAN_MAX_ATTEMPTS || 4);
const controlPublisher = createRedisConnection();

const stableSerialize = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

export const toRealtimePayload = (scanRun) => ({
  scanId: scanRun.scanId,
  createdBy: scanRun.createdBy?.toString() || null,
  status: scanRun.status,
  attempt: scanRun.attempt,
  maxAttempts: scanRun.maxAttempts,
  progress: scanRun.progress,
  summary: scanRun.summary,
  nextRetryAt: scanRun.nextRetryAt,
  errorMessage: scanRun.error?.message || null,
  updatedAt: scanRun.updatedAt,
});

export class IdempotencyConflictError extends Error {}
export class QueueUnavailableError extends Error {}

export const enqueueScan = async ({
  idempotencyKey,
  idempotencyScope,
  createdBy = null,
  requestPayload = {},
}) => {
  const requestHash = crypto
    .createHash("sha256")
    .update(stableSerialize(requestPayload))
    .digest("hex");

  let scanRun;
  let created = false;

  try {
    scanRun = await ScanRun.create({
      scanId: crypto.randomUUID(),
      idempotencyKey,
      idempotencyScope,
      requestHash,
      createdBy,
      maxAttempts,
    });
    created = true;
  } catch (error) {
    if (error?.code !== 11000) throw error;

    scanRun = await ScanRun.findOne({ idempotencyScope, idempotencyKey });
    if (!scanRun || scanRun.requestHash !== requestHash) {
      throw new IdempotencyConflictError(
        "Idempotency-Key da duoc dung cho mot request khac."
      );
    }
  }

  if (!created) {
    logger.info("scan.enqueue_reused", { scanId: scanRun.scanId, createdBy: createdBy?.toString() });
    return { scanRun, created: false };
  }

  logger.info("scan.enqueue_started", { scanId: scanRun.scanId, createdBy: createdBy?.toString() });

  try {
    const job = await scanQueue.add(
      "cloud-scan",
      { scanId: scanRun.scanId },
      { jobId: scanRun.scanId }
    );

    scanRun.queueJobId = job.id;
    await scanRun.save();
    await publishRealtimeEvent("scan.status.changed", toRealtimePayload(scanRun));
    logger.info("scan.enqueued", { scanId: scanRun.scanId, queueJobId: job.id });
    return { scanRun, created: true };
  } catch (error) {
    logger.error("scan.enqueue_failed", { scanId: scanRun.scanId, error });
    scanRun.status = "failed";
    scanRun.finishedAt = new Date();
    scanRun.error = {
      code: "QUEUE_UNAVAILABLE",
      message: "Khong the dua yeu cau ra quet vao queue.",
      stack: error.stack,
    };
    await scanRun.save();
    await publishRealtimeEvent("scan.status.changed", toRealtimePayload(scanRun));
    throw new QueueUnavailableError("Cloud scan queue is unavailable.");
  }
};

export const requestScanCancellation = async (scanRun) => {
  if (["completed", "failed", "cancelled"].includes(scanRun.status)) {
    logger.info("scan.cancellation_skipped", { scanId: scanRun.scanId, status: scanRun.status });
    return { scanRun, cancellationPending: false, alreadyTerminal: true };
  }

  const job = await scanQueue.getJob(scanRun.queueJobId || scanRun.scanId);
  const jobState = job ? await job.getState() : null;

  if (["waiting", "delayed", "prioritized", "paused"].includes(jobState)) {
    await job.remove();
    scanRun.status = "cancelled";
    scanRun.cancelRequestedAt = new Date();
    scanRun.cancelledAt = new Date();
    scanRun.finishedAt = new Date();
    scanRun.nextRetryAt = null;
    await scanRun.save();
    await publishRealtimeEvent("scan.status.changed", toRealtimePayload(scanRun));
    logger.info("scan.cancelled_before_start", { scanId: scanRun.scanId, jobState });
    return { scanRun, cancellationPending: false, alreadyTerminal: false };
  }

  scanRun.status = "cancelling";
  scanRun.cancelRequestedAt = new Date();
  await scanRun.save();
  await controlPublisher.publish(
    SCAN_CONTROL_CHANNEL,
    JSON.stringify({ type: "cancel", scanId: scanRun.scanId })
  );
  await publishRealtimeEvent("scan.status.changed", toRealtimePayload(scanRun));
  logger.info("scan.cancellation_published", { scanId: scanRun.scanId, jobState });

  return { scanRun, cancellationPending: true, alreadyTerminal: false };
};
