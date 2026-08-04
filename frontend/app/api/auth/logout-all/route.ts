import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl, clearSessionCookie, sessionCookieName } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (!token) {
    const response = NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
    clearSessionCookie(response);
    return response;
  }

  try {
    const upstream = await fetch(`${backendApiUrl()}/auth/logout-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => null);
    const response = NextResponse.json(payload || { success: false, message: "Could not sign out from all devices." }, { status: upstream.status });
    clearSessionCookie(response);
    return response;
  } catch {
    const response = NextResponse.json({ success: false, message: "Authentication service is unavailable." }, { status: 502 });
    clearSessionCookie(response);
    return response;
  }
}