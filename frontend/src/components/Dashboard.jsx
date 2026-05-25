import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [scans, setScans] = useState([]);
  const [filter, setFilter] = useState('All'); // Trạng thái của bộ lọc

  // 1. GỌI API LẤY DỮ LIỆU TỪ BACKEND
  useEffect(() => {
    // Thay đổi URL này nếu Backend của em chạy ở cổng khác
    fetch('http://localhost:5000/api/scans') 
      .then(res => res.json())
      .then(data => {
        if (data.success) setScans(data.data);
      })
      .catch(err => console.error("Lỗi tải dữ liệu:", err));
  }, []);

  // 2. XỬ LÝ DỮ LIỆU CHO BỘ LỌC (TABS)
  const filteredScans = scans.filter(scan => {
    if (filter === 'All') return true;
    if (filter === 'S3') return scan.resourceType.includes('S3');
    if (filter === 'EC2') return scan.resourceType.includes('EC2');
    if (filter === 'IAM') return scan.resourceType.includes('IAM');
    return true;
  });

  // 3. XỬ LÝ DỮ LIỆU CHO BIỂU ĐỒ (PIE CHART)
  const safeCount = scans.filter(s => !s.isViolating).length;
  const dangerCount = scans.filter(s => s.isViolating).length;
  
  const chartData = [
    { name: 'An toàn', value: safeCount, color: '#10B981' },   // Màu xanh lá (Emerald)
    { name: 'Nguy hiểm', value: dangerCount, color: '#EF4444' } // Màu đỏ (Red)
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">🛡️ Tổng quan Bảo mật Cloud (CSPM)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* KHỐI 1: BIỂU ĐỒ THỐNG KÊ (Tính năng 2) */}
        <div className="bg-white p-6 rounded-xl shadow-md col-span-1 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Tỷ lệ An toàn hệ thống</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KHỐI 2: DANH SÁCH TÀI NGUYÊN (Tính năng 1 & 3) */}
        <div className="bg-white p-6 rounded-xl shadow-md col-span-2 border border-gray-100">
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Chi tiết Tài nguyên</h2>
            
            {/* CÁC NÚT BỘ LỌC (TABS) */}
            <div className="flex space-x-2">
              {['All', 'S3', 'EC2', 'IAM'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === tab 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'All' ? 'Tất cả' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* BẢNG DỮ LIỆU NÂNG CẤP */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="p-4 font-medium">Tên tài nguyên</th>
                  <th className="p-4 font-medium">Loại</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium">Chi tiết lỗi</th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.length > 0 ? (
                  filteredScans.map((scan) => (
                    <tr key={scan._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-semibold text-gray-800">{scan.resourceName}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-bold">
                          {scan.resourceType}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          scan.isViolating ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {scan.status}
                        </span>
                      </td>
                      <td className={`p-4 text-sm ${scan.isViolating ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {scan.reason || (scan.isViolating ? 'Phát hiện lỗ hổng' : 'An toàn')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">
                      Không tìm thấy dữ liệu phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Dashboard;