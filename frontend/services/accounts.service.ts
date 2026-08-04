import { mockAwsAccounts } from "@/mocks/aws-accounts";
import type { AwsAccount } from "@/types/cspm";

export interface CreateAwsAccountInput {
  name: string;
  accountId: string;
  roleArn: string;
  externalId: string;
  environment: AwsAccount["environment"];
  regions: string[];
  scanSchedule: string;
}

// Backend AWS Accounts endpoints are not implemented yet. Keep the contract isolated here.
export async function listAwsAccounts(): Promise<AwsAccount[]> { return [...mockAwsAccounts]; }
export async function getAwsAccount(accountId: string): Promise<AwsAccount | undefined> { return mockAwsAccounts.find((account) => account.id === accountId); }
export async function createAwsAccount(input: CreateAwsAccountInput): Promise<AwsAccount> {
  const account: AwsAccount = { id: `mock-${crypto.randomUUID()}`, name: input.name, accountId: input.accountId, roleArn: input.roleArn, environment: input.environment, regions: input.regions, connectionStatus: "testing", scanSchedule: input.scanSchedule, lastScanAt: null, riskScore: 0, openFindings: 0 };
  mockAwsAccounts.unshift(account);
  return account;
}
export async function testAwsAccountConnection(accountId: string): Promise<AwsAccount["connectionStatus"]> { return mockAwsAccounts.some((account) => account.id === accountId) ? "connected" : "disconnected"; }