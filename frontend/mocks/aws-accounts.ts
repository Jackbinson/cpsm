import type { AwsAccount } from "@/types/cspm";

export const mockAwsAccounts: AwsAccount[] = [
  {
    id: "acct-production",
    name: "Production Platform",
    accountId: "123456789012",
    roleArn: "arn:aws:iam::123456789012:role/CPSMReadOnlyRole",
    environment: "production",
    regions: ["ap-southeast-1", "us-east-1"],
    connectionStatus: "connected",
    scanSchedule: "Every day at 02:00",
    lastScanAt: "2026-07-23T02:00:00.000Z",
    riskScore: 72,
    openFindings: 17,
  },
  {
    id: "acct-staging",
    name: "Staging Services",
    accountId: "210987654321",
    roleArn: "arn:aws:iam::210987654321:role/CPSMReadOnlyRole",
    environment: "staging",
    regions: ["ap-southeast-1"],
    connectionStatus: "connected",
    scanSchedule: "Every Monday at 03:00",
    lastScanAt: "2026-07-22T03:00:00.000Z",
    riskScore: 34,
    openFindings: 4,
  },
];