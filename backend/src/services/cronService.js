import cron from 'node-cron';
import { runCloudScan } from '../controllers/scanController.js';

export const startCronJobs = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ [Cron Job] Bắt đầu phiên tuần tra Cloud định kỳ...');
        try {
            const req = {};
            const res = {
                statusCode: 200,
                status: function(code) { this.statusCode = code; return this; },
                json: function(data) { this.data = data; return this; }
            };
  
            await runCloudScan(req, res);
            
            console.log(`✅ [Cron Job] Tuần tra hoàn tất: ${res.data?.message || 'Không có lỗi'}`);
        } catch (error) {
            console.error('❌ [Cron Job] Lỗi trong quá trình tuần tra:', error.message);
        }
    });

    console.log('🕒 [Cron] Hệ thống tuần tra 24/7 đã được kích hoạt!');
};