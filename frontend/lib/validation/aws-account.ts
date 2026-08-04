import { z } from "zod";

export const awsAccountSchema = z.object({
  name: z.string().min(2, "Enter an account name."),
  accountId: z.string().regex(/^\d{12}$/, "AWS Account ID must contain exactly 12 digits."),
  roleArn: z.string().regex(/^arn:aws:iam::\d{12}:role\/.+$/, "Enter a valid IAM Role ARN."),
  externalId: z.string().min(8, "External ID must contain at least 8 characters."),
  environment: z.enum(["development", "staging", "production"]),
  regions: z.array(z.string()).min(1, "Select at least one AWS Region."),
  scanSchedule: z.string().min(1, "Select a scan schedule."),
});

export type AwsAccountFormValues = z.infer<typeof awsAccountSchema>;