import mongoose from "mongoose";
import { scanQueue } from "../jobs/queues.js";

const mongoState = () => ({
  0: "disconnected",
  1: "up",
  2: "connecting",
  3: "disconnecting",
}[mongoose.connection.readyState] || "unknown");

export async function getSystemHealth() {
  const checks = { mongodb: mongoState(), redis: "down" };
  try {
    await scanQueue.getJobCounts("wait", "active");
    checks.redis = "up";
  } catch {
    checks.redis = "down";
  }

  const ready = checks.mongodb === "up" && checks.redis === "up";
  return {
    status: ready ? "ok" : "degraded",
    service: "cpsm-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks,
  };
}