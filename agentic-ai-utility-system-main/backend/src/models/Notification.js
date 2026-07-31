import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["fault_assigned", "fault_accepted", "fault_completed", "fault_rejected", "status_update", "system"],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  faultId: { type: mongoose.Schema.Types.ObjectId, ref: "Fault" },
  isRead: { type: Boolean, default: false },
  sentVia: [{
    type: String,
    enum: ["in_app", "email", "sms"]
  }],
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
