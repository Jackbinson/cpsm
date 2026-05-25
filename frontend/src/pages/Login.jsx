import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { ShieldCheck, Loader2, LockKeyhole } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await axiosClient.post('/auth/login', {
        email,
        password,
      });

      const { token, name } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('userName', name);

      setMessage('Đăng nhập thành công!');
      navigate('/dashboard');

    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Lỗi kết nối đến máy chủ Cloud!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // 1. LỚP NỀN (BACKGROUND): Dùng Gradient từ Đen Slate sang Xanh Navy tối
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4">
      
      {/* 2. THẺ CARD: Nền kính mờ (backdrop-blur), viền xanh dương nhạt mờ ảo */}
      <Card className="w-full max-w-md border-blue-500/20 bg-slate-900/60 backdrop-blur-xl shadow-[0_0_40px_rgba(37,99,235,0.1)] rounded-2xl relative overflow-hidden">
        
        {/* Hiệu ứng tia sáng chiếu từ góc trên của Card */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

        <CardHeader className="space-y-1 flex flex-col items-center text-center pb-8 pt-8">
          <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(59,130,246,0.2)] border border-blue-500/20">
            <ShieldCheck size={32} />
          </div>
          {/* Màu chữ Đen đổi thành Trắng/Xám sáng */}
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Hệ thống CSPM
          </CardTitle>
          <CardDescription className="text-slate-400 font-medium mt-1">
            Kết nối bảo mật tài nguyên Cloud
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email quản trị</Label>
              {/* Ô Input: Nền tối, viền mờ, khi click vào phát sáng viền xanh */}
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@cspm.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">Mật khẩu</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11"
              />
            </div>

            {message && (
              <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${
                message.includes('thành công') 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {message.includes('thành công') ? <ShieldCheck size={16} /> : <LockKeyhole size={16} />}
                {message}
              </div>
            )}

            {/* Nút bấm: Màu xanh rực sáng (glow effect) */}
            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang thiết lập kênh bảo mật...
                </>
              ) : (
                'Xác thực Đăng nhập'
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t border-slate-800/50 pt-5 pb-6">
          <p className="text-sm text-slate-500">
            Nền tảng được bảo vệ bởi <span className="text-blue-400 font-medium">Mini Cloud Scanner</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;