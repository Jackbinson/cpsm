import IORedis from "ioredis";
import { Queue } from "bullmq";

export const SCAN_QUEUE_NAME = "cloud-scan";
export const SCAN_DLQ_NAME = "cloud-scan-dlq";
export const SCAN_CONTROL_CHANNEL = "cspm:scan-control";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const maxAttempts = Number(process.env.SCAN_MAX_ATTEMPTS || 4);
const backoffDelay = Number(process.env.SCAN_BACKOFF_MS || 5000);
const globalConcurrency = Number(process.env.SCAN_CONCURRENCY || 2);

export const createRedisConnection = () =>
  new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });

export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
  connection: createRedisConnection(),
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
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const configureScanQueue = async () => {
  await scanQueue.setGlobalConcurrency(globalConcurrency);
};

export const closeQueues = async () => {
  await Promise.all([scanQueue.close(), scanDlq.close()]);
};
