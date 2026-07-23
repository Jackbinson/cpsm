import IORedis from "ioredis";

export const REALTIME_CHANNEL = "cspm:realtime";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const publisher = new IORedis(redisUrl, { maxRetriesPerRequest: null });

publisher.on("error", (error) => {
  console.error("[Realtime] Redis publisher error:", error.message);
});

export const publishRealtimeEvent = async (type, payload) => {
  await publisher.publish(REALTIME_CHANNEL, JSON.stringify({ type, payload }));
};

export const createRealtimeSubscriber = () =>
  new IORedis(redisUrl, { maxRetriesPerRequest: null });
