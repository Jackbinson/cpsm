import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // 📝 THÔNG TIN CƠ BẢN
  action: { 
    type: String, 
    required: true,
    enum: ['RÀ QUÉT TOÀN DIỆN', 'TỰ ĐỘNG VÁ LỖI (AUTO-FIX)', 'KHÁC']
  },
  actor: { 
    type: String, 
    required: true,
    enum: ['Hệ thống Backend', 'Discord Bot', 'Hệ thống Cron', 'Quản trị viên', 'Người dùng']
  },
  
  // 🎯 THÔNG TIN TÀI NGUYÊN
  targetResource: { 
    type: String, 
    default: 'Toàn hệ thống'
  },
  resourceType: {
    type: String,
    enum: ['S3', 'EC2', 'IAM', 'VPC', 'RDS', 'Lambda', 'Khác'],
    default: 'Khác'
  },
  
  // ✅ KẾT QUẢ THỰC HIỆN
  status: { 
    type: String, 
    required: true,
    enum: ['Thành công', 'Thất bại', 'Đang chạy', 'Cảnh báo']
  },
  
  // 📋 CHI TIẾT BỔ SUNG
  details: { type: String },
  errorMessage: { type: String },
  
  // 📊 THỐNG KÊ VÀ METADATA
  itemsProcessed: { type: Number, default: 0 },
  itemsViolated: { type: Number, default: 0 },
  itemsFixed: { type: Number, default: 0 },
  executionTime: { type: Number }, // ms
  
  // ⏰ THỜI GIAN
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  indexes: [
    { createdAt: -1 },
    { action: 1, createdAt: -1 },
    { actor: 1, createdAt: -1 }
  ]
});

export default mongoose.model('AuditLog', auditLogSchema);