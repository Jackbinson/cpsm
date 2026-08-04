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
import { protect, requireRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.post("/scan", createScan);
router.post("/run", createScan);
router.get("/runs", listScanRuns);
router.get("/runs/:scanId", getScanRun);
router.post("/runs/:scanId/cancel", cancelScan);
router.get("/scans", getScan);
router.post("/fix/:id", requireRole("admin"), fixCloudResource);
router.get("/logs", getAuditLogs);

export default router;