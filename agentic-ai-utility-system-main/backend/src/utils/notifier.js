import Notification from "../models/Notification.js";

/**
 * Create and send a notification
 * @param {Object} notificationData - Notification details
 */
export const createNotification = async (notificationData) => {
  try {
    const { recipient, type, title, message, faultId, metadata } = notificationData;
    
    // Create in-app notification
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      faultId,
      sentVia: ["in_app"],
      metadata
    });
    
    // Send real-time notification via Socket.io
    if (global.io) {
      global.io.emit(`notification:${recipient}`, {
        notification: {
          id: notification._id,
          type,
          title,
          message,
          faultId,
          createdAt: notification.createdAt
        }
      });
    }
    
    console.log(`Notification sent to ${recipient}: ${title}`);
    return { success: true, notification };
    
  } catch (error) {
    console.error("Notification Error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk notifications
 */
export const sendBulkNotifications = async (recipients, notificationData) => {
  const results = [];
  for (const recipient of recipients) {
    const result = await createNotification({
      ...notificationData,
      recipient
    });
    results.push(result);
  }
  return results;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get unread notifications for a user
 */
export const getUnreadNotifications = async (userId, limit = 20) => {
  try {
    const notifications = await Notification.find({
      recipient: userId,
      isRead: false
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("faultId", "type status");
    
    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to role (all admins, all technicians, etc.)
 */
export const notifyByRole = async (role, notificationData) => {
  const User = (await import("../models/User.js")).default;
  const users = await User.find({ role });
  const recipients = users.map(u => u._id);
  return sendBulkNotifications(recipients, notificationData);
};

// Legacy function for backward compatibility
export const sendNotification = (message) => {
  console.log("NOTIFICATION:", message);
};

export default {
  createNotification,
  sendBulkNotifications,
  markAsRead,
  getUnreadNotifications,
  notifyByRole,
  sendNotification
};