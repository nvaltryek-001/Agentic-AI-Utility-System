import express from "express";
import {
  register,
  login,
  googleLogin,
  requestOTP,
  verifyOTP,
  refreshToken,
  getProfile,
  updateProfile,
  logout
} from "../controllers/authController.js";
import protect from "../middleware/auth.js";
import { body } from 'express-validator';
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const otpValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const profileValidation = [
  body('name').optional().trim().notEmpty(),
  body('bio').optional().trim(),
  body('phone').optional().trim(),
];

// Public routes
router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);
router.post("/google", authLimiter, googleLogin);
router.post("/otp/request", otpLimiter, requestOTP);
router.post("/otp/verify", otpLimiter, verifyOTP);
router.post("/refresh", authLimiter, refreshToken);

// Protected routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, profileValidation, updateProfile);
router.post("/logout", protect, logout);

export default router;
