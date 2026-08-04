import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const getCookie = (header, name) => {
  const prefix = `${name}=`;
  const value = String(header || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Insufficient permissions." });
  }
  return next();
};

export const authenticateAccessToken = async (token) => {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password +sessionVersion");
    if (!user || (decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) return null;
    return user;
  } catch {
    return null;
  }
};

export const protect = async (req, res, next) => {
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const token = bearerToken || getCookie(req.headers.cookie, "cpsm_access_token");

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication is required." });
  }

  const user = await authenticateAccessToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: "Session is invalid or expired." });
  }

  req.user = user;
  return next();
};
