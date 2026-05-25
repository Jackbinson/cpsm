import axios from 'axios';

// Khởi tạo một phiên bản Axios với các cài đặt mặc định
const axiosClient = axios.create({
  baseURL: 'http://localhost:5001/api/v1', // Trỏ thẳng vào gốc API của Backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// (Tùy chọn nâng cao) Interceptors: Tự động nhét Token vào mọi Request sau khi đăng nhập
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosClient;
