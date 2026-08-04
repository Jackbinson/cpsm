import type { ApiEnvelope } from "@/types/cspm";

export const API_BASE_URL = "/api/backend";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { success?: boolean; message?: string; error?: { code?: string; message?: string; requestId?: string } }
    | null;

  if (!response.ok || !payload || payload.success === false) {
    const error = payload && "error" in payload ? payload.error : undefined;
    throw new ApiError(
      error?.message || (payload && "message" in payload ? payload.message : undefined) || "The request could not be completed.",
      response.status,
      error?.code,
      error?.requestId,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}