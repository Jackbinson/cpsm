import express from 'express';
import { runCloudScan, getScan, fixCloudResource, getAuditLogs } from '../controllers/scanController.js'; 

const router = express.Router();

router.post('/scan', runCloudScan);
router.post('/run', runCloudScan);
router.get('/scans', getScan);
router.post('/fix/:id', fixCloudResource);
router.get('/logs', getAuditLogs); 

export default router;