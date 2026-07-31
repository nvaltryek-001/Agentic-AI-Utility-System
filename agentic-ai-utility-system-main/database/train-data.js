/**
 * AI Training Dataset Generator - 320 Fault Records
 * Run with: node database/train-data.js
 * 
 * This script generates 320 realistic fault records for training the AI model
 * covering various fault types, severities, locations, and scenarios
 */

import mongoose from "mongoose";
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

// Fault Schema (simplified for seeding)
const faultSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: String,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  severity: { 
    type: String, 
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  confidenceScore: { type: Number, default: 0 },
  aiCategory: String,
  priorityScore: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ["reported", "analyzing", "assigned", "in_progress", "on_hold", "completed", "cancelled"],
    default: "reported"
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedAt: Date,
  eta: Date,
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  resolution: {
    notes: String,
    cost: Number,
    partsUsed: [String]
  },
  populationDensity: { type: Number, default: 0 },
  similarFaultsCount: { type: Number, default: 0 },
  reassignmentCount: { type: Number, default: 0 },
  citizenFeedback: {
    rating: Number,
    comment: String,
    submittedAt: Date
  },
  reportedBy: { type: String, default: "system" }
}, { timestamps: true });

const Fault = mongoose.model("Fault", faultSchema);
const User = mongoose.model("User", new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  skills: [String],
  location: { lat: Number, lng: Number }
}));

// Training Dataset Configuration
const FAULT_TYPES = [
  { type: "electricity", weight: 0.25, severities: ["critical", "high", "medium", "low"] },
  { type: "water", weight: 0.20, severities: ["critical", "high", "medium", "low"] },
  { type: "road", weight: 0.20, severities: ["high", "medium", "low"] },
  { type: "streetlight", weight: 0.15, severities: ["medium", "low"] },
  { type: "sewage", weight: 0.10, severities: ["critical", "high", "medium"] },
  { type: "gas", weight: 0.08, severities: ["critical", "high"] },
  { type: "other", weight: 0.02, severities: ["medium", "low"] }
];

const DELHI_LOCATIONS = [
  { name: "Connaught Place", lat: 28.6329, lng: 77.2195, density: 95 },
  { name: "Karol Bagh", lat: 28.6443, lng: 77.1904, density: 88 },
  { name: "Rajouri Garden", lat: 28.6415, lng: 77.1209, density: 82 },
  { name: "Dwarka", lat: 28.5921, lng: 77.0460, density: 75 },
  { name: "Rohini", lat: 28.7383, lng: 77.0822, density: 78 },
  { name: "Pitampura", lat: 28.6993, lng: 77.1406, density: 72 },
  { name: "Janakpuri", lat: 28.6210, lng: 77.0878, density: 80 },
  { name: "Lajpat Nagar", lat: 28.5677, lng: 77.2430, density: 85 },
  { name: "Greater Kailash", lat: 28.5489, lng: 77.2386, density: 70 },
  { name: "Saket", lat: 28.5245, lng: 77.2016, density: 68 },
  { name: "Vasant Kunj", lat: 28.5403, lng: 77.1542, density: 65 },
  { name: "Chanakyapuri", lat: 28.5846, lng: 77.1858, density: 60 },
  { name: "Nehru Place", lat: 28.5494, lng: 77.2512, density: 90 },
  { name: "Okhla", lat: 28.5383, lng: 77.2632, density: 76 },
  { name: "Mayur Vihar", lat: 28.6072, lng: 77.3047, density: 74 },
  { name: "Laxmi Nagar", lat: 28.6303, lng: 77.2779, density: 86 },
  { name: "Preet Vihar", lat: 28.6414, lng: 77.2954, density: 71 },
  { name: "Shahdara", lat: 28.6730, lng: 77.3215, density: 83 },
  { name: "Seelampur", lat: 28.6696, lng: 77.2779, density: 87 },
  { name: "Civil Lines", lat: 28.6814, lng: 77.2227, density: 69 }
];

const FAULT_DESCRIPTIONS = {
  electricity: [
    "Power outage affecting multiple buildings",
    "Transformer explosion and fire",
    "Exposed high voltage wires",
    "Flickering lights and voltage fluctuations",
    "Electric pole leaning dangerously",
    "Meter box sparking and smoking",
    "Underground cable fault",
    "Street light not working for 3 days",
    "Substation equipment failure",
    "Overhead wire hanging low"
  ],
  water: [
    "Main water pipe burst flooding street",
    "No water supply for 24 hours",
    "Severe water leakage from main line",
    "Contaminated water supply",
    "Water pressure extremely low",
    "Fire hydrant damaged and leaking",
    "Water tank overflow causing flooding",
    "Broken water meter",
    "Illegal water connection",
    "Water supply pipe corroded"
  ],
  road: [
    "Large pothole causing accidents",
    "Road cave-in dangerous for vehicles",
    "Speed breaker damaged",
    "Road markings faded completely",
    "Drainage cover missing on road",
    "Roadside debris blocking traffic",
    "Illegal speed bump constructed",
    "Road shoulder eroded",
    "Manhole cover broken",
    "Street flooding due to poor drainage"
  ],
  streetlight: [
    "Street light not working - dark area",
    "Multiple lights flickering",
    "Light pole tilted",
    "LED panel damaged",
    "Light sensor malfunction",
    "Cable theft from pole",
    "Light too dim",
    "Light on during day",
    "Pole base damaged",
    "Light fixture hanging loose"
  ],
  sewage: [
    "Sewage overflow on main road",
    "Manhole overflowing with waste",
    "Sewage line blockage",
    "Foul smell from drain",
    "Sewage water entering homes",
    "Drain cover missing",
    "Sewage line broken",
    "Storm drain clogged",
    "Gutter overflowing",
    "Sewage backup in basement"
  ],
  gas: [
    "Gas pipeline leak detected",
    "Strong gas smell in area",
    "Gas meter malfunction",
    "Pipeline corrosion visible",
    "Gas pressure fluctuation",
    "Illegal gas tapping",
    "Pipeline exposed due to construction",
    "Gas valve damaged",
    "Pipeline marker missing",
    "Gas leak at joint"
  ],
  other: [
    "Public property damage",
    "Unauthorized construction",
    "Noise pollution complaint",
    "Air quality issue",
    "Illegal dumping"
  ]
};

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random location with offset
const randomLocation = (baseLocation) => {
  const offset = 0.02; // ~2km radius
  return {
    lat: baseLocation.lat + (Math.random() - 0.5) * offset,
    lng: baseLocation.lng + (Math.random() - 0.5) * offset,
    address: `${baseLocation.name}, Delhi`
  };
};

// Calculate severity based on type and description
const calculateSeverity = (type, description) => {
  const criticalKeywords = ["explosion", "fire", "leak", "outage", "burst", "cave-in", "gas smell"];
  const highKeywords = ["flooding", "spark", "smoking", "damaged", "broken", "missing", "blockage"];
  
  const desc = description.toLowerCase();
  if (criticalKeywords.some(k => desc.includes(k))) return "critical";
  if (highKeywords.some(k => desc.includes(k))) return "high";
  if (type === "streetlight" || type === "other") return Math.random() > 0.5 ? "medium" : "low";
  return "medium";
};

// Calculate priority score based on multiple factors
const calculatePriorityScore = (severity, populationDensity, similarFaults) => {
  let score = 0;
  
  // Severity weight
  const severityWeights = { critical: 40, high: 30, medium: 20, low: 10 };
  score += severityWeights[severity] || 10;
  
  // Population density weight (0-25 points)
  score += (populationDensity / 100) * 25;
  
  // Historical pattern weight
  score += Math.min(similarFaults * 2, 15);
  
  // Random variation (-5 to +5)
  score += (Math.random() - 0.5) * 10;
  
  return Math.min(Math.max(Math.round(score), 0), 100);
};

// Generate 320 fault records
const generateFaultDataset = async (technicians) => {
  const faults = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  
  // Status distribution for realistic training data
  const statusWeights = [
    { status: "completed", weight: 0.45 },
    { status: "in_progress", weight: 0.20 },
    { status: "assigned", weight: 0.15 },
    { status: "reported", weight: 0.12 },
    { status: "on_hold", weight: 0.05 },
    { status: "cancelled", weight: 0.03 }
  ];
  
  for (let i = 0; i < 320; i++) {
    // Select fault type based on weights
    const typeRandom = Math.random();
    let typeCumulative = 0;
    let selectedType = FAULT_TYPES[0];
    for (const ft of FAULT_TYPES) {
      typeCumulative += ft.weight;
      if (typeRandom <= typeCumulative) {
        selectedType = ft;
        break;
      }
    }
    
    // Select location
    const location = DELHI_LOCATIONS[Math.floor(Math.random() * DELHI_LOCATIONS.length)];
    const faultLocation = randomLocation(location);
    
    // Select description
    const descriptions = FAULT_DESCRIPTIONS[selectedType.type];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // Calculate severity
    const severity = calculateSeverity(selectedType.type, description);
    
    // Calculate similar faults (for learning)
    const similarFaults = Math.floor(Math.random() * 15);
    
    // Calculate priority score
    const priorityScore = calculatePriorityScore(severity, location.density, similarFaults);
    
    // Select status
    const statusRandom = Math.random();
    let statusCumulative = 0;
    let selectedStatus = statusWeights[0].status;
    for (const sw of statusWeights) {
      statusCumulative += sw.weight;
      if (statusRandom <= statusCumulative) {
        selectedStatus = sw.status;
        break;
      }
    }
    
    // Generate timestamps
    const createdAt = randomDate(sixMonthsAgo, now);
    const assignedAt = selectedStatus !== "reported" ? new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null;
    const startedAt = ["in_progress", "completed", "on_hold"].includes(selectedStatus) ? new Date((assignedAt || createdAt).getTime() + Math.random() * 48 * 60 * 60 * 1000) : null;
    const completedAt = selectedStatus === "completed" ? new Date((startedAt || createdAt).getTime() + Math.random() * 72 * 60 * 60 * 1000) : null;
    
    // Assign technician for non-reported faults
    let assignedTo = null;
    if (selectedStatus !== "reported" && technicians.length > 0) {
      // Match technician skills with fault type
      const matchingTechs = technicians.filter(t => 
        t.skills && t.skills.some(s => s.toLowerCase().includes(selectedType.type.toLowerCase()))
      );
      const techPool = matchingTechs.length > 0 ? matchingTechs : technicians;
      assignedTo = techPool[Math.floor(Math.random() * techPool.length)]._id;
    }
    
    // Generate resolution data for completed faults
    let resolution = null;
    if (selectedStatus === "completed") {
      resolution = {
        notes: `Issue resolved. ${["Replaced damaged parts", "Fixed the connection", "Cleared the blockage", "Repaired the damage"][Math.floor(Math.random() * 4)]}.`,
        cost: Math.floor(Math.random() * 5000) + 500,
        partsUsed: Math.random() > 0.5 ? ["Replacement part", "Sealant", "Connector"] : []
      };
    }
    
    // Generate feedback for completed faults
    let citizenFeedback = null;
    if (selectedStatus === "completed" && Math.random() > 0.3) {
      citizenFeedback = {
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 stars
        comment: ["Great service!", "Quick response", "Satisfied with work", "Issue fixed properly"][Math.floor(Math.random() * 4)],
        submittedAt: completedAt
      };
    }
    
    const fault = {
      type: selectedType.type,
      description,
      location: faultLocation,
      severity,
      confidenceScore: Math.floor(Math.random() * 20) + 80, // 80-100%
      aiCategory: selectedType.type,
      priorityScore,
      status: selectedStatus,
      assignedTo,
      assignedAt,
      eta: assignedAt ? new Date(assignedAt.getTime() + 4 * 60 * 60 * 1000) : null,
      startedAt,
      completedAt,
      resolution,
      populationDensity: location.density,
      similarFaultsCount: similarFaults,
      reassignmentCount: Math.random() > 0.9 ? 1 : 0,
      citizenFeedback,
      reportedBy: ["citizen", "iot_sensor", "admin", "technician"][Math.floor(Math.random() * 4)],
      createdAt,
      updatedAt: completedAt || startedAt || assignedAt || createdAt
    };
    
    faults.push(fault);
  }
  
  return faults.sort((a, b) => b.createdAt - a.createdAt);
};

// Main training function
const trainModel = async () => {
  try {
    console.log("🚀 Starting AI Training Dataset Generation...\n");
    
    await connectDB();
    
    // Get existing technicians for assignment
    const technicians = await User.find({ role: "technician" });
    console.log(`Found ${technicians.length} technicians for fault assignment`);
    
    // Clear existing faults (optional - comment out to keep existing)
    const clearExisting = process.argv.includes("--clear");
    if (clearExisting) {
      await Fault.deleteMany({});
      console.log("Cleared existing faults");
    }
    
    // Generate 320 fault records
    console.log("\n📊 Generating 320 fault records...");
    const faults = await generateFaultDataset(technicians);
    
    // Insert into database
    console.log("💾 Inserting into database...");
    const inserted = await Fault.insertMany(faults);
    
    // Statistics
    const stats = {
      total: inserted.length,
      byType: {},
      bySeverity: {},
      byStatus: {},
      byLocation: {}
    };
    
    inserted.forEach(f => {
      stats.byType[f.type] = (stats.byType[f.type] || 0) + 1;
      stats.bySeverity[f.severity] = (stats.bySeverity[f.severity] || 0) + 1;
      stats.byStatus[f.status] = (stats.byStatus[f.status] || 0) + 1;
      const locationName = f.location.address.split(",")[0];
      stats.byLocation[locationName] = (stats.byLocation[locationName] || 0) + 1;
    });
    
    console.log("\n✅ Training Dataset Generated Successfully!\n");
    console.log("=".repeat(50));
    console.log("📈 STATISTICS");
    console.log("=".repeat(50));
    console.log(`Total Records: ${stats.total}`);
    console.log("\nBy Type:");
    Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(15)} ${count.toString().padStart(3)} (${((count/stats.total)*100).toFixed(1)}%)`);
    });
    console.log("\nBy Severity:");
    Object.entries(stats.bySeverity).sort((a, b) => b[1] - a[1]).forEach(([sev, count]) => {
      console.log(`  ${sev.padEnd(10)} ${count.toString().padStart(3)} (${((count/stats.total)*100).toFixed(1)}%)`);
    });
    console.log("\nBy Status:");
    Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      console.log(`  ${status.padEnd(12)} ${count.toString().padStart(3)} (${((count/stats.total)*100).toFixed(1)}%)`);
    });
    
    // Calculate average priority score
    const avgPriority = inserted.reduce((sum, f) => sum + f.priorityScore, 0) / inserted.length;
    console.log(`\nAverage Priority Score: ${avgPriority.toFixed(2)}/100`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🤖 AI Model Training Data Ready!");
    console.log("=".repeat(50));
    console.log("\nThe AI agents can now learn from:");
    console.log("  • Historical fault patterns");
    console.log("  • Severity classification accuracy");
    console.log("  • Priority scoring effectiveness");
    console.log("  • Technician assignment success rates");
    console.log("  • Resolution time predictions");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Training Error:", error);
    process.exit(1);
  }
};

trainModel();
