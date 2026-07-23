import AuditLog from "../models/AuditLog.js";
import ScanResult from "../models/ScanResult.js";
import ScanRun from "../models/ScanRun.js";
import * as awsService from "../services/awsService.js";
import {
  IdempotencyConflictError,
  QueueUnavailableError,
  enqueueScan,
  requestScanCancellation,
} from "../services/scanJobService.js";

const scanRunResponse = (scanRun) => ({
  scanId: scanRun.scanId,
  status: scanRun.status,
  attempt: scanRun.attempt,
  maxAttempts: scanRun.maxAttempts,
  progress: scanRun.progress,
  summary: scanRun.summary,
  nextRetryAt: scanRun.nextRetryAt,
  error: scanRun.error?.message
    ? { code: scanRun.error.code, message: scanRun.error.message }
    : null,
  cancelRequestedAt: scanRun.cancelRequestedAt,
  createdAt: scanRun.createdAt,
  startedAt: scanRun.startedAt,
  finishedAt: scanRun.finishedAt,
  updatedAt: scanRun.updatedAt,
});

const emitAuditLog = (req, auditLog) => {
  const io = req.app?.get("io");
  if (io) io.to("audit_logs_room").emit("new_audit_log", auditLog);
};

export const createScan = async (req, res) => {
  const idempotencyKey = req.get("Idempotency-Key");
  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "Idempotency-Key header is required.",
    });
  }

  try {
    const createdBy = req.user?._id || null;
    const idempotencyScope = createdBy ? `user:${createdBy}` : "anonymous";
    const { scanRun, created } = await enqueueScan({
      idempotencyKey,
      idempotencyScope,
      createdBy,
      requestPayload: req.body || {},
    });

    return res
      .status(202)
      .location(`/api/v1/scans/runs/${scanRun.scanId}`)
      .json({
        success: true,
        message: created ? "Cloud scan queued." : "Existing cloud scan returned.",
        data: scanRunResponse(scanRun),
      });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error instanceof QueueUnavailableError) {
      return res.status(503).json({ success: false, message: error.message });
    }

    console.error("[Scan API] Failed to create scan:", error);
    return res.status(500).json({ success: false, message: "Could not queue cloud scan." });
  }
};

export const listScanRuns = async (req, res) => {
  try {
    const requestedStatuses = String(req.query.status || "")
      .split(",")
      .map((status) => status.trim())
      .filter(Boolean);
    const validStatuses = new Set(["queued", "running", "cancelling", "cancelled", "completed", "failed"]);
    const statuses = requestedStatuses.filter((status) => validStatuses.has(status));
    const query = statuses.length ? { status: { $in: statuses } } : {};

    const scanRuns = await ScanRun.find(query).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      data: scanRuns.map(scanRunResponse),
    });
  } catch (error) {
    console.error("[Scan API] Failed to list scan runs:", error);
    return res.status(500).json({ success: false, message: "Could not load scan runs." });
  }
};

export const getScanRun = async (req, res) => {
  try {
    const scanRun = await ScanRun.findOne({ scanId: req.params.scanId });
    if (!scanRun) {
      return res.status(404).json({ success: false, message: "Scan run not found." });
    }
    return res.status(200).json({ success: true, data: scanRunResponse(scanRun) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load scan run." });
  }
};

export const cancelScan = async (req, res) => {
  try {
    const scanRun = await ScanRun.findOne({ scanId: req.params.scanId });
    if (!scanRun) {
      return res.status(404).json({ success: false, message: "Scan run not found." });
    }

    const result = await requestScanCancellation(scanRun);
    if (result.alreadyTerminal) {
      return res.status(409).json({
        success: false,
        message: `Scan is already ${result.scanRun.status}.`,
        data: scanRunResponse(result.scanRun),
      });
    }

    return res.status(result.cancellationPending ? 202 : 200).json({
      success: true,
      message: result.cancellationPending ? "Cancellation requested." : "Scan cancelled.",
      data: scanRunResponse(result.scanRun),
    });
  } catch (error) {
    console.error("[Scan API] Failed to cancel scan:", error);
    return res.status(500).json({ success: false, message: "Could not cancel scan." });
  }
};

export const getScan = async (req, res) => {
  try {
    const query = req.query.scanId ? { scanId: req.query.scanId } : {};
    const scans = await ScanResult.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: scans });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load scan results." });
  }
};

export const getAuditLogs = async (_req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not load audit logs." });
  }
};

export const fixCloudResource = async (req, res) => {
  try {
    const scan = await ScanResult.findById(req.params.id);
    if (!scan) return res.status(404).json({ success: false, message: "Resource not found." });
    if (!scan.isViolating) return res.status(400).json({ success: false, message: "Resource is already safe." });

    if (!["S3", "AWS S3"].includes(scan.resourceType)) {
      return res.status(400).json({ success: false, message: "Auto-fix is only available for S3." });
    }

    const startedAt = Date.now();
    await awsService.applyPublicAccessBlock(scan.resourceName);
    scan.isViolating = false;
    scan.status = "An toan";
    scan.reason = "Block Public Access enabled.";
    await scan.save();

    const auditLog = await AuditLog.create({
      action: "TỰ ĐỘNG VÁ LỖI (AUTO-FIX)",
      actor: "Hệ thống Backend",
      resourceType: "S3",
      targetResource: `S3: ${scan.resourceName}`,
      status: "Thành công",
      details: "Enabled S3 Block Public Access.",
      itemsFixed: 1,
      executionTime: Date.now() - startedAt,
    });
    emitAuditLog(req, auditLog);

    return res.status(200).json({
      success: true,
      message: "S3 public access block enabled.",
      data: scan,
      auditLog,
    });
  } catch (error) {
    console.error("[Scan API] Auto-fix failed:", error);
    return res.status(500).json({ success: false, message: "Could not auto-fix resource." });
  }
};
