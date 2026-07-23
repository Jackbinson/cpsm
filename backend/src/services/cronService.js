import cron from "node-cron";
import { enqueueScan } from "./scanJobService.js";

export const startCronJobs = () => {
  cron.schedule("0 * * * *", async () => {
    const hour = new Date().toISOString().slice(0, 13);
    try {
      const { scanRun, created } = await enqueueScan({
        idempotencyKey: `cron:${hour}`,
        idempotencyScope: "system:cron",
        requestPayload: { source: "cron", hour },
      });
      console.log(`[Cron] ${created ? "Queued" : "Reused"} scan ${scanRun.scanId}`);
    } catch (error) {
      console.error("[Cron] Could not queue scan:", error.message);
    }
  });
};
