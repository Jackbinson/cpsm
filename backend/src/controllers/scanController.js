import * as awsService from '../services/awsService.js';
import * as rulesService from '../services/ruleEngine.js';
import { sendDiscordAlert } from '../services/discordService.js';
import ScanResult from '../models/ScanResult.js';
import AuditLog from '../models/AuditLog.js';

// 🔗 HÀM PHÁT SỰ KIỆN VIA SOCKET.IO
const emitAuditLog = (app, auditLog) => {
  const io = app.get('io');
  if (io) {
    io.to('audit_logs_room').emit('new_audit_log', auditLog);
    console.log(`📡 Phát sóng Audit Log: ${auditLog.action}`);
  }
};

// ==========================================
// 1. HÀM CHẠY RÀ QUÉT (runCloudScan)
// ==========================================
export const runCloudScan = async (req, res) => {
  try {
    const startTime = Date.now();
    const savedScans = [];

    // --- PHẦN 1: QUÉT S3 BUCKETS ---
    const data = await awsService.getAllBuckets();
    const buckets = data.Buckets || [];

    for (const bucket of buckets) {
      const compliance = rulesService.checkS3Compliance(bucket);
      const newScan = new ScanResult({
        resourceName: bucket.Name,
        resourceType: 'AWS S3',
        isViolating: compliance.isViolating, 
        status: compliance.status,
      });
      await newScan.save();
      savedScans.push(newScan);

      if (newScan.isViolating) {
        await sendDiscordAlert(newScan.resourceName, newScan.status, "S3 Bucket đang mở Public!", newScan._id.toString());
      }
    }

    // --- PHẦN 2: QUÉT EC2 SECURITY GROUPS ---
    const ec2Results = await awsService.scanEC2SecurityGroups();
    for (const result of ec2Results) {
      const newScan = new ScanResult(result);
      await newScan.save();
      savedScans.push(newScan);
      if (newScan.isViolating) await sendDiscordAlert(newScan.resourceName, newScan.status, result.reason, 'none');
    }

    // --- PHẦN 3: QUÉT IAM USERS ---
    const iamResults = await awsService.scanIAMUsers();
    for (const result of iamResults) {
      const newScan = new ScanResult(result);
      await newScan.save();
      savedScans.push(newScan);
      if (newScan.isViolating) await sendDiscordAlert(newScan.resourceName, newScan.status, result.reason, 'none');
    }

    // 🌟 GHI NHẬT KÝ KIỂM TOÁN: RÀ QUÉT
    const executionTime = Date.now() - startTime;
    const violationCount = savedScans.filter(s => s.isViolating).length;
    
    const auditLog = await AuditLog.create({
      action: 'RÀ QUÉT TOÀN DIỆN',
      actor: 'Hệ thống Backend',
      resourceType: 'S3',
      targetResource: 'S3, EC2, IAM',
      status: 'Thành công',
      details: `Đã quét ${buckets.length} S3, ${ec2Results.length} EC2, ${iamResults.length} IAM. Phát hiện ${violationCount} lỗi.`,
      itemsProcessed: savedScans.length,
      itemsViolated: violationCount,
      executionTime
    });

    // 📡 PHÁT SỰ KIỆN VIA SOCKET.IO
    emitAuditLog(req.app, auditLog);

    return res.status(200).json({ 
      success: true, 
      message: `Quét thành công! Tìm thấy ${violationCount} lỗi.`,
      data: savedScans,
      auditLog
    });
  } catch (error) {
    console.error("Lỗi khi chạy rà quét:", error);
    const errorLog = await AuditLog.create({ 
      action: 'RÀ QUÉT TOÀN DIỆN', 
      actor: 'Hệ thống Backend', 
      status: 'Thất bại', 
      details: error.message,
      errorMessage: error.stack
    });
    emitAuditLog(req.app, errorLog);
    return res.status(500).json({ success: false, message: "Lỗi rà quét AWS" });
  }
};

// ==========================================
// 2. HÀM TỰ ĐỘNG VÁ LỖI (fixCloudResource)
// ==========================================
export const fixCloudResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    const scan = await ScanResult.findById(resourceId);
    
    if (!scan) return res.status(404).json({ success: false, message: "Không tìm thấy." });
    if (!scan.isViolating) return res.status(400).json({ success: false, message: "Đã an toàn." });

    if (scan.resourceType === 'AWS S3' || scan.resourceType === 'S3') {
      const startTime = Date.now();
      await awsService.applyPublicAccessBlock(scan.resourceName);

      scan.isViolating = false;
      scan.status = 'An toàn';
      await scan.save();

      const auditLog = await AuditLog.create({
        action: 'TỰ ĐỘNG VÁ LỖI (AUTO-FIX)',
        actor: 'Discord Bot',
        resourceType: 'S3',
        targetResource: `S3: ${scan.resourceName}`,
        status: 'Thành công',
        details: 'Đã khóa quyền truy cập Public (Block Public Access).',
        itemsFixed: 1,
        executionTime: Date.now() - startTime
      });

      // 📡 PHÁT SỰ KIỆN VIA SOCKET.IO
      emitAuditLog(req.app, auditLog);

      return res.status(200).json({ success: true, message: "Vá lỗi S3 thành công.", data: scan, auditLog });
    }
    
    return res.status(400).json({ success: false, message: "Chưa hỗ trợ vá lỗi tài nguyên này." });
  } catch (error) {
    console.error("Lỗi khi vá lỗi:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ khi vá tài nguyên." });
  }
};

// ==========================================
// 3. CÁC HÀM TRẢ DỮ LIỆU VỀ CHO FRONTEND
// ==========================================
export const getScan = async (req, res) => {
  try {
    const scans = await ScanResult.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: scans });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi dữ liệu" });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi lấy nhật ký." });
  }
};