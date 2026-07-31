/**
 * Database Seeding Script
 * Run with: node database/seed.js
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../backend/.env") });

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/valtryek_001");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["citizen", "technician", "admin"], default: "citizen" },
  phone: String,
  skills: [{ type: String }],
  location: { lat: Number, lng: Number },
  isAvailable: { type: Boolean, default: true },
  currentWorkload: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  totalCompleted: { type: Number, default: 0 }
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

const User = mongoose.model("User", userSchema);

// Seed Data
const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Create Admin
    const admin = await User.create({
      name: "System Admin",
      email: "admin@valtryek.com",
      password: "admin123",
      role: "admin",
      phone: "+91-9999999999"
    });
    console.log("Created admin:", admin.email);

    // Create Test Citizens
    const citizens = await User.create([
      {
        name: "Rahul Sharma",
        email: "rahul@example.com",
        password: "password123",
        role: "citizen",
        phone: "+91-9876543210"
      },
      {
        name: "Priya Patel",
        email: "priya@example.com",
        password: "password123",
        role: "citizen",
        phone: "+91-9876543211"
      },
      {
        name: "Amit Kumar",
        email: "amit@example.com",
        password: "password123",
        role: "citizen",
        phone: "+91-9876543212"
      }
    ]);
    console.log(`Created ${citizens.length} citizens`);

    // Create Technicians
    const technicians = await User.create([
      {
        name: "Rajesh Electric",
        email: "rajesh@tech.com",
        password: "password123",
        role: "technician",
        phone: "+91-9876543213",
        skills: ["electrical", "wiring", "power", "streetlight"],
        location: { lat: 28.61, lng: 77.21 },
        isAvailable: true,
        rating: 4.8
      },
      {
        name: "Suresh Plumbing",
        email: "suresh@tech.com",
        password: "password123",
        role: "technician",
        phone: "+91-9876543214",
        skills: ["plumbing", "water", "pipe", "sewage"],
        location: { lat: 28.59, lng: 77.19 },
        isAvailable: true,
        rating: 4.5
      },
      {
        name: "Amit Construction",
        email: "amit@tech.com",
        password: "password123",
        role: "technician",
        phone: "+91-9876543215",
        skills: ["construction", "roadwork", "civil", "asphalt"],
        location: { lat: 28.62, lng: 77.22 },
        isAvailable: true,
        rating: 4.7
      },
      {
        name: "Vikram Maintenance",
        email: "vikram@tech.com",
        password: "password123",
        role: "technician",
        phone: "+91-9876543216",
        skills: ["electrical", "lighting", "maintenance", "general"],
        location: { lat: 28.58, lng: 77.18 },
        isAvailable: true,
        rating: 4.6
      },
      {
        name: "Deepak Gas",
        email: "deepak@tech.com",
        password: "password123",
        role: "technician",
        phone: "+91-9876543217",
        skills: ["gas", "pipeline", "safety", "valve"],
        location: { lat: 28.63, lng: 77.23 },
        isAvailable: true,
        rating: 4.9
      }
    ]);
    console.log(`Created ${technicians.length} technicians`);

    console.log("\n✅ Database seeded successfully!");
    console.log("\nLogin credentials:");
    console.log("Admin: admin@valtryek.com / admin123");
    console.log("Citizen: rahul@example.com / password123");
    console.log("Technician: rajesh@tech.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedData();
