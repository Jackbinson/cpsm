import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hàm hỗ trợ tạo Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// [POST] /api/v1/auth/register
// Chức năng: Đăng ký tài khoản mới
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Kiểm tra xem email đã tồn tại trong hệ thống chưa
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng.' });
    }

    // 2. Mã hóa mật khẩu (Hashing)
    // Tạo một 'muối' (salt) với độ khó là 10, sau đó trộn với mật khẩu người dùng
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Tạo User mới trong Database với mật khẩu đã mã hóa
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    if (user) {
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          token: generateToken(user._id), // Cấp token luôn cho khỏe, đỡ bắt user đăng nhập lại
        }
      });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/v1/auth/login
// Chức năng: Đăng nhập
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Tìm User theo email. 
    // Phải thêm .select('+password') vì trong Model mình đã cấu hình select: false
    const user = await User.findOne({ email }).select('+password');

    // 2. Nếu không có user, hoặc hàm bcrypt.compare báo mật khẩu nhập vào không khớp với mật khẩu mã hóa trong DB
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }

    // 3. Nếu đúng hết thì cấp Token
    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/v1/auth/create-admin
// Chức năng: Tạo admin account (chỉ dùng lần đầu khởi tạo)
export const createAdmin = async (req, res) => {
  try {
    // Kiểm tra xem admin đã tồn tại chưa
    const adminExists = await User.findOne({ email: 'admin@cspm.com' });
    if (adminExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin account đã tồn tại' 
      });
    }

    // Tạo mật khẩu admin mặc định
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      name: 'Admin CSPM',
      email: 'admin@cspm.com',
      password: hashedPassword,
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Admin account tạo thành công',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};