import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Kiểm tra xem Request có mang theo vé (Header Authorization) không
  // Chuẩn của vé luôn bắt đầu bằng chữ "Bearer "
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 2. Cắt lấy cái mã token (bỏ chữ Bearer đi)
      token = req.headers.authorization.split(' ')[1];

      // 3. Đưa cho máy soi (JWT) kiểm tra xem token có phải do chính Server mình cấp không
      // Nó sẽ dùng JWT_SECRET trong file .env để giải mã
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 4. Nếu vé xịn, tìm xem thông tin User cầm vé này là ai. 
      // Gán thông tin user đó vào biến req.user (nhớ trừ mật khẩu ra)
      req.user = await User.findById(decoded.id).select('-password');

      // 5. Cho phép đi tiếp vào Controller
      next();
    } catch (error) {
      console.error('Lỗi giải mã Token:', error.message);
      res.status(401).json({ 
        success: false, 
        message: 'Vé không hợp lệ hoặc đã hết hạn. Kẻ gian xin mời ra ngoài!' 
      });
    }
  }

  // 6. Nếu tìm mỏi mắt mà không thấy chữ Bearer token nào
  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Dừng bước! Bạn chưa đăng nhập và không có Token.' 
    });
  }
};