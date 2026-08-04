import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import connectDB from "./config/db.js";
import { configureScanQueue } from "./jobs/queues.js";
import { authenticateAccessToken, getCookie } from "./middlewares/authMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import scanRoutes from "./routes/scanRoutes.js";
import { sendDiscordAlert } from "./services/discordService.js";
import { getSystemHealth } from "./services/healthService.js";
import { errorHandler, logger, requestLogger } from "./services/structuredLogger.js";
import {
  REALTIME_CHANNEL,
  createRealtimeSubscriber,
} from "./services/realtimeEvents.js";

const app = express();
const server = http.createServer(app);
const frontendOrigins = (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:3001,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowFrontendOrigin = (origin, callback) => {
  if (!origin || frontendOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS."));
};

const io = new SocketIOServer(server, {
  cors: {
    origin: frontendOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    const authorization = socket.handshake.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;
    const token = bearerToken || getCookie(socket.handshake.headers.cookie, "cpsm_access_token");
    const user = await authenticateAccessToken(token);
    if (!user) {
      logger.warn("socket.authentication_failed", { reason: "missing_or_invalid_token" });
      return next(new Error("Authentication is required."));
    }

    socket.data.userId = user._id.toString();
    socket.data.isAdmin = user.role === "admin";
    return next();
  } catch (error) {
    logger.error("socket.authentication_error", { error });
    return next(new Error("Authentication is required."));
  }
});

app.set("io", io);
app.use(requestLogger);
app.use(
  cors({
    origin: allowFrontendOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/api/v1/scans", scanRoutes);
app.use("/api/v1/auth", authRoutes);

app.get("/api/v1/status", (_req, res) => {
  res.json({ message: "CSPM Backend is running.", socketIO: true });
});

app.get("/api/v1/health", async (_req, res) => {
  try {
    const health = await getSystemHealth();
    if (health.status !== "ok") logger.warn("health.degraded", { checks: health.checks });
    return res.status(health.status === "ok" ? 200 : 503).json(health);
  } catch (error) {
    logger.error("health.check_failed", { error });
    return res.status(503).json({ status: "degraded", service: "cpsm-api" });
  }
});

app.use(errorHandler);

io.on("connection", (socket) => {
  logger.info("socket.connected", {
    socketId: socket.id,
    userId: socket.data.userId,
    isAdmin: socket.data.isAdmin,
  });
  const scanRunsRoom = socket.data.isAdmin
    ? "scan_runs_admin"
    : `scan_runs_user:${socket.data.userId}`;

  socket.on("subscribe_audit_logs", () => {
    if (socket.data.isAdmin) socket.join("audit_logs_room");
  });
  socket.on("unsubscribe_audit_logs", () => socket.leave("audit_logs_room"));
  socket.on("subscribe_scan_runs", () => socket.join(scanRunsRoom));
  socket.on("unsubscribe_scan_runs", () => socket.leave(scanRunsRoom));
  socket.on("disconnect", (reason) => {
    logger.info("socket.disconnected", { socketId: socket.id, userId: socket.data.userId, reason });
  });
});

const startServer = async () => {
  logger.info("server.starting", { port: Number(process.env.PORT || 5000) });
  await connectDB();
  await configureScanQueue();

  const realtimeSubscriber = createRealtimeSubscriber();
  await realtimeSubscriber.subscribe(REALTIME_CHANNEL);
  logger.info("realtime.subscribed", { channel: REALTIME_CHANNEL });
  realtimeSubscriber.on("message", (_channel, rawMessage) => {
    try {
      const event = JSON.parse(rawMessage);
      if (event.type === "scan.status.changed") {
        const { createdBy, ...payload } = event.payload;
        if (createdBy) {
          io.to(`scan_runs_user:${createdBy}`).emit("scan.status.changed", payload);
        }
        io.to("scan_runs_admin").emit("scan.status.changed", payload);
      }
      if (event.type === "audit-log.created") {
        io.to("audit_logs_room").emit("new_audit_log", event.payload.auditLog);
      }
      if (event.type === "discord.alert.request") {
        sendDiscordAlert(
          event.payload.resourceName,
          event.payload.status,
          event.payload.reason
        ).catch((error) => logger.warn("discord.alert_failed", { error }));
      }
    } catch (error) {
      logger.warn("realtime.invalid_event", { error });
    }
  });

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    logger.info("server.started", { port });
  });
};

process.on("unhandledRejection", (error) => {
  logger.error("process.unhandled_rejection", { component: "api", error });
});

process.on("uncaughtException", (error) => {
  logger.error("process.uncaught_exception", { component: "api", error });
  server.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 5000).unref();
});

startServer().catch((error) => {
  logger.error("server.start_failed", { error });
  process.exit(1);
});

export default io;
