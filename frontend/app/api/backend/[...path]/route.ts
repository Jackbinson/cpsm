import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl, sessionCookieName } from "@/lib/auth-server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Authentication is required." }, { status: 401 });

  const { path } = await context.params;
  const destination = new URL(`${backendApiUrl()}/${path.map(encodeURIComponent).join("/")}`);
  destination.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const idempotencyKey = request.headers.get("idempotency-key");
  if (contentType) headers.set("content-type", contentType);
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  headers.set("authorization", `Bearer ${token}`);

  try {
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
    const upstream = await fetch(destination, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    const responseContentType = upstream.headers.get("content-type");
    if (responseContentType) responseHeaders.set("content-type", responseContentType);
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ success: false, message: "CPSM API is unavailable." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;