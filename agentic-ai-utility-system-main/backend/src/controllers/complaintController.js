import Complaint from "../models/Complaint.js";

// Create new complaint
export const createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, images } = req.body;
    
    if (!title || !description || !category) {
      return res.status(400).json({ message: "Title, description and category are required" });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      location: location || {},
      images: images || [],
      reportedBy: req.user.id,
      reporterName: req.user.name,
      reporterPhone: req.user.phone,
      reporterEmail: req.user.email
    });

    res.status(201).json(complaint);
  } catch (err) {
    console.error("Create complaint error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all complaints with filters
export const getComplaints = async (req, res) => {
  try {
    const { city, state, status, category, myComplaints } = req.query;
    const filter = { isPublic: true };
    
    if (city) filter["location.city"] = city;
    if (state) filter["location.state"] = state;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (myComplaints === "true") filter.reportedBy = req.user.id;

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(complaints);
  } catch (err) {
    console.error("Get complaints error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get single complaint
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Increment view count
    complaint.viewCount += 1;
    await complaint.save();

    res.json(complaint);
  } catch (err) {
    console.error("Get complaint error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Update complaint status (admin/government only)
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, priority, assignedTo, resolution } = req.body;
    const updateData = {};
    
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo) {
      updateData.assignedTo = {
        ...assignedTo,
        assignedAt: new Date()
      };
    }
    if (resolution) {
      updateData.resolution = {
        ...resolution,
        resolvedAt: new Date(),
        resolvedBy: req.user.id
      };
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.json(complaint);
  } catch (err) {
    console.error("Update complaint error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Add feedback to complaint
export const addFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only reporter can add feedback
    if (complaint.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    complaint.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };
    
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    console.error("Add feedback error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Upvote complaint
export const upvoteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const userId = req.user.id;
    const alreadyUpvoted = complaint.upvotes.includes(userId);

    if (alreadyUpvoted) {
      // Remove upvote
      complaint.upvotes = complaint.upvotes.filter(id => id.toString() !== userId);
    } else {
      // Add upvote
      complaint.upvotes.push(userId);
    }

    await complaint.save();
    res.json({ upvoted: !alreadyUpvoted, upvoteCount: complaint.upvotes.length });
  } catch (err) {
    console.error("Upvote error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get complaint stats for city
export const getComplaintStats = async (req, res) => {
  try {
    const { city, state } = req.query;
    const filter = {};
    
    if (city) filter["location.city"] = city;
    if (state) filter["location.state"] = state;

    const stats = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Complaint.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      byStatus: stats,
      byCategory: categoryStats,
      total: await Complaint.countDocuments(filter)
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ message: err.message });
  }
};
