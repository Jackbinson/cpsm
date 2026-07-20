import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axiosClient from '../api/axiosClient';

const Center = () => {
  const [scanData, setScanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');

  // Gọi API lấy dữ liệu từ scanController.js
  useEffect(() => {
    const fetchScanData = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/scans/scans');
        const data = response.data;
        
        // Cập nhật dữ liệu từ backend (danh sách gồm S3, EC2, IAM)
        setScanData(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu quét:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScanData();
  }, []);

  // Logic lọc dữ liệu theo Tab
  const filteredData = scanData.filter(item => 
    activeTab === 'ALL' ? true : item.resourceType?.includes(activeTab)
  );

  // Tính toán thống kê cho Pie Chart
  const safeCount = filteredData.filter(item => !item.isViolating).length;
  const vulnerableCount = filteredData.length - safeCount;
  
  const chartData = [
    { name: 'An toàn', value: safeCount },
    { name: 'Cảnh báo/Lỗi', value: vulnerableCount }
  ];
  const COLORS = ['#10B981', '#EF4444']; // Xanh lá (Safe) và Đỏ (Vulnerable)

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">CSPM Command Center</h1>
      
      {/* Phần Biểu đồ và Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Biểu đồ Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Tỉ lệ bảo mật ({activeTab})</h2>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bảng số liệu thống kê */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center gap-6">
          <div className="flex justify-between items-center border-b pb-4">
            <p className="text-gray-500 font-medium">Tổng tài nguyên</p>
            <p className="text-3xl font-bold text-gray-800">{filteredData.length}</p>
          </div>
          <div className="flex justify-between items-center border-b pb-4">
            <p className="text-gray-500 font-medium">An toàn & Tuân thủ</p>
            <p className="text-3xl font-bold text-emerald-500">{safeCount}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-500 font-medium">Phát hiện rủi ro</p>
            <p className="text-3xl font-bold text-red-500">{vulnerableCount}</p>
          </div>
        </div>
      </div>

      {/* Hệ thống Tab lọc */}
      <div className="flex space-x-3 mb-6">
        {['ALL', 'S3', 'EC2', 'IAM'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab === 'ALL' ? 'Tất cả dịch vụ' : tab}
          </button>
        ))}
      </div>

      {/* Bảng dữ liệu quét */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tài nguyên</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vấn đề / Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy dữ liệu cấu hình
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.resourceType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.resourceName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        !item.isViolating 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {item.status || 'Không có ghi chú'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Center;