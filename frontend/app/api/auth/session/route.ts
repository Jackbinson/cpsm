import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl, clearSessionCookie, sessionCookieName } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });

  try {
    const upstream = await fetch(`${backendApiUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => null);
    const response = NextResponse.json(payload || { success: false, message: "Could not validate session." }, { status: upstream.status });
    if (!upstream.ok) clearSessionCookie(response);
    return response;
  } catch {
    const response = NextResponse.json({ success: false, message: "Authentication service is unavailable." }, { status: 502 });
    clearSessionCookie(response);
    return response;
  }
}