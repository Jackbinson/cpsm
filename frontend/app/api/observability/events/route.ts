import { NextRequest, NextResponse } from "next/server";
import { logServerEvent } from "@/lib/server/logger";

export const runtime = "nodejs";
const allowedEvents = new Set(["website.status_changed", "client.runtime_error"]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { event?: unknown; status?: unknown; kind?: unknown } | null;
  if (!body || typeof body.event !== "string" || !allowedEvents.has(body.event)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status.slice(0, 32) : undefined;
  const kind = typeof body.kind === "string" ? body.kind.slice(0, 64) : undefined;
  logServerEvent(body.event === "client.runtime_error" ? "warn" : "info", body.event, { source: "browser", status, kind });
  return new NextResponse(null, { status: 204 });
}