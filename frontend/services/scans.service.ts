import { apiRequest } from "@/lib/api/client";
import type { CreateScanInput, ScanRun } from "@/types/cspm";

const defaultProgress = { stage: "queued", processed: 0, total: 0 };
const defaultSummary = { processed: 0, violated: 0, fixed: 0 };

// Older scan documents and realtime events may not include every nested field.
// Normalize at the API boundary so view components always receive a complete model.
export const normalizeScanRun = (scan: ScanRun): ScanRun => ({
  ...scan,
  progress: { ...defaultProgress, ...scan.progress },
  summary: { ...defaultSummary, ...scan.summary },
});

export const listScanRuns = async () =>
  (await apiRequest<ScanRun[]>("/scans/runs")).map(normalizeScanRun);
export const getScanRun = async (scanId: string) =>
  normalizeScanRun(await apiRequest<ScanRun>(`/scans/runs/${scanId}`));

export async function createScan(input: CreateScanInput): Promise<ScanRun> {
  const idempotencyKey = `scan-${crypto.randomUUID()}`;
  return normalizeScanRun(await apiRequest<ScanRun>("/scans/scan", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  }));
}

export const cancelScan = async (scanId: string) =>
  normalizeScanRun(await apiRequest<ScanRun>(`/scans/runs/${scanId}/cancel`, { method: "POST" }));
