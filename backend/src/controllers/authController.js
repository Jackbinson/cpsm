import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  GoogleIdentityError,
  verifyGoogleIdToken,
} from "../services/googleIdentityService.js";
import { logger } from "../services/structuredLogger.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl || "",
  emailVerified: Boolean(user.emailVerified),
});

const generateToken = (user) => jwt.sign(
  { id: user._id, sessionVersion: user.sessionVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
);

const authenticationResponse = (res, status, user, message) => res.status(status).json({
  success: true,
  message,
  data: { ...publicUser(user), token: generateToken(user) },
});

export const registerUser = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!name || !email || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Name, a valid email, and a password of at least 8 characters are required.",
      });
    }
    if (await User.exists({ email })) {
      logger.warn("auth.registration_rejected", { requestId: req.requestId, reason: "email_already_exists" });
      return res.status(409).json({ success: false, message: "This email is already in use." });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
    });
    logger.info("auth.registered", { requestId: req.requestId, userId: user._id.toString(), role: user.role });
    return authenticationResponse(res, 201, user, "Account created successfully.");
  } catch (error) {
    logger.error("auth.registration_failed", { requestId: req.requestId, error });
    return res.status(500).json({ success: false, message: "Could not create the account." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const user = await User.findOne({ email }).select("+password +sessionVersion");

    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      logger.warn("auth.login_rejected", { requestId: req.requestId, reason: "invalid_credentials" });
      return res.status(401).json({ success: false, message: "Email or password is incorrect." });
    }
    logger.info("auth.login_succeeded", { requestId: req.requestId, userId: user._id.toString(), role: user.role });
    return authenticationResponse(res, 200, user, "Signed in successfully.");
  } catch (error) {
    logger.error("auth.login_failed", { requestId: req.requestId, error });
    return res.status(500).json({ success: false, message: "Could not sign in." });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const googleUser = await verifyGoogleIdToken(req.body?.idToken);
    let user = await User.findOne({ googleId: googleUser.subject }).select("+sessionVersion");

    if (!user) {
      user = await User.findOne({ email: googleUser.email }).select("+sessionVersion");
      if (user) {
        user.googleId = googleUser.subject;
        user.emailVerified = true;
        if (!user.avatarUrl) user.avatarUrl = googleUser.picture;
        await user.save();
      } else {
        user = await User.create({
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.subject,
          avatarUrl: googleUser.picture,
          emailVerified: true,
        });
      }
    }

    logger.info("auth.google_login_succeeded", { requestId: req.requestId, userId: user._id.toString(), role: user.role });
    return authenticationResponse(res, 200, user, "Signed in with Google successfully.");
  } catch (error) {
    if (error instanceof GoogleIdentityError) {
      logger.warn("auth.google_login_rejected", { requestId: req.requestId, reason: error.message });
      return res.status(401).json({ success: false, message: error.message });
    }
    logger.error("auth.google_login_failed", { requestId: req.requestId, error });
    return res.status(500).json({ success: false, message: "Could not sign in with Google." });
  }
};

export const getCurrentUser = async (req, res) =>
  res.status(200).json({ success: true, data: publicUser(req.user) });

export const logout = async (req, res) => {
  logger.info("auth.logged_out", { requestId: req.requestId, userId: req.user?._id?.toString() });
  return res.status(200).json({ success: true, message: "Signed out successfully." });
};

export const logoutAllDevices = async (req, res) => {
  try {
    req.user.sessionVersion = (req.user.sessionVersion || 0) + 1;
    await req.user.save();
    logger.info("auth.logged_out_all_devices", { requestId: req.requestId, userId: req.user._id.toString() });
    return res.status(200).json({ success: true, message: "Signed out from all devices." });
  } catch (error) {
    logger.error("auth.logout_all_failed", { requestId: req.requestId, userId: req.user?._id?.toString(), error });
    return res.status(500).json({ success: false, message: "Could not sign out from all devices." });
  }
};

// Deliberately disabled until a one-time bootstrap secret is configured.
export const createAdmin = async (req, res) => {
  if (!process.env.BOOTSTRAP_ADMIN_SECRET || req.get("X-Bootstrap-Secret") !== process.env.BOOTSTRAP_ADMIN_SECRET) {
    logger.warn("auth.bootstrap_admin_rejected", { requestId: req.requestId, reason: "disabled_or_invalid_secret" });
    return res.status(403).json({ success: false, message: "Bootstrap admin endpoint is disabled." });
  }

  try {
    const adminExists = await User.findOne({ email: "admin@cspm.com" });
    if (adminExists) {
      return res.status(409).json({ success: false, message: "Admin account already exists." });
    }

    const admin = await User.create({
      name: "Admin CSPM",
      email: "admin@cspm.com",
      password: await bcrypt.hash("admin123", 12),
      role: "admin",
      emailVerified: true,
    });
    logger.info("auth.bootstrap_admin_created", { requestId: req.requestId, userId: admin._id.toString() });
    return res.status(201).json({ success: true, data: publicUser(admin) });
  } catch (error) {
    logger.error("auth.bootstrap_admin_failed", { requestId: req.requestId, error });
    return res.status(500).json({ success: false, message: "Could not create bootstrap admin." });
  }
};