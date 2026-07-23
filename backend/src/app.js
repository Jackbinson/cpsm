import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import connectDB from "./config/db.js";
import { configureScanQueue } from "./jobs/queues.js";
import authRoutes from "./routes/authRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import { sendDiscordAlert } from "./services/discordService.js";
import {
  REALTIME_CHANNEL,
  createRealtimeSubscriber,
} from "./services/realtimeEvents.js";

const app = express();
const server = http.createServer(app);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const io = new SocketIOServer(server, {
  cors: {
    origin: frontendOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);
app.use(
  cors({
    origin: frontendOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/v1/scans", scanRoutes);
app.use("/api/v1/auth", authRoutes);

app.get("/api/v1/status", (_req, res) => {
  res.json({ message: "CSPM Backend is running.", socketIO: true });
});

io.on("connection", (socket) => {
  socket.on("subscribe_audit_logs", () => socket.join("audit_logs_room"));
  socket.on("unsubscribe_audit_logs", () => socket.leave("audit_logs_room"));
  socket.on("subscribe_scan_runs", () => socket.join("scan_runs_room"));
  socket.on("unsubscribe_scan_runs", () => socket.leave("scan_runs_room"));
});

const startServer = async () => {
  await connectDB();
  await configureScanQueue();

  const realtimeSubscriber = createRealtimeSubscriber();
  await realtimeSubscriber.subscribe(REALTIME_CHANNEL);
  realtimeSubscriber.on("message", (_channel, rawMessage) => {
    try {
      const event = JSON.parse(rawMessage);
      if (event.type === "scan.status.changed") {
        io.to("scan_runs_room").emit("scan.status.changed", event.payload);
      }
      if (event.type === "audit-log.created") {
        io.to("audit_logs_room").emit("new_audit_log", event.payload.auditLog);
      }
      if (event.type === "discord.alert.request") {
        sendDiscordAlert(
          event.payload.resourceName,
          event.payload.status,
          event.payload.reason
        ).catch((error) => console.error("[Discord] Alert dispatch failed:", error.message));
      }
    } catch (error) {
      console.error("[Realtime] Invalid event:", error.message);
    }
  });

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`CSPM API listening on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error("CSPM API failed to start:", error);
  process.exit(1);
});

export default io;
