export type ScanStatus = "queued" | "running" | "cancelling" | "cancelled" | "completed" | "failed";
export type Severity = "critical" | "high" | "medium" | "low" | "informational";
export type FindingStatus = "open" | "reviewing" | "in_progress" | "resolved" | "accepted_risk" | "false_positive";

export interface ScanProgress {
  stage: string;
  processed: number;
  total: number;
}

export interface ScanSummary {
  processed: number;
  violated: number;
  fixed: number;
}

export interface ScanRun {
  scanId: string;
  status: ScanStatus;
  attempt: number;
  maxAttempts: number;
  progress: ScanProgress;
  summary: ScanSummary;
  nextRetryAt: string | null;
  error: { code: string; message: string } | null;
  cancelRequestedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

export interface CreateScanInput {
  awsAccountId?: string;
  regions: string[];
  services: string[];
  scanType: "quick" | "full" | "service" | "resource";
  priority: "low" | "normal" | "high";
}

export interface Finding {
  id: string;
  scanId?: string;
  name: string;
  description: string;
  severity: Severity;
  status: FindingStatus;
  service: string;
  region: string;
  resourceArn: string;
  resourceType: string;
  awsAccountId: string;
  detectedAt: string;
  lastSeenAt: string;
  isViolating: boolean;
  rawCloudConfig: Record<string, unknown>;
}

export interface AwsAccount {
  id: string;
  name: string;
  accountId: string;
  roleArn: string;
  environment: "development" | "staging" | "production";
  regions: string[];
  connectionStatus: "connected" | "disconnected" | "permission_error" | "testing" | "expired";
  scanSchedule: string;
  lastScanAt: string | null;
  riskScore: number;
  openFindings: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}