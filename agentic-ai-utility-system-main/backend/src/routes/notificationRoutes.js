import express from "express";
import Notification from "../models/Notification.js";
import { getUnreadNotifications, markAsRead } from "../utils/notifier.js";
import protect from "../middleware/auth.js";

const router = express.Router();

/**
 * Get user's notifications
 * GET /api/notifications
 */
router.get("/", protect, async (req, res) => {
  try {
    const { unreadOnly, limit = 20 } = req.query;
    const userId = req.user.id;

    let notifications;
    if (unreadOnly === "true") {
      const result = await getUnreadNotifications(userId, parseInt(limit));
      notifications = result.notifications;
    } else {
      notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate("faultId", "type status");
    }

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put("/:id/read", protect, async (req, res) => {
  try {
    const result = await markAsRead(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
router.put("/read-all", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get unread count
 * GET /api/notifications/unread-count
 */
router.get("/unread-count", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete("/:id", protect, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
