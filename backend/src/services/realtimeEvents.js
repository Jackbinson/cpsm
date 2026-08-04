import IORedis from "ioredis";
import { logger } from "./structuredLogger.js";

export const REALTIME_CHANNEL = "cspm:realtime";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const publisher = new IORedis(redisUrl, { maxRetriesPerRequest: null });

publisher.on("error", (error) => logger.error("realtime.publisher_error", { error }));

export const publishRealtimeEvent = async (type, payload) => {
  await publisher.publish(REALTIME_CHANNEL, JSON.stringify({ type, payload }));
  logger.debug("realtime.event_published", { type });
};

export const createRealtimeSubscriber = () => {
  const subscriber = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  subscriber.on("error", (error) => logger.error("realtime.subscriber_error", { error }));
  return subscriber;
};