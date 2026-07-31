import express from "express";
import Fault from "../models/Fault.js";
import User from "../models/User.js";
import { analyzeFault } from "../agents/faultAnalysisAgent.js";
import { calculatePriority } from "../agents/priorityDecisionAgent.js";
import { findBestTechnician, assignTechnicianToFault } from "../agents/assignmentAgent.js";
import { trainModel, getModelInsights, getLearningStats } from "../agents/learningAgent.js";
import protect from "../middleware/auth.js";

const router = express.Router();

// Simulation configuration
const SIMULATION_CONFIG = {
  faultTypes: ["electricity", "water", "road", "streetlight", "sewage", "gas", "other"],
  severities: ["low", "medium", "high", "critical"],
  descriptions: {
    electricity: [
      "Power outage in the area",
      "Exposed electrical wires",
      "Transformer sparking",
      "Street light not working",
      "Voltage fluctuation issues"
    ],
    water: [
      "Water pipe burst",
      "Leakage from main line",
      "No water supply",
      "Water contamination",
      "Hydrant damaged"
    ],
    road: [
      "Large pothole on main road",
      "Road surface damaged",
      "Sinkhole forming",
      "Broken pavement",
      "Road markings faded"
    ],
    streetlight: [
      "Street light not working",
      "Multiple lights out",
      "Flickering street light",
      "Light pole damaged",
      "Dark area - safety concern"
    ],
    sewage: [
      "Sewage overflow",
      "Manhole cover missing",
      "Drain clogged",
      "Foul smell from drain",
      "Sewage line backup"
    ],
    gas: [
      "Gas leak smell",
      "Gas pipeline exposed",
      "Meter damaged",
      "Valve leaking",
      "Gas odor in building"
    ],
    other: [
      "General maintenance required",
      "Public property damaged",
      "Safety hazard reported",
      "Infrastructure issue",
      "Service request"
    ]
  },
  // Delhi NCR area coordinates (approximate)
  baseLocation: { lat: 28.6, lng: 77.2 },
  radius: 0.5 // degrees (approximately 50km)
};

/**
 * Generate random coordinates around base location
 */
const generateRandomLocation = () => {
  const { baseLocation, radius } = SIMULATION_CONFIG;
  const randomLat = baseLocation.lat + (Math.random() - 0.5) * radius;
  const randomLng = baseLocation.lng + (Math.random() - 0.5) * radius;
  return { lat: randomLat, lng: randomLng };
};

/**
 * Generate a random fault
 */
const generateRandomFault = () => {
  const type = SIMULATION_CONFIG.faultTypes[Math.floor(Math.random() * SIMULATION_CONFIG.faultTypes.length)];
  const descriptions = SIMULATION_CONFIG.descriptions[type];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  return {
    type,
    description,
    location: generateRandomLocation(),
    reporterName: `Citizen ${Math.floor(Math.random() * 1000)}`,
    reporterPhone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`
  };
};

/**
 * Generate random faults for testing
 * POST /api/simulate/faults
 */
router.post("/faults", protect, async (req, res) => {
  try {
    const { count = 5 } = req.body;
    const generatedFaults = [];

    for (let i = 0; i < count; i++) {
      const faultData = generateRandomFault();
      
      // Run through AI agents
      const analysis = await analyzeFault(faultData);
      const priority = calculatePriority({
        severity: analysis.severity,
        category: analysis.category,
        populationDensity: analysis.populationDensity,
        location: faultData.location
      });

      // Create fault
      const fault = await Fault.create({
        ...faultData,
        severity: analysis.severity,
        confidenceScore: analysis.confidenceScore,
        aiCategory: analysis.category,
        priorityScore: priority.priorityScore,
        status: "analyzing",
        populationDensity: analysis.populationDensity
      });

      // Try to assign technician
      const assignment = await findBestTechnician(fault);
      if (assignment.success) {
        await assignTechnicianToFault(fault._id, assignment.technician.id, {
          eta: assignment.technician.eta
        });
      }

      generatedFaults.push({
        fault: await Fault.findById(fault._id).populate("assignedTo", "name"),
        analysis,
        priority,
        assignment: assignment.technician || null
      });

      // Emit real-time update
      if (global.io) {
        global.io.emit("newFault", {
          fault: await Fault.findById(fault._id).populate("assignedTo", "name"),
          priority,
          technician: assignment.technician || null
        });
      }

      // Small delay between generations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({
      success: true,
      message: `Generated ${count} simulated faults`,
      faults: generatedFaults
    });

  } catch (err) {
    console.error("Simulation Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Generate test technicians
 * POST /api/simulate/technicians
 */
router.post("/technicians", protect, async (req, res) => {
  try {
    const testTechnicians = [
      { name: "Rajesh Kumar", skills: ["electrical", "wiring", "power"], lat: 28.61, lng: 77.21 },
      { name: "Suresh Patel", skills: ["plumbing", "water", "pipe"], lat: 28.59, lng: 77.19 },
      { name: "Amit Singh", skills: ["construction", "roadwork", "civil"], lat: 28.62, lng: 77.22 },
      { name: "Vikram Rao", skills: ["electrical", "lighting", "maintenance"], lat: 28.58, lng: 77.18 },
      { name: "Priya Sharma", skills: ["plumbing", "sewage", "drainage"], lat: 28.63, lng: 77.23 },
      { name: "Deepak Verma", skills: ["gas", "pipeline", "safety"], lat: 28.57, lng: 77.17 },
      { name: "Anil Gupta", skills: ["general", "maintenance", "repair"], lat: 28.64, lng: 77.24 },
      { name: "Sunil Joshi", skills: ["electrical", "wiring", "lighting"], lat: 28.56, lng: 77.16 }
    ];

    const created = [];
    for (const tech of testTechnicians) {
      const email = `${tech.name.toLowerCase().replace(/\s/g, ".")}@test.com`;
      
      // Check if already exists
      const exists = await User.findOne({ email });
      if (exists) {
        created.push({ ...tech, email, status: "already exists" });
        continue;
      }

      const user = await User.create({
        name: tech.name,
        email,
        password: "password123",
        role: "technician",
        skills: tech.skills,
        location: { lat: tech.lat, lng: tech.lng },
        isAvailable: true,
        rating: 4 + Math.random()
      });

      created.push({
        id: user._id,
        name: tech.name,
        email,
        skills: tech.skills,
        status: "created"
      });
    }

    res.json({
      success: true,
      message: `Created ${created.filter(c => c.status === "created").length} test technicians`,
      technicians: created
    });

  } catch (err) {
    console.error("Technician Simulation Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Simulate technician responses
 * POST /api/simulate/responses
 */
router.post("/responses", protect, async (req, res) => {
  try {
    const { acceptRate = 0.8 } = req.body; // 80% acceptance rate by default
    
    // Get pending assigned faults
    const pendingFaults = await Fault.find({
      status: "assigned",
      assignedTo: { $exists: true }
    });

    const results = [];
    for (const fault of pendingFaults) {
      const willAccept = Math.random() < acceptRate;
      
      if (willAccept) {
        await Fault.findByIdAndUpdate(fault._id, {
          status: "in_progress",
          acceptedAt: new Date()
        });
        results.push({ faultId: fault._id, action: "accepted" });
      } else {
        // Reject and trigger rescheduler
        const { handleRejection } = await import("../agents/reschedulerAgent.js");
        const result = await handleRejection(fault._id, fault.assignedTo, "Simulated rejection");
        results.push({ faultId: fault._id, action: "rejected", result });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} responses`,
      results
    });

  } catch (err) {
    console.error("Response Simulation Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Simulate fault completions
 * POST /api/simulate/completions
 */
router.post("/completions", protect, async (req, res) => {
  try {
    const { completionRate = 0.3 } = req.body;
    
    // Get in-progress faults
    const inProgressFaults = await Fault.find({
      status: "in_progress"
    });

    const completed = [];
    for (const fault of inProgressFaults) {
      if (Math.random() < completionRate) {
        await Fault.findByIdAndUpdate(fault._id, {
          status: "completed",
          completedAt: new Date(),
          "resolution.notes": "Simulated completion",
          "resolution.cost": Math.floor(Math.random() * 5000) + 500
        });

        // Decrement technician workload
        await User.findByIdAndUpdate(fault.assignedTo, {
          $inc: { currentWorkload: -1, totalCompleted: 1 }
        });

        // Learn from repair
        const { learnFromRepair } = await import("../agents/learningAgent.js");
        await learnFromRepair(fault._id);

        completed.push(fault._id);
      }
    }

    res.json({
      success: true,
      message: `Completed ${completed.length} faults`,
      completed
    });

  } catch (err) {
    console.error("Completion Simulation Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Run full simulation cycle
 * POST /api/simulate/run
 */
router.post("/run", protect, async (req, res) => {
  try {
    const { faults = 5, acceptRate = 0.8, completionRate = 0.3 } = req.body;
    
    // Step 1: Ensure test technicians exist
    const techResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/simulate/technicians`, {
      method: "POST",
      headers: {
        "Authorization": req.headers.authorization,
        "Content-Type": "application/json"
      }
    });

    // Step 2: Generate faults
    const faultResults = [];
    for (let i = 0; i < faults; i++) {
      const faultData = generateRandomFault();
      const analysis = await analyzeFault(faultData);
      const priority = calculatePriority({
        severity: analysis.severity,
        category: analysis.category,
        populationDensity: analysis.populationDensity,
        location: faultData.location
      });

      const fault = await Fault.create({
        ...faultData,
        severity: analysis.severity,
        confidenceScore: analysis.confidenceScore,
        aiCategory: analysis.category,
        priorityScore: priority.priorityScore,
        status: "analyzing",
        populationDensity: analysis.populationDensity
      });

      const assignment = await findBestTechnician(fault);
      if (assignment.success) {
        await assignTechnicianToFault(fault._id, assignment.technician.id, {
          eta: assignment.technician.eta
        });
      }

      faultResults.push({
        faultId: fault._id,
        type: faultData.type,
        severity: analysis.severity,
        priority: priority.priorityScore,
        assigned: assignment.success
      });

      if (global.io) {
        global.io.emit("newFault", {
          fault: await Fault.findById(fault._id).populate("assignedTo", "name"),
          priority,
          technician: assignment.technician || null
        });
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Step 3: Simulate responses
    const pendingFaults = await Fault.find({ status: "assigned" });
    const responseResults = [];
    for (const fault of pendingFaults) {
      const willAccept = Math.random() < acceptRate;
      if (willAccept) {
        await Fault.findByIdAndUpdate(fault._id, {
          status: "in_progress",
          acceptedAt: new Date()
        });
        responseResults.push({ faultId: fault._id, action: "accepted" });
      }
    }

    // Step 4: Simulate completions
    const inProgressFaults = await Fault.find({ status: "in_progress" });
    const completionResults = [];
    for (const fault of inProgressFaults) {
      if (Math.random() < completionRate) {
        await Fault.findByIdAndUpdate(fault._id, {
          status: "completed",
          completedAt: new Date()
        });
        await User.findByIdAndUpdate(fault.assignedTo, {
          $inc: { currentWorkload: -1, totalCompleted: 1 }
        });
        const { learnFromRepair } = await import("../agents/learningAgent.js");
        await learnFromRepair(fault._id);
        completionResults.push(fault._id);
      }
    }

    res.json({
      success: true,
      message: "Simulation cycle completed",
      results: {
        faultsGenerated: faultResults.length,
        responsesProcessed: responseResults.length,
        completions: completionResults.length,
        faultDetails: faultResults
      }
    });

  } catch (err) {
    console.error("Full Simulation Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get simulation status
 * GET /api/simulate/status
 */
router.get("/status", protect, async (req, res) => {
  try {
    const faultCounts = await Fault.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const technicianCount = await User.countDocuments({ role: "technician" });
    const availableTechnicians = await User.countDocuments({ role: "technician", isAvailable: true });

    res.json({
      faults: faultCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      technicians: {
        total: technicianCount,
        available: availableTechnicians
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Clear all simulation data
 * DELETE /api/simulate/clear
 */
router.delete("/clear", protect, async (req, res) => {
  try {
    // Delete test faults
    await Fault.deleteMany({ reporterName: /^Citizen/ });
    
    // Delete test technicians
    await User.deleteMany({ 
      role: "technician",
      email: /@test\.com$/
    });

    res.json({
      success: true,
      message: "Simulation data cleared"
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Train AI model on all fault data
 * POST /api/simulate/train
 */
router.post("/train", protect, async (req, res) => {
  try {
    console.log("🚀 Starting AI Model Training via API...");
    
    const result = await trainModel();
    
    res.json({
      success: true,
      message: `AI Model trained on ${result.trained} fault records`,
      data: result
    });

  } catch (err) {
    console.error("Training API Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get AI model insights
 * GET /api/simulate/insights
 */
router.get("/insights", protect, async (req, res) => {
  try {
    const insights = getModelInsights();
    const stats = getLearningStats();
    
    res.json({
      success: true,
      data: {
        insights,
        stats
      }
    });

  } catch (err) {
    console.error("Insights API Error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get learning statistics
 * GET /api/simulate/stats
 */
router.get("/stats", protect, async (req, res) => {
  try {
    const stats = getLearningStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    console.error("Stats API Error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
