import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axiosClient, { API_BASE_URL } from '../api/axiosClient';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    const socketBaseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    const socket = io(socketBaseUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setSocketConnected(true);
      socket.emit('subscribe_audit_logs');
    });

    socket.on('new_audit_log', (newLog) => {
      console.log('New audit log received:', newLog);
      setLogs(prevLogs => [newLog, ...prevLogs]);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    axiosClient.get('/scans/logs')
      .then((response) => {
        if (response?.data?.success) {
          setLogs(response.data.data || []);
        }
      })
      .catch((err) => {
        console.error("Error loading logs:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      socket.emit('unsubscribe_audit_logs');
      socket.disconnect();
    };
  }, []);

  // HÀM FORMAT THỜI GIAN THEO CHUẨN VIỆT NAM
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', { 
      hour: '2-digit', minute: '2-digit', second: '2-digit', 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen font-sans">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          📜 Nhật ký Hệ thống
          <span className={`text-sm px-3 py-1 rounded-full font-normal ${
            socketConnected 
              ? 'bg-green-900 text-green-300 border border-green-700' 
              : 'bg-red-900 text-red-300 border border-red-700'
          }`}>
            {socketConnected ? 'Live' : 'Offline'}
          </span>
        </h2>
      </div>

      <div className="bg-slate-950 rounded-xl shadow-md overflow-hidden border border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-200 border-b border-slate-700">
                <th className="p-4 font-semibold text-sm w-48">Thời gian</th>
                <th className="p-4 font-semibold text-sm">Hành động</th>
                <th className="p-4 font-semibold text-sm">Đối tượng tác động</th>
                <th className="p-4 font-semibold text-sm">Thực hiện bởi</th>
                <th className="p-4 font-semibold text-sm text-center">Kết quả</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    ⏳ Đang tải nhật ký hệ thống...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-800 hover:bg-slate-800 transition-colors">
                    {/* Cột 1: Thời gian */}
                    <td className="p-4 text-slate-400 font-medium">
                      {formatDate(log.createdAt)}
                    </td>
                    
                    {/* Cột 2: Hành động */}
                    <td className="p-4">
                      <span className={`font-bold px-3 py-1 rounded-full text-xs ${
                        log.action.includes('VÁ LỖI') 
                          ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50' 
                          : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    
                    {/* Cột 3: Đối tượng */}
                    <td className="p-4 font-semibold text-slate-200">
                      {log.targetResource}
                      {log.details && (
                        <div className="text-xs text-slate-500 mt-1 font-normal line-clamp-1">
                          ↳ {log.details}
                        </div>
                      )}
                    </td>
                    
                    {/* Cột 4: Người thực hiện */}
                    <td className="p-4">
                      <span className="flex items-center gap-2 text-slate-300 font-medium">
                        {log.actor.includes('Bot') ? '🤖' : '⚙️'} {log.actor}
                      </span>
                    </td>
                    
                    {/* Cột 5: Kết quả */}
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded text-xs font-bold ${
                        log.status === 'Thành công' 
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' 
                          : 'bg-red-900/60 text-red-300 border border-red-700/50'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500">
                    <span className="text-4xl block mb-3">📭</span>
                    Chưa có sự kiện nào được ghi nhận trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;