import "dotenv/config";
import { Worker } from "bullmq";
import connectDB from "../config/db.js";
import {
  SCAN_CONTROL_CHANNEL,
  SCAN_QUEUE_NAME,
  closeQueues,
  configureScanQueue,
  createRedisConnection,
} from "./queues.js";
import { processScanJob } from "./scanProcessor.js";
import { logger } from "../services/structuredLogger.js";

const activeControllers = new Map();
let worker;
let controlSubscriber;
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("worker.shutting_down", { signal });

  try {
    await worker?.close();
    await controlSubscriber?.quit();
    await closeQueues();
    logger.info("worker.stopped", { signal });
  } catch (error) {
    logger.error("worker.shutdown_failed", { signal, error });
    exitCode = 1;
  }

  process.exit(exitCode);
};

const startWorker = async () => {
  logger.info("worker.starting", { concurrency: Number(process.env.SCAN_CONCURRENCY || 2) });
  await connectDB();
  await configureScanQueue();

  controlSubscriber = createRedisConnection("scan-control-subscriber");
  await controlSubscriber.subscribe(SCAN_CONTROL_CHANNEL);
  logger.info("worker.control_channel_subscribed", { channel: SCAN_CONTROL_CHANNEL });

  controlSubscriber.on("message", (_channel, rawMessage) => {
    try {
      const event = JSON.parse(rawMessage);
      if (event.type !== "cancel") return;

      const controller = activeControllers.get(event.scanId);
      if (controller && !controller.signal.aborted) {
        logger.info("scan.cancellation_received", { scanId: event.scanId });
        controller.abort(new Error("Cancellation requested by user."));
      }
    } catch (error) {
      logger.warn("worker.invalid_control_message", { error });
    }
  });

  worker = new Worker(
    SCAN_QUEUE_NAME,
    (job, _token, signal) => {
      logger.info("worker.job_started", {
        jobId: job.id,
        scanId: job.data?.scanId,
        attempt: job.attemptsMade + 1,
      });
      return processScanJob(job, {
        signal,
        registerController: (scanId, controller) => activeControllers.set(scanId, controller),
        unregisterController: (scanId) => activeControllers.delete(scanId),
      });
    },
    {
      connection: createRedisConnection("scan-worker"),
      concurrency: Number(process.env.SCAN_CONCURRENCY || 2),
    }
  );

  worker.on("completed", (job, result) => {
    logger.info("worker.job_completed", {
      jobId: job.id,
      scanId: job.data?.scanId,
      status: result?.status,
      attemptsMade: job.attemptsMade,
      summary: result?.summary,
    });
  });

  worker.on("failed", (job, error) => {
    logger.error("worker.job_failed", {
      jobId: job?.id || "unknown",
      scanId: job?.data?.scanId,
      attemptsMade: job?.attemptsMade,
      retryExpected: Boolean(job && job.attemptsMade < (job.opts.attempts || 1)),
      error,
    });
  });

  worker.on("error", (error) => logger.error("worker.queue_error", { error }));
  logger.info("worker.started", { queue: SCAN_QUEUE_NAME });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => logger.error("process.unhandled_rejection", { component: "worker", error }));
process.on("uncaughtException", (error) => {
  logger.error("process.uncaught_exception", { component: "worker", error });
  shutdown("uncaughtException", 1);
});

startWorker().catch((error) => {
  logger.error("worker.start_failed", { error });
  shutdown("startup_failure", 1);
});