import express from "express";
import User from "../models/User.js";
import protect from "../middleware/auth.js";

const router = express.Router();

/**
 * Get all technicians
 * GET /api/technicians
 */
router.get("/", protect, async (req, res) => {
  try {
    const { available, skill } = req.query;
    
    const filter = { role: "technician" };
    if (available) filter.isAvailable = available === "true";
    if (skill) filter.skills = { $in: [skill] };

    const technicians = await User.find(filter)
      .select("-password")
      .sort({ rating: -1 });

    res.json(technicians);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get technician by ID
 * GET /api/technicians/:id
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const technician = await User.findById(req.params.id)
      .select("-password")
      .populate({
        path: "assignedFaults",
        match: { status: { $in: ["assigned", "in_progress"] } },
        select: "type severity status location createdAt"
      });

    if (!technician || technician.role !== "technician") {
      return res.status(404).json({ message: "Technician not found" });
    }

    res.json(technician);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Update technician availability
 * PUT /api/technicians/availability
 */
router.put("/availability", protect, async (req, res) => {
  try {
    const { isAvailable, location } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || user.role !== "technician") {
      return res.status(403).json({ message: "Only technicians can update availability" });
    }

    const updateData = {};
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (location) updateData.location = location;

    const updated = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password");

    res.json({ success: true, technician: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Update technician location (for real-time tracking)
 * PUT /api/technicians/location
 */
router.put("/location", protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    await User.findByIdAndUpdate(userId, {
      location: { lat, lng }
    });

    // Emit location update to all connected clients
    if (global.io) {
      global.io.emit("technicianLocationUpdate", {
        technicianId: userId,
        location: { lat, lng },
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: "Location updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Get nearby technicians
 * GET /api/technicians/nearby
 */
router.get("/nearby", protect, async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude required" });
    }

    const technicians = await User.find({
      role: "technician",
      isAvailable: true,
      location: { $exists: true }
    }).select("-password");

    // Calculate distance for each technician
    const techniciansWithDistance = technicians.map(tech => {
      const distance = calculateDistance(
        { lat: parseFloat(lat), lng: parseFloat(lng) },
        tech.location
      );
      return { ...tech.toObject(), distance };
    });

    // Filter by radius and sort by distance
    const nearby = techniciansWithDistance
      .filter(t => t.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json(nearby);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Calculate distance using Haversine formula
 */
const calculateDistance = (loc1, loc2) => {
  if (!loc1 || !loc2 || !loc1.lat || !loc2.lat) return Infinity;

  const R = 6371;
  const dLat = toRadians(loc2.lat - loc1.lat);
  const dLon = toRadians(loc2.lng - loc1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.lat)) * Math.cos(toRadians(loc2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

export default router;
