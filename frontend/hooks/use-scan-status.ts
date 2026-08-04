"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { getScanRun, normalizeScanRun } from "@/services/scans.service";
import type { ScanProgress, ScanRun, ScanSummary } from "@/types/cspm";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:5001";

type ScanStatusUpdate = Pick<
  ScanRun,
  "scanId" | "status" | "attempt" | "maxAttempts" | "nextRetryAt" | "updatedAt"
> & {
  progress?: Partial<ScanProgress>;
  summary?: Partial<ScanSummary>;
  errorMessage?: string | null;
};

export function useScanStatus(scanId: string) {
  const queryClient = useQueryClient();
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const query = useQuery({ queryKey: ["scan", scanId], queryFn: () => getScanRun(scanId), refetchInterval: realtimeConnected ? false : 4000 });

  useEffect(() => {
    const socket = io(socketUrl, { reconnection: true, transports: ["websocket", "polling"], withCredentials: true });
    const update = (event: ScanStatusUpdate) => {
      if (event.scanId !== scanId) return;

      queryClient.setQueryData<ScanRun>(["scan", scanId], (current) => {
        if (!current) return current;
        const { progress, summary, errorMessage, ...fields } = event;
        return normalizeScanRun({
          ...current,
          ...fields,
          progress: { ...current.progress, ...progress },
          summary: { ...current.summary, ...summary },
          error: errorMessage === undefined
            ? current.error
            : errorMessage
              ? { code: current.error?.code || "SCAN_FAILED", message: errorMessage }
              : null,
        });
      });
    };
    socket.on("connect", () => { setRealtimeConnected(true); socket.emit("subscribe_scan_runs"); });
    socket.on("disconnect", () => setRealtimeConnected(false));
    socket.on("scan.status.changed", update);
    return () => { socket.emit("unsubscribe_scan_runs"); socket.disconnect(); };
  }, [queryClient, scanId]);

  return { ...query, realtimeConnected };
}
