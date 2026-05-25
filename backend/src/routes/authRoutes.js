import express from 'express';
import { registerUser, loginUser, createAdmin } from '../controllers/authController.js';

const router = express.Router();
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/create-admin', createAdmin);

export default router;