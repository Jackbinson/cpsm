export type ServerLogLevel = "info" | "warn" | "error";

export function logServerEvent(level: ServerLogLevel, event: string, details: Record<string, unknown> = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "cpsm-web",
    level,
    event,
    ...details,
  });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.log(record);
}