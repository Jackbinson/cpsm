import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl, clearSessionCookie, sessionCookieName } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName)?.value;
  if (token) {
    try {
      await fetch(`${backendApiUrl()}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    } catch { /* Clear the local cookie even if the API is down. */ }
  }
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}