# 🚀 Socket.io Real-Time Audit Logging - Quick Start Guide

## ⚡ 5-Minute Setup

### **Step 1: Install Dependencies**

**Backend:**
```bash
cd backend
npm install socket.io@^4.8.3
```

**Frontend:**
```bash
cd frontend
npm install socket.io-client@^4.8.3
```

### **Step 2: Start the Application**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
✅ Server đang chạy tại http://localhost:5000
⚡ Socket.io đang lắng nghe tại ws://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v8.0.10  ready in 234 ms

➜  Local:   http://localhost:5173/
```

---

## ✅ Verification Checklist

### **1. Check Backend Socket.io Server**

Open browser DevTools → Network → WS (WebSocket tab)

Look for connection to `ws://localhost:5000/socket.io/`

**Expected status**: `101 Web Socket Protocol Handshake`

### **2. Check Console Logs**

**Backend console:**
```
🔗 Client kết nối: socket-id-abc123
📄 Client socket-id-abc123 theo dõi Audit Logs
```

**Frontend console:**
```
Socket.io ket noi thanh cong: socket-id-abc123
```

### **3. Verify Connection Indicator**

In the **Audit Logs** page (📜 Nhật ký Hệ thống):
- Should display **🟢 Live** (green indicator) if connected
- Should display **🔴 Offline** (red indicator) if disconnected

---

## 🧪 Testing Real-Time Updates

### **Option 1: Use the Scan API**

```bash
curl -X POST http://localhost:5000/api/v1/scans/scan
```

**Expected result:**
- Backend creates AuditLog in MongoDB
- Socket.io broadcasts event to all connected clients
- Frontend receives new_audit_log event
- New log appears at top of table in real-time

### **Option 2: Manual Database Insert**

```bash
# Terminal 3 - MongoDB shell
mongosh

# In mongosh:
use CPSM_DB
db.auditlogs.insertOne({
  action: "RÀ QUÉT TOÀN DIỆN",
  actor: "Hệ thống Backend",
  targetResource: "S3, EC2, IAM",
  resourceType: "S3",
  status: "Thành công",
  details: "Test entry - should appear in real-time",
  itemsProcessed: 100,
  itemsViolated: 5,
  itemsFixed: 0,
  executionTime: 1234,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Expected result:** New log appears in UI immediately

---

## 📋 Project Structure

```
CPSM/
├── backend/
│   ├── src/
│   │   ├── app.js                 ⭐ Modified: Socket.io setup
│   │   ├── models/
│   │   │   └── AuditLog.js         ⭐ Modified: Enhanced schema
│   │   ├── controllers/
│   │   │   └── scanController.js   ⭐ Modified: Event broadcasting
│   │   └── routes/
│   │       └── scanRoutes.js       ✅ Route already exists
│   └── package.json               ✅ socket.io already listed
│
├── frontend/
│   ├── src/
│   │   └── components/
│   │       └── AuditLog.jsx        ⭐ Modified: Socket.io integration
│   └── package.json               ⭐ Modified: Added socket.io-client
│
└── SOCKET_IO_ARCHITECTURE.md      📚 This documentation
```

---

## 🔍 Key Files Changed

### `backend/src/app.js`

**Before:**
```javascript
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

**After:**
```javascript
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const server = http.createServer(app);
const io = new SocketIOServer(server, { /* CORS config */ });
app.set('io', io);

server.listen(PORT, () => {
  console.log(`Socket.io listening at ws://localhost:${PORT}`);
});
```

---

### `backend/src/models/AuditLog.js`

**Fields Added:**
- `resourceType`: Specific AWS resource type (S3, EC2, etc.)
- `itemsProcessed`: Total items scanned
- `itemsViolated`: Count of violations found
- `itemsFixed`: Count of items auto-remediated
- `executionTime`: Performance metric (ms)
- `errorMessage`: Detailed error info on failure

---

### `backend/src/controllers/scanController.js`

**New Helper Function:**
```javascript
const emitAuditLog = (app, auditLog) => {
  const io = app.get('io');
  if (io) {
    io.to('audit_logs_room').emit('new_audit_log', auditLog);
  }
};
```

**Updated Methods:**
- `runCloudScan()`: Now emits event after creating audit log
- `fixCloudResource()`: Now emits event after fixing resource

---

### `frontend/src/components/AuditLog.jsx`

**Changes:**
- Added Socket.io client import
- Setup connection with auto-reconnection
- Listen to `new_audit_log` events
- Prepend new logs to table
- Display connection status indicator

---

## 🎯 How It Works

### **Real-Time Flow**

```
1. User clicks "Scan" button in UI
   ↓
2. API POST /api/v1/scans/scan
   ↓
3. Backend processes scan (S3, EC2, IAM)
   ↓
4. Create AuditLog in MongoDB
   ↓
5. emitAuditLog(req.app, auditLog)
   ↓
6. io.to('audit_logs_room').emit('new_audit_log', auditLog)
   ↓
7. Frontend socket receives event
   ↓
8. setLogs([newLog, ...prevLogs])
   ↓
9. ✨ New log appears at TOP of table instantly!
```

---

## 📊 Comparison: Before vs After

### **Before (Old Method)**

```javascript
// Frontend keeps polling
setInterval(async () => {
  const response = await fetch('/api/logs');
  const data = await response.json();
  setLogs(data.data);
}, 5000);  // Every 5 seconds - inefficient!
```

**Issues:**
- ❌ Constant polling waste bandwidth
- ❌ 5-second delay before seeing updates
- ❌ Server load increases with clients
- ❌ Battery drain on mobile devices

### **After (Socket.io Method)**

```javascript
socket.on('new_audit_log', (newLog) => {
  setLogs([newLog, ...prevLogs]);  // Instant update!
});
```

**Benefits:**
- ✅ Event-driven architecture
- ✅ <100ms update latency
- ✅ Minimal server load
- ✅ Battery efficient
- ✅ Scalable with Redis adapter

---

## 🛠️ Common Issues & Solutions

### **Problem: "Cannot find module 'socket.io'"**

**Solution:**
```bash
cd backend
npm install socket.io@^4.8.3
```

---

### **Problem: "Cannot find module 'socket.io-client'"**

**Solution:**
```bash
cd frontend
npm install socket.io-client@^4.8.3
```

---

### **Problem: CORS Error in Browser Console**

**Solution:** Verify `backend/src/app.js` has:
```javascript
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:5173',  // Match frontend URL
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

---

### **Problem: Connection keeps dropping**

**Solution:** Check firewall/proxy allows WebSocket. Or restart backend:
```bash
npm run dev  # Backend
```

---

### **Problem: Events not appearing in UI**

**Solution:** Verify chain:
1. ✅ Backend: `console.log('Broadcasting audit log')`
2. ✅ Frontend: `console.log('New audit log received')`
3. ✅ MongoDB: Check `db.auditlogs.find()` has new records
4. ✅ Socket connected: Check green indicator in UI

---

## 📈 Next Steps (Optional Enhancements)

- [ ] Add filtering by action/actor/status
- [ ] Add pagination for large datasets
- [ ] Add search functionality
- [ ] Export to CSV/JSON
- [ ] Add real-time chart updates
- [ ] Implement log retention policy
- [ ] Add user role-based filtering

---

## 🔗 API Reference

### **Socket Events**

#### **Client → Server**
- `subscribe_audit_logs`: Join real-time update room
- `unsubscribe_audit_logs`: Leave real-time update room

#### **Server → Client**
- `new_audit_log`: Emitted when new audit log is created
  ```javascript
  {
    _id: "507f1f77bcf86cd799439011",
    action: "RÀ QUÉT TOÀN DIỆN",
    status: "Thành công",
    // ... other fields
  }
  ```

### **REST API Endpoints**

- `GET /api/v1/scans/logs` - Fetch initial audit logs
- `POST /api/v1/scans/scan` - Trigger cloud scan
- `POST /api/v1/scans/fix/:id` - Fix specific resource

---

## 📞 Support

**Quick Debugging:**
1. Check backend console for errors
2. Check browser DevTools → Console tab
3. Check browser Network → WS tab for connection status
4. Check MongoDB for records: `db.auditlogs.find().limit(5)`

---

**Status**: ✅ Ready for Production  
**Last Updated**: 2026-05-16  
**Version**: 1.0.0
