import { useState, useEffect } from 'react';
import DashboardHeader from "../../components/DashboardHeader";
import AuditLogs from "../../components/AuditLog";
import axiosClient, { API_BASE_URL } from "../../api/axiosClient";
import { io } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  CheckCircle2, 
  Radar, 
  Loader2, 
  X, 
  Terminal, 
  ShieldAlert, 
  Zap,
  Check,
  FileText,
  Shield
} from 'lucide-react';

const Dashboard = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [scanRuns, setScanRuns] = useState([]);
  const [activeTab, setActiveTab] = useState('scans'); // 'scans' hoặc 'audit-logs'

  // --- PHẦN THÊM MỚI 1: State để quản lý lúc đang vá lỗi ---
  const [isFixing, setIsFixing] = useState(false);

  const fetchScans = async () => {
    try {
      const response = await axiosClient.get('/scans/scans');
      setScans(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu rà quét:", error);
      setScans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchScanRuns = async () => {
    try {
      const response = await axiosClient.get('/scans/runs');
      setScanRuns(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error('Could not load scan runs:', error);
      setScanRuns([]);
    }
  };

  useEffect(() => {
    fetchScans();
    fetchScanRuns();

    const socketBaseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const socket = io(socketBaseUrl, { reconnection: true });
    socket.on('connect', () => socket.emit('subscribe_scan_runs'));
    socket.on('scan.status.changed', (scanRun) => {
      setScanRuns((current) => {
        const index = current.findIndex((item) => item.scanId === scanRun.scanId);
        if (index === -1) return [scanRun, ...current];
        return current.map((item) => (item.scanId === scanRun.scanId ? { ...item, ...scanRun } : item));
      });
    });

    return () => {
      socket.emit('unsubscribe_scan_runs');
      socket.disconnect();
    };
  }, []);

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const idempotencyKey = "scan-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      const response = await axiosClient.post(
        '/scans/scan',
        {},
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      const scanRun = response?.data?.data;
      if (scanRun) {
        setScanRuns((current) => [scanRun, ...current.filter((item) => item.scanId !== scanRun.scanId)]);
      }
      alert("Cloud scan " + (scanRun ? scanRun.scanId : "") + " has been queued.");
    } catch (error) {
      console.error('Could not queue cloud scan:', error);
      alert(error.response?.data?.message || 'Could not queue cloud scan.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCancelScan = async (scanId) => {
    try {
      const response = await axiosClient.post(`/scans/runs/${scanId}/cancel`);
      const scanRun = response?.data?.data;
      if (scanRun) {
        setScanRuns((current) => current.map((item) => (item.scanId === scanId ? scanRun : item)));
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Could not cancel scan.');
    }
  };
  // --- PHẦN THÊM MỚI 2: Hàm xử lý vá lỗi khi bấm nút ---
  const handleAutoFix = async () => {
    if (!selectedScan) return;
    
    setIsFixing(true);
    try {
      const response = await axiosClient.post(`/scans/fix/${selectedScan._id}`);
      
      if (response.data.success) {
        // Sau khi vá thành công:
        await fetchScans(); // 1. Cập nhật lại danh sách bảng
        setSelectedScan(null); // 2. Đóng bảng chi tiết
        alert("Đã vá lỗ hổng thành công trên AWS!");
      }
    } catch (error) {
      console.error("Lỗi Auto-fix:", error);
      alert("Lỗi: " + (error.response?.data?.message || "Không thể thực hiện vá lỗi."));
    } finally {
      setIsFixing(false);
    }
  };

  const statusLabel = (status) => ({
    queued: 'Queued',
    running: 'Running',
    cancelling: 'Cancelling',
    cancelled: 'Cancelled',
    completed: 'Completed',
    failed: 'Failed',
  }[status] || status);

  const statusClass = (status) => ({
    queued: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
    running: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    cancelling: 'bg-orange-900/50 text-orange-300 border-orange-700/50',
    cancelled: 'bg-slate-800 text-slate-300 border-slate-600',
    completed: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    failed: 'bg-red-900/50 text-red-300 border-red-700/50',
  }[status] || 'bg-slate-800 text-slate-300 border-slate-600');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden">
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Tổng quan hệ thống</h1>
          <p className="text-slate-400 mt-2 text-sm">Giám sát và phát hiện lỗ hổng bảo mật trên tài nguyên Cloud theo thời gian thực.</p>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('scans')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'scans'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Shield size={18} /> Kết quả rà quét
          </button>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'audit-logs'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <FileText size={18} /> Nhật ký hệ thống
          </button>
        </div>

        {/* SCANS TAB CONTENT */}
                {activeTab === 'scans' && (
          <div className="space-y-6">
            <Card className="border border-slate-700 bg-slate-900 text-slate-300 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-700 bg-slate-800/80 px-6 py-5">
                <CardTitle className="text-lg font-semibold text-white">Async scan status</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-3">Scan ID</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Attempt</th>
                        <th className="px-6 py-3">Progress</th>
                        <th className="px-6 py-3">Error</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scanRuns.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-6 text-slate-500">No asynchronous scans yet.</td></tr>
                      ) : scanRuns.map((scanRun) => (
                        <tr key={scanRun.scanId} className="hover:bg-slate-800/60">
                          <td className="px-6 py-4 font-mono text-xs text-slate-300">{scanRun.scanId}</td>
                          <td className="px-6 py-4"><span className={`border px-2 py-1 rounded text-xs font-semibold ${statusClass(scanRun.status)}`}>{statusLabel(scanRun.status)}</span></td>
                          <td className="px-6 py-4 text-slate-400">{scanRun.attempt}/{scanRun.maxAttempts}</td>
                          <td className="px-6 py-4 text-slate-400">{scanRun.progress?.stage || 'queued'} ({scanRun.progress?.processed || 0}/{scanRun.progress?.total || 0})</td>
                          <td className="px-6 py-4 text-red-300 max-w-xs truncate">{scanRun.error?.message || scanRun.errorMessage || '-'}</td>
                          <td className="px-6 py-4 text-right">
                            {['queued', 'running', 'cancelling'].includes(scanRun.status) && (
                              <button onClick={() => handleCancelScan(scanRun.scanId)} className="text-xs px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200">Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
        <Card className="border border-slate-700 bg-slate-900 text-slate-300 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-white/5">
          <CardHeader className="border-b border-slate-700 bg-slate-800/80 px-6 py-5 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold text-white">Lịch sử rà quét gần đây</CardTitle>
            <button 
              onClick={handleRunScan}
              disabled={isScanning || loading}
              className={`text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 ${isScanning ? 'bg-slate-700 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {isScanning ? (
                <><Loader2 size={18} className="animate-spin text-blue-400" /> Đang phân tích AWS...</>
              ) : (
                <><Radar size={18} className="animate-pulse" /> Rà quét ngay</>
              )}
            </button>
          </CardHeader>

          <CardContent className="p-0 bg-slate-900">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Radar size={32} className="text-blue-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Đang đồng bộ dữ liệu từ máy chủ...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 font-semibold tracking-wider">Tên tài nguyên</th>
                      <th className="px-6 py-4 font-semibold tracking-wider">Loại dịch vụ</th>
                      <th className="px-6 py-4 font-semibold tracking-wider">Trạng thái bảo mật</th>
                      <th className="px-6 py-4 font-semibold tracking-wider">Thời gian quét</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {scans.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-12 text-slate-500">Chưa có lịch sử rà quét nào.</td></tr>
                    ) : (
                      scans.map((scan) => (
                        <tr 
                          key={scan._id} 
                          onClick={() => setSelectedScan(scan)}
                          className="bg-slate-900 hover:bg-slate-800 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4 font-medium text-white">{scan.resourceName}</td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-900/40 text-blue-400 border border-blue-700/50 text-xs font-semibold px-3 py-1.5 rounded-md">
                              {scan.resourceType}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {scan.isViolating ? (
                              <span className="flex items-center text-red-400 font-medium bg-red-900/30 w-fit px-3 py-1.5 rounded-md border border-red-800/50">
                                <AlertCircle size={16} className="mr-1.5" /> Có lỗ hổng
                              </span>
                            ) : (
                              <span className="flex items-center text-emerald-400 font-medium bg-emerald-900/30 w-fit px-3 py-1.5 rounded-md border border-emerald-800/50">
                                <CheckCircle2 size={16} className="mr-1.5" /> An toàn
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-400">{new Date(scan.createdAt).toLocaleString('vi-VN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        )}

        {/* AUDIT LOGS TAB CONTENT */}
        {activeTab === 'audit-logs' && (
          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 ring-1 ring-white/5">
            <AuditLogs />
          </div>
        )}
      </main>

      {selectedScan && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedScan(null)}></div>
          
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transform transition-transform duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-blue-500" size={20} />
                Chi tiết tài nguyên
              </h2>
              <button onClick={() => setSelectedScan(null)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1.5 rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6">
                <p className="text-sm text-slate-400 mb-1">Tên tài nguyên</p>
                <p className="text-xl font-semibold text-white">{selectedScan.resourceName}</p>
              </div>

              {selectedScan.isViolating ? (
                <div className="space-y-6">
                  <div className="bg-red-950/50 border border-red-900/50 p-4 rounded-xl">
                    <h3 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                      <AlertCircle size={18} /> Cảnh báo: Rò rỉ dữ liệu (Public Access)
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      S3 Bucket này đang tắt tính năng <strong>Block Public Access</strong>. Hacker hoặc người dùng ẩn danh có thể liệt kê (List) và tải xuống (Read) toàn bộ dữ liệu nhạy cảm bên trong.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-slate-200 font-semibold flex items-center gap-2 mb-3">
                      <Terminal size={18} className="text-slate-400" /> Mã lệnh khắc phục thủ công (AWS CLI)
                    </h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto shadow-inner">
                      aws s3api put-public-access-block \<br/>
                      &nbsp;&nbsp;--bucket {selectedScan.resourceName} \<br/>
                      &nbsp;&nbsp;--public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-900/50 p-4 rounded-xl text-center py-10">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-emerald-400 font-bold text-lg mb-2">Cấu hình an toàn</h3>
                  <p className="text-slate-400 text-sm">Tài nguyên này đã được bảo vệ chặt chẽ và tuân thủ các tiêu chuẩn bảo mật của hệ thống.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950">
              {selectedScan.isViolating ? (
                <button 
                  onClick={handleAutoFix}
                  disabled={isFixing}
                  className={`w-full text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] 
                    ${isFixing ? 'bg-red-900 cursor-not-allowed opacity-70' : 'bg-red-600 hover:bg-red-500'}`}
                >
                  {isFixing ? (
                    <><Loader2 size={20} className="animate-spin" /> Đang vá lỗi...</>
                  ) : (
                    <><Zap size={20} className="fill-current" /> Tự động vá lỗi (Auto-Fix)</>
                  )}
                </button>
              ) : (
                <button className="w-full bg-slate-800 text-slate-500 font-bold py-3 px-4 rounded-lg cursor-not-allowed">
                  Không phát hiện lỗ hổng
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;