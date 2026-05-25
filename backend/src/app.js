import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import connectDB from './config/db.js';
import scanRoutes from './routes/scanRoutes.js';
import authRoutes from './routes/authRoutes.js';
import './services/discordService.js';

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ⚡ KHỞI TẠO SOCKET.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 🔗 LƯU IO INSTANCE TRONG APP CONTEXT
app.set('io', io);

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use('/api/v1/scans', scanRoutes);
app.use('/api/v1/auth', authRoutes);

app.get('/api/v1/status', (req, res) => {
  res.json({ message: 'CSPM Backend đang chạy!', socketIO: 'Bật' });
});

// 📊 SOCKET.IO EVENT HANDLERS
io.on('connection', (socket) => {
  console.log(`🔗 Client kết nối: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client ngắt kết nối: ${socket.id}`);
  });

  socket.on('subscribe_audit_logs', () => {
    console.log(`📜 Client ${socket.id} theo dõi Audit Logs`);
    socket.join('audit_logs_room');
  });

  socket.on('unsubscribe_audit_logs', () => {
    socket.leave('audit_logs_room');
    console.log(`📭 Client ${socket.id} ngừng theo dõi Audit Logs`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
  console.log(`⚡ Socket.io đang lắng nghe tại ws://localhost:${PORT}`);
});

export default io;