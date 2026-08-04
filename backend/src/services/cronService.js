import cron from "node-cron";
import { enqueueScan } from "./scanJobService.js";
import { logger } from "./structuredLogger.js";

export const startCronJobs = () => {
  const schedule = "0 * * * *";
  cron.schedule(schedule, async () => {
    const hour = new Date().toISOString().slice(0, 13);
    try {
      const { scanRun, created } = await enqueueScan({
        idempotencyKey: `cron:${hour}`,
        idempotencyScope: "system:cron",
        requestPayload: { source: "cron", hour },
      });
      logger.info("cron.scan_enqueued", { scanId: scanRun.scanId, created, hour });
    } catch (error) {
      logger.error("cron.scan_enqueue_failed", { hour, error });
    }
  });
  logger.info("cron.started", { schedule });
};