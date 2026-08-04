import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const transactionCookie = "cpsm_google_oauth";
const transactionMaxAge = 10 * 60;

const base64Url = (value: Buffer) => value.toString("base64url");

function loginError(request: NextRequest, error: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return loginError(request, "Google sign-in has not been configured yet.");
  }

  const state = base64Url(randomBytes(32));
  const verifier = base64Url(randomBytes(64));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(transactionCookie, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: transactionMaxAge,
  });
  return response;
}