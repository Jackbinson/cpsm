import type { NextResponse } from "next/server";

export const sessionCookieName = "cpsm_access_token";
const isProduction = process.env.NODE_ENV === "production";

export const backendApiUrl = () =>
  (process.env.CPSM_API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001/api/v1").replace(/\/$/, "");

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProduction,
  path: "/",
  maxAge: 60 * 60 * 8,
};

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(sessionCookieName, token, sessionCookieOptions);
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", { ...sessionCookieOptions, maxAge: 0 });
}