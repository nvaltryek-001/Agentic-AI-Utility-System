import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { 
    type: String, 
    enum: ["citizen", "technician", "admin"], 
    default: "citizen" 
  },
  phone: String,
  bio: String,
  avatar: String,
  googleId: String,
  isVerified: { type: Boolean, default: false },
  refreshToken: String,
  lastLogin: Date,
  // For technicians
  skills: [{ type: String }],
  location: {
    lat: Number,
    lng: Number,
    state: String,
    district: String,
    city: String,
    address: String
  },
  isAvailable: { type: Boolean, default: true },
  currentWorkload: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  totalCompleted: { type: Number, default: 0 },
  // Activity tracking
  activityHistory: [{
    action: String,
    timestamp: Date,
    details: Object
  }]
}, { timestamps: true });

userSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
