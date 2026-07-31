import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["water", "electricity", "road", "sewage", "garbage", "streetlight", "other"],
    required: true 
  },
  location: {
    state: String,
    district: String,
    city: String,
    address: String,
    lat: Number,
    lng: Number
  },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reporterName: String,
  reporterPhone: String,
  reporterEmail: String,
  
  // Status tracking
  status: { 
    type: String, 
    enum: ["pending", "under_review", "assigned", "in_progress", "resolved", "rejected"],
    default: "pending"
  },
  
  // Priority
  priority: { 
    type: String, 
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  
  // Images
  images: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Assignment to government department
  assignedTo: {
    department: String,
    officerName: String,
    officerContact: String,
    assignedAt: Date
  },
  
  // Resolution
  resolution: {
    notes: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  
  // Citizen feedback
  feedback: {
    rating: Number,
    comment: String,
    submittedAt: Date
  },
  
  // Public visibility
  isPublic: { type: Boolean, default: true },
  
  // View/engagement count
  viewCount: { type: Number, default: 0 },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

// Indexes for faster queries
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ "location.city": 1, "location.state": 1 });
complaintSchema.index({ reportedBy: 1 });
complaintSchema.index({ category: 1 });

export default mongoose.model("Complaint", complaintSchema);
