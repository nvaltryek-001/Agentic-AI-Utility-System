import Fault from "../models/Fault.js";
import User from "../models/User.js";
import { analyzeSensorData } from "../services/aiService.js";
import { analyzeFault, checkHistoricalFaults } from "../agents/faultAnalysisAgent.js";
import { calculatePriority } from "../agents/priorityDecisionAgent.js";
import { findBestTechnician, assignTechnicianToFault } from "../agents/assignmentAgent.js";
import { handleRejection, handleDelay } from "../agents/reschedulerAgent.js";
import { learnFromRepair, predictResolution } from "../agents/learningAgent.js";
import { createNotification } from "../utils/notifier.js";

/**
 * Report a new fault - Main entry point
 * POST /api/faults/report
 */
export const reportFault = async (req, res) => {
  try {
    const { type, description, location, images, reporterName, reporterPhone, lat, lng, address, severity } = req.body;
    const userId = req.user?.id;

    // Validation: Required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: "Type and description are required"
      });
    }

    // Validation: Description length
    if (description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Description must be at least 10 characters"
      });
    }

    // Validation: Fault type
    const validTypes = ['water', 'electricity', 'gas', 'sewage', 'other'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid fault type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validation: Severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (severity && !validSeverities.includes(severity.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      });
    }

    // Build location object
    const locationData = {
      lat: lat || location?.lat,
      lng: lng || location?.lng,
      address: address || location?.address || ""
    };

    // Validation: GPS coordinates
    if (!locationData.lat || !locationData.lng) {
      return res.status(400).json({
        success: false,
        message: "Location coordinates (lat, lng) are required"
      });
    }

    if (typeof locationData.lat !== 'number' || typeof locationData.lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: "Location coordinates must be numbers"
      });
    }

    if (locationData.lat < -90 || locationData.lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90"
      });
    }

    if (locationData.lng < -180 || locationData.lng > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180"
      });
    }

    // Step 1: AI Fault Analysis
    const analysis = await analyzeFault({
      description,
      type,
      location: locationData
    });

    // Step 2: Check historical patterns
    const historicalData = await checkHistoricalFaults(locationData, analysis.category);

    // Step 3: Calculate Priority
    const priority = calculatePriority({
      severity: severity || analysis.severity,
      category: analysis.category,
      populationDensity: analysis.populationDensity,
      location: locationData
    }, historicalData);

    // Step 4: Create fault record
    const fault = await Fault.create({
      reportedBy: userId,
      reporterName: reporterName || "Anonymous",
      reporterPhone: reporterPhone || "",
      type: analysis.category || type.toLowerCase(),
      description,
      location: locationData,
      severity: severity || analysis.severity || 'medium',
      confidenceScore: analysis.confidenceScore || 0.8,
      aiCategory: analysis.category,
      priorityScore: priority.priorityScore || 5,
      status: "analyzing",
      populationDensity: analysis.populationDensity,
      similarFaultsCount: historicalData?.similarCount || 0,
      images: images?.map(img => ({
        url: img.url || img,
        publicId: img.publicId,
        uploadedAt: new Date()
      })) || []
    });

    // Step 5: Find and assign best technician
    const assignment = await findBestTechnician(fault);

    if (assignment?.success) {
      await assignTechnicianToFault(fault._id, assignment.technician.id, {
        eta: assignment.technician.eta
      });

      // Notify technician
      await createNotification({
        recipient: assignment.technician.id,
        type: "fault_assigned",
        title: "New Fault Assigned",
        message: `${analysis.category} fault assigned. ETA: ${assignment.technician.etaFormatted}`,
        faultId: fault._id
      });

      // Get prediction from learning agent
      const prediction = predictResolution(fault);

      // Emit real-time update
      if (global.io) {
        global.io.emit("newFault", {
          fault: await Fault.findById(fault._id).populate("assignedTo", "name"),
          priority,
          technician: assignment.technician,
          prediction
        });
      }

      res.status(201).json({
        success: true,
        message: "Fault reported and assigned successfully",
        fault: await Fault.findById(fault._id).populate("assignedTo", "name"),
        analysis,
        priority,
        assignment: assignment.technician,
        prediction
      });
    } else {
      // No technician available - put on hold
      await Fault.findByIdAndUpdate(fault._id, { status: "on_hold" });

      if (global.io) {
        global.io.emit("newFault", {
          fault: await Fault.findById(fault._id),
          priority,
          assignment: null,
          message: "No technician available - on hold"
        });
      }

      res.status(201).json({
        success: true,
        message: "Fault reported but no technician available",
        fault,
        analysis,
        priority,
        assignment: null
      });
    }

  } catch (err) {
    console.error("Report Fault Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to report fault"
    });
  }
};

/**
 * Legacy fault detection endpoint (for sensor-based detection)
 * POST /api/faults/detect
 */
export const detectFault = async (req, res) => {
  try {
    const { value, location, type } = req.body;
    if (value === undefined || !type)
      return res.status(400).json({ message: "value and type are required" });

    const result = await analyzeSensorData(value);

    if (!result.fault) {
      return res.json({ message: "No fault detected" });
    }

    // Use new AI agents
    const analysis = await analyzeFault({
      description: `Sensor detected anomaly: ${value}`,
      type,
      location
    });

    const priority = calculatePriority({
      severity: result.severity,
      category: type,
      populationDensity: analysis.populationDensity,
      location
    });

    const fault = await Fault.create({
      type,
      location: location || { lat: 28.6, lng: 77.2 },
      severity: result.severity,
      priorityScore: priority.priorityScore,
      status: "analyzing",
      aiCategory: type,
      confidenceScore: 0.7
    });

    // Try to assign technician
    const assignment = await findBestTechnician(fault);
    if (assignment.success) {
      await assignTechnicianToFault(fault._id, assignment.technician.id, {
        eta: assignment.technician.eta
      });
    }

    global.io.emit("newFault", {
      fault: await Fault.findById(fault._id).populate("assignedTo", "name"),
      priority,
      technician: assignment.technician || null
    });

    res.json({
      message: "Fault detected",
      priority,
      technician: assignment.technician || null,
      fault
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all faults with filtering
 * GET /api/faults
 */
export const getFaults = async (req, res) => {
  try {
    const { status, severity, type, assignedTo, city, state, district, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Location-based filtering
    if (city) filter["location.city"] = city;
    if (state) filter["location.state"] = state;
    if (district) filter["location.district"] = district;

    const faults = await Fault.find(filter)
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("assignedTo", "name phone rating")
      .populate("reportedBy", "name");

    res.json(faults);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get single fault by ID
 * GET /api/faults/:id
 */
export const getFaultById = async (req, res) => {
  try {
    const fault = await Fault.findById(req.params.id)
      .populate("assignedTo", "name phone rating location")
      .populate("reportedBy", "name email");

    if (!fault) {
      return res.status(404).json({ message: "Fault not found" });
    }

    res.json(fault);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update fault status
 * PUT /api/faults/:id/status
 */
export const updateFaultStatus = async (req, res) => {
  try {
    const { status, notes, proofImage } = req.body;
    const faultId = req.params.id;

    const updateData = { status };

    // Set timestamps based on status
    if (status === "in_progress") {
      updateData.startedAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
      if (notes) updateData["resolution.notes"] = notes;
      if (proofImage) updateData["resolution.proofImage"] = proofImage;

      // Decrement technician workload
      const fault = await Fault.findById(faultId);
      if (fault.assignedTo) {
        await User.findByIdAndUpdate(fault.assignedTo, {
          $inc: { currentWorkload: -1 }
        });
      }

      // Learn from this repair
      await learnFromRepair(faultId);
    }

    const updatedFault = await Fault.findByIdAndUpdate(
      faultId,
      updateData,
      { new: true }
    ).populate("assignedTo", "name");

    // Notify relevant parties
    if (updatedFault.reportedBy) {
      await createNotification({
        recipient: updatedFault.reportedBy,
        type: "status_update",
        title: `Fault ${status.replace("_", " ")}`,
        message: `Your reported fault status has been updated to: ${status}`,
        faultId
      });
    }

    global.io.emit("faultStatusUpdated", { fault: updatedFault });

    res.json({ success: true, fault: updatedFault });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Technician accepts/rejects fault
 * POST /api/faults/:id/respond
 */
export const respondToFault = async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'accept' or 'reject'
    const faultId = req.params.id;
    const technicianId = req.user.id;

    const fault = await Fault.findById(faultId);
    if (!fault) {
      return res.status(404).json({ message: "Fault not found" });
    }

    if (fault.assignedTo?.toString() !== technicianId) {
      return res.status(403).json({ message: "Not assigned to you" });
    }

    if (action === "accept") {
      await Fault.findByIdAndUpdate(faultId, {
        status: "in_progress",
        acceptedAt: new Date()
      });

      // Notify reporter
      if (fault.reportedBy) {
        await createNotification({
          recipient: fault.reportedBy,
          type: "fault_accepted",
          title: "Technician Assigned",
          message: "A technician has accepted your fault report and is on the way.",
          faultId
        });
      }

      res.json({ success: true, message: "Fault accepted" });
    } else if (action === "reject") {
      const result = await handleRejection(faultId, technicianId, reason);
      res.json(result);
    } else {
      res.status(400).json({ message: "Invalid action" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get faults for a technician
 * GET /api/faults/my-assignments
 */
export const getMyAssignments = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const { status } = req.query;

    const filter = { assignedTo: technicianId };
    if (status) filter.status = status;

    const faults = await Fault.find(filter)
      .sort({ priorityScore: -1, createdAt: -1 })
      .populate("reportedBy", "name phone");

    res.json(faults);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submit feedback for completed fault
 * POST /api/faults/:id/feedback
 */
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const faultId = req.params.id;

    const fault = await Fault.findByIdAndUpdate(
      faultId,
      {
        "citizenFeedback.rating": rating,
        "citizenFeedback.comment": comment,
        "citizenFeedback.submittedAt": new Date()
      },
      { new: true }
    );

    // Update technician rating via learning agent
    if (fault.assignedTo) {
      await learnFromRepair(faultId);
    }

    res.json({ success: true, fault });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get dashboard statistics
 * GET /api/faults/stats/dashboard
 */
export const getDashboardStats = async (req, res) => {
  try {
    const totalFaults = await Fault.countDocuments();

    // Count by severity
    const critical = await Fault.countDocuments({ severity: 'critical' });
    const high = await Fault.countDocuments({ severity: 'high' });
    const medium = await Fault.countDocuments({ severity: 'medium' });
    const low = await Fault.countDocuments({ severity: 'low' });

    // Count by status
    const pending = await Fault.countDocuments({ status: { $in: ['reported', 'analyzing'] } });
    const inProgress = await Fault.countDocuments({ status: 'in_progress' });
    const completed = await Fault.countDocuments({ status: 'completed' });

    // Today's faults
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Fault.countDocuments({ createdAt: { $gte: today } });

    res.json({
      total: totalFaults,
      critical,
      high,
      medium,
      low,
      pending,
      inProgress,
      completed,
      today: todayCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get analytics data
 * GET /api/faults/analytics
 */
export const getAnalytics = async (req, res) => {
  try {
    const totalFaults = await Fault.countDocuments();
    const pendingFaults = await Fault.countDocuments({ status: { $in: ["reported", "analyzing", "assigned"] } });
    const inProgressFaults = await Fault.countDocuments({ status: "in_progress" });
    const completedFaults = await Fault.countDocuments({ status: "completed" });

    // Severity distribution
    const severityDistribution = await Fault.aggregate([
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]);

    // Category distribution
    const categoryDistribution = await Fault.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    // Average resolution time
    const avgResolutionTime = await Fault.aggregate([
      { $match: { status: "completed", completedAt: { $exists: true }, startedAt: { $exists: true } } },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ["$completedAt", "$startedAt"] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      { $group: { _id: null, avgTime: { $avg: "$resolutionTime" } } }
    ]);

    // Recent faults (last 7 days)
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentFaults = await Fault.countDocuments({ createdAt: { $gte: lastWeek } });

    res.json({
      total: totalFaults,
      pending: pendingFaults,
      inProgress: inProgressFaults,
      completed: completedFaults,
      severityDistribution,
      categoryDistribution,
      avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
      recentFaults
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
