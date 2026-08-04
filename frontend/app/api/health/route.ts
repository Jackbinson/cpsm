import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/auth-server";
import { logServerEvent } from "@/lib/server/logger";

export const runtime = "nodejs";
let previousStatus = "checking";

export async function GET() {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${backendApiUrl()}/health`, { cache: "no-store", signal: controller.signal });
    const apiHealth = await response.json().catch(() => null) as { status?: string; checks?: Record<string, string> } | null;
    const status = response.ok && apiHealth?.status === "ok" ? "operational" : "degraded";
    if (status !== previousStatus) {
      logServerEvent(status === "operational" ? "info" : "warn", "website.status_changed", {
        status,
        apiStatus: apiHealth?.status || "unavailable",
        durationMs: Date.now() - startedAt,
      });
      previousStatus = status;
    }
    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      checks: { website: "up", api: apiHealth?.status || "unavailable", ...(apiHealth?.checks || {}) },
    }, { status: status === "operational" ? 200 : 503 });
  } catch {
    if (previousStatus !== "degraded") {
      logServerEvent("error", "website.status_changed", { status: "degraded", apiStatus: "unreachable", durationMs: Date.now() - startedAt });
      previousStatus = "degraded";
    }
    return NextResponse.json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      checks: { website: "up", api: "unreachable" },
    }, { status: 503 });
  } finally {
    clearTimeout(timer);
  }
}