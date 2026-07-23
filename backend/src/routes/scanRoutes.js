import express from "express";
import {
  cancelScan,
  createScan,
  fixCloudResource,
  getAuditLogs,
  getScan,
  getScanRun,
  listScanRuns,
} from "../controllers/scanController.js";

const router = express.Router();

router.post("/scan", createScan);
router.post("/run", createScan);
router.get("/runs", listScanRuns);
router.get("/runs/:scanId", getScanRun);
router.post("/runs/:scanId/cancel", cancelScan);
router.get("/scans", getScan);
router.post("/fix/:id", fixCloudResource);
router.get("/logs", getAuditLogs);

export default router;
