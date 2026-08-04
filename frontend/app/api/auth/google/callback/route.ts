import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl, setSessionCookie } from "@/lib/auth-server";

export const runtime = "nodejs";

const transactionCookie = "cpsm_google_oauth";

const applicationOrigin = (request: NextRequest) => {
  try {
    return new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI || request.url).origin;
  } catch {
    return new URL(request.url).origin;
  }
};

const loginError = (request: NextRequest, error: string) => {
  const url = new URL("/login", applicationOrigin(request));
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.set(transactionCookie, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
};

const statesMatch = (received: string, expected: string) => {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
};

const oauthNetworkMessage = (error: unknown) => {
  const causeCode = error && typeof error === "object" && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
    ? String(error.cause.code)
    : "";
  if (causeCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
    return "This development machine cannot verify Google's TLS certificate. Restart with the system CA configuration.";
  }
  return "Authentication service is unavailable. Please try again.";
};

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return loginError(request, "Google sign-in was cancelled or denied.");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const rawTransaction = request.cookies.get(transactionCookie)?.value;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!code || !state || !rawTransaction || !clientId || !clientSecret || !redirectUri) {
    return loginError(request, "Google sign-in request is incomplete or has expired.");
  }

  let transaction: { state?: string; verifier?: string };
  try {
    transaction = JSON.parse(rawTransaction) as { state?: string; verifier?: string };
  } catch {
    return loginError(request, "Google sign-in request is invalid or has expired.");
  }
  if (!transaction.state || !transaction.verifier || !statesMatch(state, transaction.state)) {
    return loginError(request, "Google sign-in request could not be verified.");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: transaction.verifier,
      }),
      cache: "no-store",
    });
    const tokenPayload = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || typeof tokenPayload?.id_token !== "string") {
      return loginError(request, "Google could not complete the sign-in request.");
    }

    const apiResponse = await fetch(`${backendApiUrl()}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: tokenPayload.id_token }),
      cache: "no-store",
    });
    const apiPayload = await apiResponse.json().catch(() => null);
    if (!apiResponse.ok || !apiPayload?.success || typeof apiPayload?.data?.token !== "string") {
      return loginError(request, apiPayload?.message || "Google account could not be authenticated.");
    }

    const response = NextResponse.redirect(new URL("/dashboard", applicationOrigin(request)));
    setSessionCookie(response, apiPayload.data.token);
    response.cookies.set(transactionCookie, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return loginError(request, oauthNetworkMessage(error));
  }
}