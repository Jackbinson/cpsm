import mongoose from 'mongoose';

// Định nghĩa Lược đồ (Schema) cho dữ liệu Rà quét
const scanResultSchema = new mongoose.Schema(
  {
    // 1. Tên tài nguyên (Ví dụ: my-production-bucket)
    resourceName: {
      type: String,
      required: [true, 'Tên tài nguyên là bắt buộc'],
      trim: true,
      index: true // Đánh index để sau này tìm kiếm theo tên cho nhanh
    },

    // 2. Loại tài nguyên
    resourceType: {
      type: String,
      required: [true, 'Loại tài nguyên là bắt buộc'],
      enum: {
        values: ['S3', 'EC2', 'RDS', 'IAM', 'AWS S3'], // Chỉ cho phép nhập 5 loại này
        message: '{VALUE} không phải là loại tài nguyên được hỗ trợ'
      }
    },

    // 3. Trạng thái vi phạm (Có lỗi bảo mật hay không?)
    isViolating: {
      type: Boolean,
      required: true,
      default: false
    },

    // 4. Mức độ nghiêm trọng (Tùy chọn, sau này có thể mở rộng)
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical', 'None'],
      default: 'None'
    },

    // 5. Cột 'Phép thuật': Chứa nguyên khối JSON cấu hình lấy từ AWS về
    // Dùng Mixed type cho phép lưu cấu hình linh hoạt (vì mỗi loại tài nguyên cấu hình một kiểu)
    rawCloudConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // 6. Liên kết với User (Ai là người thực hiện đợt quét này?)
    // Tạm thời chưa bắt buộc, nhưng chuẩn bị sẵn để khi ráp Auth vào là dùng được ngay
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: false 
    }
  },
  {
    timestamps: true 
  }
);


const ScanResult = mongoose.model('ScanResult', scanResultSchema);

export default ScanResult;