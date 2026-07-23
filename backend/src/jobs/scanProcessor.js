import { UnrecoverableError } from "bullmq";
import AuditLog from "../models/AuditLog.js";
import ScanRun from "../models/ScanRun.js";
import { scanDlq } from "./queues.js";
import { executeCloudScan } from "../services/scanExecutionService.js";
import { publishRealtimeEvent } from "../services/realtimeEvents.js";
import { toRealtimePayload } from "../services/scanJobService.js";

const timeoutMs = Number(process.env.SCAN_TIMEOUT_MS || 600000);
const backoffMs = Number(process.env.SCAN_BACKOFF_MS || 5000);
const cancelPollMs = Number(process.env.SCAN_CANCEL_POLL_MS || 1000);

const publishScanRun = async (scanRun) => {
  await publishRealtimeEvent("scan.status.changed", toRealtimePayload(scanRun));
};

const publishAuditLog = async (auditLog) => {
  await publishRealtimeEvent("audit-log.created", {
    auditLog: auditLog.toObject(),
  });
};

const createAuditLog = async ({ scanRun, status, details, errorMessage, summary = {} }) => {
  const auditLog = await AuditLog.create({
    action: "RÀ QUÉT TOÀN DIỆN",
    actor: "Hệ thống Backend",
    resourceType: "S3",
    targetResource: "S3, EC2, IAM",
    status,
    details,
    errorMessage,
    itemsProcessed: summary.processed || 0,
    itemsViolated: summary.violated || 0,
    executionTime: scanRun.startedAt ? Date.now() - scanRun.startedAt.getTime() : undefined,
  });
  await publishAuditLog(auditLog);
};

const getErrorCode = (error) =>
  error?.code || error?.name || error?.$metadata?.httpStatusCode?.toString() || "SCAN_FAILED";

const isCancellationRequested = (scanRun) =>
  Boolean(scanRun?.cancelRequestedAt) || ["cancelling", "cancelled"].includes(scanRun?.status);

const isRetryable = (error) => {
  const code = getErrorCode(error);
  const statusCode = error?.$metadata?.httpStatusCode || error?.statusCode;
  const nonRetryableCodes = new Set([
    "AccessDenied",
    "AccessDeniedException",
    "InvalidClientTokenId",
    "UnrecognizedClientException",
    "ValidationException",
    "NoSuchEntity",
    "UnauthorizedOperation",
  ]);

  if (nonRetryableCodes.has(code)) return false;
  if (statusCode >= 500 || statusCode === 429) return true;
  if (code === "ScanTimeoutError" || code === "TimeoutError") return true;
  return /throttl|timeout|network|econn|socket|serviceunavailable/i.test(
    `${code} ${error?.message || ""}`
  );
};

const markCancelled = async (scanId) => {
  const scanRun = await ScanRun.findOneAndUpdate(
    { scanId, status: { $in: ["queued", "running", "cancelling"] } },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        finishedAt: new Date(),
        nextRetryAt: null,
      },
    },
    { new: true }
  );

  if (scanRun) await publishScanRun(scanRun);
  return scanRun;
};

const markFailedAndDeadLetter = async ({ scanRun, error, attempt }) => {
  scanRun.status = "failed";
  scanRun.finishedAt = new Date();
  scanRun.nextRetryAt = null;
  scanRun.error = {
    code: getErrorCode(error),
    message: error.message || "Cloud scan failed.",
    stack: error.stack,
  };
  scanRun.attempt = attempt;
  await scanRun.save();
  await publishScanRun(scanRun);

  await scanDlq.add(
    "cloud-scan-dead-letter",
    {
      scanId: scanRun.scanId,
      attempt,
      error: {
        code: scanRun.error.code,
        message: scanRun.error.message,
      },
    },
    { jobId: `${scanRun.scanId}-attempt-${attempt}` }
  );

  await createAuditLog({
    scanRun,
    status: "Thất bại",
    details: `Scan ${scanRun.scanId} failed after ${attempt} attempt(s).`,
    errorMessage: scanRun.error.message,
  });
};

export const processScanJob = async (job, runtime = {}) => {
  const scanId = job.data?.scanId;
  if (!scanId) throw new UnrecoverableError("Job does not contain scanId.");

  const attempt = job.attemptsMade + 1;
  let scanRun = await ScanRun.findOneAndUpdate(
    { scanId, status: "queued" },
    {
      $set: {
        status: "running",
        attempt,
        startedAt: new Date(),
        nextRetryAt: null,
        error: { code: null, message: null, stack: null },
      },
    },
    { new: true }
  );

  if (!scanRun) {
    const existing = await ScanRun.findOne({ scanId });
    if (existing && ["cancelled", "cancelling", "completed", "failed"].includes(existing.status)) {
      return { scanId, status: existing.status, skipped: true };
    }
    throw new UnrecoverableError("Scan is not available for processing.");
  }

  await publishScanRun(scanRun);

  const controller = new AbortController();
  runtime.registerController?.(scanId, controller);

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    const error = new Error("Cloud scan timed out.");
    error.name = "ScanTimeoutError";
    controller.abort(error);
  }, timeoutMs);

  const forwardAbort = () => controller.abort(runtime.signal?.reason || new Error("Worker cancelled job."));
  runtime.signal?.addEventListener?.("abort", forwardAbort, { once: true });

  let polling = false;
  const cancellationPoller = setInterval(async () => {
    if (polling || controller.signal.aborted) return;
    polling = true;
    try {
      const current = await ScanRun.findOne({ scanId }).select("status cancelRequestedAt").lean();
      if (isCancellationRequested(current)) {
        controller.abort(new Error("Cancellation requested."));
      }
    } finally {
      polling = false;
    }
  }, cancelPollMs);
  cancellationPoller.unref?.();

  try {
    const summary = await executeCloudScan({
      scanRun,
      signal: controller.signal,
      onProgress: async (progress) => {
        const updated = await ScanRun.findOneAndUpdate(
          { scanId, status: { $in: ["running", "cancelling"] } },
          { $set: { progress } },
          { new: true }
        );
        if (updated) await publishScanRun(updated);
      },
    });

    const current = await ScanRun.findOne({ scanId });
    if (controller.signal.aborted || isCancellationRequested(current)) {
      await markCancelled(scanId);
      return { scanId, status: "cancelled" };
    }

    scanRun = await ScanRun.findOneAndUpdate(
      { scanId, status: "running" },
      {
        $set: {
          status: "completed",
          finishedAt: new Date(),
          progress: { stage: "done", processed: summary.processed, total: summary.processed },
          summary,
          nextRetryAt: null,
        },
      },
      { new: true }
    );

    if (!scanRun) throw new Error("Scan state changed before completion.");

    await createAuditLog({
      scanRun,
      status: "Thành công",
      details: `Processed ${summary.processed} resources and found ${summary.violated} violations.`,
      summary,
    });
    await publishScanRun(scanRun);
    return { scanId, status: "completed", summary };
  } catch (error) {
    const current = await ScanRun.findOne({ scanId });
    if (isCancellationRequested(current) && !timedOut) {
      await markCancelled(scanId);
      return { scanId, status: "cancelled" };
    }

    const retryable = isRetryable(error);
    const isLastAttempt = attempt >= (job.opts.attempts || scanRun.maxAttempts);
    if (!retryable || isLastAttempt) {
      await markFailedAndDeadLetter({ scanRun, error, attempt });
      throw new UnrecoverableError(error.message || "Cloud scan failed.");
    }

    const nextRetryAt = new Date(Date.now() + backoffMs * 2 ** (attempt - 1));
    scanRun.status = "queued";
    scanRun.attempt = attempt;
    scanRun.nextRetryAt = nextRetryAt;
    scanRun.error = {
      code: getErrorCode(error),
      message: error.message || "Cloud scan failed and will retry.",
      stack: error.stack,
    };
    await scanRun.save();
    await publishScanRun(scanRun);
    throw error;
  } finally {
    clearTimeout(timeout);
    clearInterval(cancellationPoller);
    runtime.signal?.removeEventListener?.("abort", forwardAbort);
    runtime.unregisterController?.(scanId);
  }
};
