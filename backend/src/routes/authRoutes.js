import express from "express";
import {
  createAdmin,
  getCurrentUser,
  googleLogin,
  loginUser,
  logout,
  logoutAllDevices,
  registerUser,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleLogin);
router.post("/create-admin", createAdmin);
router.get("/me", protect, getCurrentUser);
router.post("/logout", protect, logout);
router.post("/logout-all", protect, logoutAllDevices);

export default router;