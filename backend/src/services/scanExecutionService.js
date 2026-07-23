import * as awsService from "./awsService.js";
import * as rulesService from "./ruleEngine.js";
import ScanResult from "../models/ScanResult.js";
import { publishRealtimeEvent } from "./realtimeEvents.js";

const ensureNotAborted = (signal) => {
  if (!signal?.aborted) return;

  const error = signal.reason instanceof Error ? signal.reason : new Error("Scan cancelled");
  if (error.name === "Error") error.name = "AbortError";
  throw error;
};

const saveResult = async ({ scanId, scannedBy, result, rawCloudConfig = {} }) => {
  const query = { scanId, resourceId: result.resourceId };
  const existing = await ScanResult.findOne(query).lean();
  const scanResult = await ScanResult.findOneAndUpdate(
    query,
    {
      $set: {
        resourceName: result.resourceName,
        resourceType: result.resourceType,
        isViolating: result.isViolating,
        status: result.status,
        reason: result.reason,
        rawCloudConfig,
        scannedBy,
      },
      $setOnInsert: { scanId, resourceId: result.resourceId },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!existing && scanResult.isViolating) {
    await publishRealtimeEvent("discord.alert.request", {
      resourceName: scanResult.resourceName,
      status: scanResult.status,
      reason: scanResult.reason,
    });
  }

  return scanResult;
};

export const executeCloudScan = async ({ scanRun, signal, onProgress }) => {
  const summary = { processed: 0, violated: 0, fixed: 0 };
  const reportProgress = async (stage, total) => {
    await onProgress({ stage, processed: summary.processed, total });
  };

  ensureNotAborted(signal);
  await reportProgress("s3", 0);
  const bucketData = await awsService.getAllBuckets({ signal });
  const buckets = bucketData.Buckets || [];
  const bucketTotal = buckets.length;

  for (const bucket of buckets) {
    ensureNotAborted(signal);
    const compliance = rulesService.checkS3Compliance(bucket);
    const result = await saveResult({
      scanId: scanRun.scanId,
      scannedBy: scanRun.createdBy,
      result: {
        resourceId: `s3:${bucket.Name}`,
        resourceName: bucket.Name,
        resourceType: "S3",
        ...compliance,
      },
      rawCloudConfig: bucket,
    });
    summary.processed += 1;
    summary.violated += Number(result.isViolating);
    await reportProgress("s3", bucketTotal);
  }

  ensureNotAborted(signal);
  await reportProgress("ec2", summary.processed);
  const ec2Results = await awsService.scanEC2SecurityGroups({ signal });
  const ec2Total = summary.processed + ec2Results.length;
  for (const result of ec2Results) {
    ensureNotAborted(signal);
    const { rawCloudConfig, ...finding } = result;
    const scanResult = await saveResult({
      scanId: scanRun.scanId,
      scannedBy: scanRun.createdBy,
      result: { ...finding, resourceType: "EC2" },
      rawCloudConfig,
    });
    summary.processed += 1;
    summary.violated += Number(scanResult.isViolating);
    await reportProgress("ec2", ec2Total);
  }

  ensureNotAborted(signal);
  await reportProgress("iam", summary.processed);
  const iamResults = await awsService.scanIAMUsers({ signal });
  const iamTotal = summary.processed + iamResults.length;
  for (const result of iamResults) {
    ensureNotAborted(signal);
    const { rawCloudConfig, ...finding } = result;
    const scanResult = await saveResult({
      scanId: scanRun.scanId,
      scannedBy: scanRun.createdBy,
      result: { ...finding, resourceType: "IAM" },
      rawCloudConfig,
    });
    summary.processed += 1;
    summary.violated += Number(scanResult.isViolating);
    await reportProgress("iam", iamTotal);
  }

  await reportProgress("finalizing", summary.processed);
  return summary;
};
