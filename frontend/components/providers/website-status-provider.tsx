"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type WebsiteStatus = "checking" | "operational" | "degraded";
const WebsiteStatusContext = createContext<WebsiteStatus>("checking");

const report = (event: "website.status_changed" | "client.runtime_error", details: Record<string, string> = {}) => {
  void fetch("/api/observability/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, ...details }),
    keepalive: true,
  }).catch(() => undefined);
};

export function WebsiteStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WebsiteStatus>("checking");
  const lastStatus = useRef<WebsiteStatus>("checking");

  const setReportedStatus = useCallback((nextStatus: WebsiteStatus) => {
    setStatus(nextStatus);
    if (nextStatus !== lastStatus.current) {
      lastStatus.current = nextStatus;
      report("website.status_changed", { status: nextStatus });
    }
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      try {
        const response = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => null) as { status?: WebsiteStatus } | null;
        if (active) setReportedStatus(response.ok && payload?.status === "operational" ? "operational" : "degraded");
      } catch {
        if (active) setReportedStatus("degraded");
      } finally {
        window.clearTimeout(timeout);
      }
    };
    const onOnline = () => { void check(); };
    const onOffline = () => { if (active) setReportedStatus("degraded"); };
    const onError = () => report("client.runtime_error", { kind: "window.error" });
    const onRejection = () => report("client.runtime_error", { kind: "unhandledrejection" });

    void check();
    const interval = window.setInterval(() => void check(), 30000);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [setReportedStatus]);

  return <WebsiteStatusContext.Provider value={status}>{children}</WebsiteStatusContext.Provider>;
}

export const useWebsiteStatus = () => useContext(WebsiteStatusContext);