import express from "express";
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  addFeedback,
  upvoteComplaint,
  getComplaintStats
} from "../controllers/complaintController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Routes
router.post("/", createComplaint);
router.get("/", getComplaints);
router.get("/stats", getComplaintStats);
router.get("/:id", getComplaintById);
router.put("/:id/status", updateComplaintStatus);
router.put("/:id/feedback", addFeedback);
router.post("/:id/upvote", upvoteComplaint);

export default router;
