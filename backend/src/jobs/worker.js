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

await connectDB();
await configureScanQueue();

const activeControllers = new Map();
const controlSubscriber = createRedisConnection();
await controlSubscriber.subscribe(SCAN_CONTROL_CHANNEL);

controlSubscriber.on("message", (_channel, rawMessage) => {
  try {
    const event = JSON.parse(rawMessage);
    if (event.type !== "cancel") return;

    const controller = activeControllers.get(event.scanId);
    if (controller && !controller.signal.aborted) {
      controller.abort(new Error("Cancellation requested by user."));
    }
  } catch (error) {
    console.error("[Worker] Invalid control message:", error.message);
  }
});

const worker = new Worker(
  SCAN_QUEUE_NAME,
  (job, _token, signal) =>
    processScanJob(job, {
      signal,
      registerController: (scanId, controller) => activeControllers.set(scanId, controller),
      unregisterController: (scanId) => activeControllers.delete(scanId),
    }),
  {
    connection: createRedisConnection(),
    concurrency: Number(process.env.SCAN_CONCURRENCY || 2),
  }
);

worker.on("completed", (job, result) => {
  console.log(`[Worker] ${job.id} completed: ${result.status}`);
});

worker.on("failed", (job, error) => {
  console.error(`[Worker] ${job?.id || "unknown"} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("[Worker] Queue error:", error.message);
});

const shutdown = async (signal) => {
  console.log(`[Worker] ${signal} received, shutting down.`);
  await worker.close();
  await controlSubscriber.quit();
  await closeQueues();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
