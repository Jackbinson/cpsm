import { randomUUID } from "crypto";

const levelWeights = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = levelWeights[(process.env.LOG_LEVEL || "info").toLowerCase()]
  ? (process.env.LOG_LEVEL || "info").toLowerCase()
  : "info";
const serviceName = process.env.LOG_SERVICE_NAME || "cpsm-api";
const includeStack = process.env.LOG_INCLUDE_STACK !== "false";
const sensitiveKeyPattern = /authorization|cookie|password|secret|token|api[-_]?key|access[-_]?key|private[-_]?key/i;

const truncate = (value, length = 5000) =>
  value.length > length ? `${value.slice(0, length)}...[truncated]` : value;

const serializeValue = (value, depth = 0, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    if (seen.has(value)) return "[circular reference]";
    seen.add(value);
    return {
      name: value.name,
      message: value.message,
      ...(value.code ? { code: value.code } : {}),
      ...(value.statusCode || value.status ? { statusCode: value.statusCode || value.status } : {}),
      ...(includeStack && value.stack ? { stack: value.stack } : {}),
      ...(value.cause ? { cause: serializeValue(value.cause, depth + 1, seen) } : {}),
    };
  }

  if (depth >= 6) return "[max depth reached]";
  if (Buffer.isBuffer(value)) return { type: "Buffer", length: value.length };
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[circular reference]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => serializeValue(item, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[redacted]" : serializeValue(item, depth + 1, seen),
    ])
  );
};

export const serializeError = (error) =>
  serializeValue(error instanceof Error ? error : new Error(String(error)));

const requestDetails = (req) => ({
  requestId: req.requestId || req.res?.locals?.requestId,
  method: req.method,
  path: `${req.baseUrl || ""}${req.path}`,
  ...(req.user?._id ? { userId: req.user._id.toString() } : {}),
});

const write = (level, event, details = {}) => {
  if (levelWeights[level] < levelWeights[configuredLevel]) return;

  const record = {
    ...serializeValue(details),
    timestamp: new Date().toISOString(),
    service: serviceName,
    level,
    event,
  };
  const output = JSON.stringify(record);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
};

export const logger = {
  debug: (event, details) => write("debug", event, details),
  info: (event, details) => write("info", event, details),
  warn: (event, details) => write("warn", event, details),
  error: (event, details) => write("error", event, details),
  child: (context = {}) => ({
    debug: (event, details) => write("debug", event, { ...context, ...details }),
    info: (event, details) => write("info", event, { ...context, ...details }),
    warn: (event, details) => write("warn", event, { ...context, ...details }),
    error: (event, details) => write("error", event, { ...context, ...details }),
  }),
};

const ignoredPaths = new Set(["/api/v1/health", "/api/v1/status"]);

export const requestLogger = (req, res, next) => {
  if (ignoredPaths.has(req.path)) return next();

  const startedAt = performance.now();
  const suppliedRequestId = req.get("X-Request-Id");
  const requestId = suppliedRequestId && suppliedRequestId.length <= 128
    ? suppliedRequestId
    : randomUUID();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  let completed = false;

  res.on("finish", () => {
    completed = true;
    const durationMs = Math.round(performance.now() - startedAt);
    const details = {
      ...requestDetails(req),
      statusCode: res.statusCode,
      durationMs,
    };
    if (res.statusCode >= 500) logger.error("http.request.completed", details);
    else if (res.statusCode >= 400) logger.warn("http.request.completed", details);
    else logger.info("http.request.completed", details);
  });

  res.on("close", () => {
    if (completed) return;
    logger.warn("http.request.aborted", {
      ...requestDetails(req),
      durationMs: Math.round(performance.now() - startedAt),
    });
  });
  return next();
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : Number.isInteger(error?.status)
      ? error.status
      : 500;

  logger.error("http.request.failed", {
    ...requestDetails(req),
    statusCode,
    error,
  });

  if (res.headersSent) return next(error);

  const message = statusCode === 400 && error instanceof SyntaxError
    ? "Invalid JSON request body."
    : statusCode >= 500
      ? "An unexpected server error occurred."
      : "Request could not be processed.";

  return res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
  });
};