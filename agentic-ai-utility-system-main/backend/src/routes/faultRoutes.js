import express from "express";
import {
  detectFault,
  getFaults,
  reportFault,
  getFaultById,
  updateFaultStatus,
  respondToFault,
  getMyAssignments,
  submitFeedback,
  getAnalytics,
  getDashboardStats
} from "../controllers/faultController.js";
import protect from "../middleware/auth.js";
import { faultLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Sensor endpoint with rate limiting
router.post("/detect", faultLimiter, detectFault);

// Protected routes
router.post("/report", faultLimiter, protect, reportFault);
router.get("/", protect, getFaults);
router.get("/stats/dashboard", protect, getDashboardStats);
router.get("/analytics", protect, getAnalytics);
router.get("/my-assignments", protect, getMyAssignments);
router.get("/:id", protect, getFaultById);
router.put("/:id/status", protect, updateFaultStatus);
router.post("/:id/respond", protect, respondToFault);
router.post("/:id/feedback", protect, submitFeedback);

export default router;
