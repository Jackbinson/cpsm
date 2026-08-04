import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl, setSessionCookie } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ success: false, message: "Name, email and password are required." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${backendApiUrl()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: body.name, email: body.email, password: body.password }),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload?.success || typeof payload?.data?.token !== "string") {
      return NextResponse.json(payload || { success: false, message: "Could not create the account." }, { status: upstream.status || 502 });
    }

    const { token, ...user } = payload.data;
    const response = NextResponse.json({ success: true, data: user }, { status: 201 });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Authentication service is unavailable." }, { status: 502 });
  }
}