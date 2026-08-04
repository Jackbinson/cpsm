import IORedis from "ioredis";
import { Queue } from "bullmq";
import { logger } from "../services/structuredLogger.js";

export const SCAN_QUEUE_NAME = "cloud-scan";
export const SCAN_DLQ_NAME = "cloud-scan-dlq";
export const SCAN_CONTROL_CHANNEL = "cspm:scan-control";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const maxAttempts = Number(process.env.SCAN_MAX_ATTEMPTS || 4);
const backoffDelay = Number(process.env.SCAN_BACKOFF_MS || 5000);
const globalConcurrency = Number(process.env.SCAN_CONCURRENCY || 2);

export const createRedisConnection = (name = "redis") => {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  connection.on("error", (error) => logger.error("redis.connection_error", { connection: name, error }));
  return connection;
};

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: createRedisConnection("scan-queue"),
  defaultJobOptions: {
    attempts: maxAttempts,
    backoff: {
      type: "exponential",
      delay: backoffDelay,
      jitter: 0.2,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },
    removeOnFail: false,
  },
});

export const scanDlq = new Queue(SCAN_DLQ_NAME, {
  connection: createRedisConnection("scan-dead-letter-queue"),
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

scanQueue.on("error", (error) => logger.error("queue.error", { queue: SCAN_QUEUE_NAME, error }));
scanDlq.on("error", (error) => logger.error("queue.error", { queue: SCAN_DLQ_NAME, error }));

export const configureScanQueue = async () => {
  await scanQueue.setGlobalConcurrency(globalConcurrency);
  logger.info("queue.configured", { queue: SCAN_QUEUE_NAME, globalConcurrency });
};

export const closeQueues = async () => {
  logger.info("queue.closing", { queues: [SCAN_QUEUE_NAME, SCAN_DLQ_NAME] });
  await Promise.all([scanQueue.close(), scanDlq.close()]);
  logger.info("queue.closed", { queues: [SCAN_QUEUE_NAME, SCAN_DLQ_NAME] });
};