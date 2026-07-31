import mongoose from "mongoose";

const faultSchema = new mongoose.Schema({
  type: String,
  description: String,
  location: {
    lat: Number,
    lng: Number,
    address: String,
    state: String,
    district: String,
    city: String
  },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reporterName: String,
  reporterPhone: String,
  
  // AI Analysis
  severity: { 
    type: String, 
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  confidenceScore: { type: Number, default: 0 },
  aiCategory: String,
  
  // Priority and Assignment
  priorityScore: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ["reported", "analyzing", "assigned", "in_progress", "on_hold", "completed", "cancelled"],
    default: "reported"
  },
  
  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedAt: Date,
  eta: Date,
  
  // Timeline
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  
  // Resolution
  resolution: {
    notes: String,
    proofImage: String,
    cost: Number,
    partsUsed: [String]
  },
  
  // Images
  images: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Population density (for priority calculation)
  populationDensity: { type: Number, default: 0 },
  
  // Historical data
  similarFaultsCount: { type: Number, default: 0 },
  
  // Reassignment tracking
  reassignmentCount: { type: Number, default: 0 },
  reassignmentReason: String,
  
  // Feedback
  citizenFeedback: {
    rating: Number,
    comment: String,
    submittedAt: Date
  }
}, { timestamps: true });

// Indexes for faster queries
faultSchema.index({ status: 1, createdAt: -1 });
faultSchema.index({ location: "2dsphere" });
faultSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model("Fault", faultSchema);
