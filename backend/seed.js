import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Kết nối MongoDB thành công');

    // Xóa admin cũ nếu tồn tại
    await User.deleteOne({ email: 'admin@cspm.com' });

    // Tạo admin mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      name: 'Admin CSPM',
      email: 'admin@cspm.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Admin account tạo thành công!');
    console.log('📧 Email: admin@cspm.com');
    console.log('🔐 Mật khẩu: admin123');

    await mongoose.disconnect();
    console.log('✅ Đóng kết nối MongoDB');
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
};

seedDatabase();
