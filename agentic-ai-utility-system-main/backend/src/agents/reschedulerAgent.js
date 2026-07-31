/**
 * Self-Healing / Rescheduler Agent
 * Handles:
 * - Technician rejection
 * - Delays
 * - Automatic reassignment
 * - Conflict resolution
 */

import { findBestTechnician, assignTechnicianToFault } from "./assignmentAgent.js";
import { createNotification } from "../utils/notifier.js";
import Fault from "../models/Fault.js";
import User from "../models/User.js";

// Maximum number of reassignment attempts
const MAX_REASSIGNMENT_ATTEMPTS = 3;

// Delay threshold in minutes
const DELAY_THRESHOLD = 30;

/**
 * Handle technician rejection
 * @param {String} faultId - Fault ID
 * @param {String} technicianId - Technician who rejected
 * @param {String} reason - Rejection reason
 */
export const handleRejection = async (faultId, technicianId, reason = "") => {
  try {
    const fault = await Fault.findById(faultId);
    if (!fault) {
      return { success: false, message: "Fault not found" };
    }
    
    // Check if we've exceeded max reassignments
    if (fault.reassignmentCount >= MAX_REASSIGNMENT_ATTEMPTS) {
      // Escalate to admin
      await escalateToAdmin(fault, "Max reassignments exceeded");
      return {
        success: false,
        message: "Maximum reassignment attempts reached. Escalated to admin.",
        escalated: true
      };
    }
    
    // Decrement technician workload
    await User.findByIdAndUpdate(technicianId, {
      $inc: { currentWorkload: -1 },
      $set: { isAvailable: true }
    });
    
    // Find alternative technician
    const assignment = await findBestTechnician(fault, {
      excludeTechnicianId: technicianId
    });
    
    if (!assignment.success) {
      // No alternative found - put on hold
      await Fault.findByIdAndUpdate(faultId, {
        status: "on_hold",
        reassignmentCount: fault.reassignmentCount + 1,
        reassignmentReason: `No technician available after rejection: ${reason}`
      });
      
      await escalateToAdmin(fault, `No technician available: ${reason}`);
      
      return {
        success: false,
        message: "No alternative technician available. Fault put on hold.",
        onHold: true
      };
    }
    
    // Assign to new technician
    await assignTechnicianToFault(faultId, assignment.technician.id, {
      eta: assignment.technician.eta
    });
    
    // Update reassignment count
    await Fault.findByIdAndUpdate(faultId, {
      reassignmentCount: fault.reassignmentCount + 1,
      reassignmentReason: `Previous technician rejected: ${reason}`
    });
    
    // Notify new technician
    await createNotification({
      recipient: assignment.technician.id,
      type: "fault_assigned",
      title: "Reassigned Fault",
      message: `Fault reassigned to you. ETA: ${assignment.technician.etaFormatted}`,
      faultId
    });
    
    // Notify admin about reassignment
    global.io.emit("faultReassigned", {
      faultId,
      previousTechnician: technicianId,
      newTechnician: assignment.technician.id,
      reason
    });
    
    return {
      success: true,
      message: "Fault reassigned successfully",
      newTechnician: assignment.technician,
      reassignmentCount: fault.reassignmentCount + 1
    };
    
  } catch (error) {
    console.error("Rescheduler Agent Error (Rejection):", error);
    return { success: false, message: error.message };
  }
};

/**
 * Handle delay detection and rescheduling
 * @param {String} faultId - Fault ID
 */
export const handleDelay = async (faultId) => {
  try {
    const fault = await Fault.findById(faultId).populate("assignedTo");
    if (!fault || !fault.assignedTo) {
      return { success: false, message: "Fault or technician not found" };
    }
    
    // Check if ETA has passed
    if (!fault.eta || new Date() < new Date(fault.eta)) {
      return { success: false, message: "No delay detected" };
    }
    
    const delayMinutes = Math.floor((new Date() - new Date(fault.eta)) / 60000);
    
    if (delayMinutes < DELAY_THRESHOLD) {
      // Minor delay - just notify
      await createNotification({
        recipient: fault.assignedTo._id,
        type: "status_update",
        title: "Delayed Fault",
        message: `You are ${delayMinutes} minutes late. Please update status.`,
        faultId
      });
      
      return {
        success: true,
        action: "notified",
        delayMinutes
      };
    }
    
    // Significant delay - consider reassignment
    if (fault.reassignmentCount < MAX_REASSIGNMENT_ATTEMPTS) {
      // Check if we can assign a backup technician
      const backup = await findBestTechnician(fault, {
        excludeTechnicianId: fault.assignedTo._id
      });
      
      if (backup.success && backup.technician.distance < 5) {
        // Backup available nearby - reassign
        await handleReassignment(faultId, fault.assignedTo._id, backup.technician.id, "Significant delay");
        
        return {
          success: true,
          action: "reassigned",
          delayMinutes,
          newTechnician: backup.technician
        };
      }
    }
    
    // Cannot reassign - escalate
    await escalateToAdmin(fault, `Technician delayed by ${delayMinutes} minutes`);
    
    return {
      success: true,
      action: "escalated",
      delayMinutes
    };
    
  } catch (error) {
    console.error("Rescheduler Agent Error (Delay):", error);
    return { success: false, message: error.message };
  }
};

/**
 * Force reassignment of a fault
 * @param {String} faultId - Fault ID
 * @param {String} fromTechnicianId - Current technician
 * @param {String} toTechnicianId - New technician
 * @param {String} reason - Reassignment reason
 */
export const handleReassignment = async (faultId, fromTechnicianId, toTechnicianId, reason) => {
  try {
    // Update old technician
    await User.findByIdAndUpdate(fromTechnicianId, {
      $inc: { currentWorkload: -1 }
    });
    
    // Assign to new technician
    await assignTechnicianToFault(faultId, toTechnicianId);
    
    // Update fault
    await Fault.findByIdAndUpdate(faultId, {
      reassignmentCount: { $inc: 1 },
      reassignmentReason: reason
    });
    
    // Notify both technicians
    await createNotification({
      recipient: fromTechnicianId,
      type: "fault_rejected",
      title: "Fault Reassigned",
      message: `Fault has been reassigned to another technician.`,
      faultId
    });
    
    await createNotification({
      recipient: toTechnicianId,
      type: "fault_assigned",
      title: "New Fault Assigned",
      message: `Fault reassigned to you. Reason: ${reason}`,
      faultId
    });
    
    global.io.emit("faultReassigned", {
      faultId,
      previousTechnician: fromTechnicianId,
      newTechnician: toTechnicianId,
      reason
    });
    
    return { success: true, message: "Reassignment completed" };
    
  } catch (error) {
    console.error("Rescheduler Agent Error (Reassignment):", error);
    return { success: false, message: error.message };
  }
};

/**
 * Escalate fault to admin
 */
const escalateToAdmin = async (fault, reason) => {
  // Find admin users
  const admins = await User.find({ role: "admin" });
  
  // Notify all admins
  for (const admin of admins) {
    await createNotification({
      recipient: admin._id,
      type: "system",
      title: "Fault Requires Attention",
      message: `Fault ${fault._id} requires manual intervention. Reason: ${reason}`,
      faultId: fault._id
    });
  }
  
  // Emit to admin dashboard
  global.io.emit("faultEscalated", {
    faultId: fault._id,
    reason,
    requiresAction: true
  });
};

/**
 * Monitor all active faults for delays
 * This can be run as a cron job
 */
export const monitorDelays = async () => {
  const activeFaults = await Fault.find({
    status: { $in: ["assigned", "in_progress"] },
    eta: { $lt: new Date() }
  });
  
  const results = [];
  for (const fault of activeFaults) {
    const result = await handleDelay(fault._id);
    results.push({ faultId: fault._id, ...result });
  }
  
  return results;
};

/**
 * Get faults requiring attention
 */
export const getFaultsRequiringAttention = async () => {
  return await Fault.find({
    $or: [
      { status: "on_hold" },
      { reassignmentCount: { $gte: MAX_REASSIGNMENT_ATTEMPTS } },
      { status: "assigned", eta: { $lt: new Date(Date.now() - DELAY_THRESHOLD * 60000) } }
    ]
  }).populate("assignedTo", "name");
};

export default {
  handleRejection,
  handleDelay,
  handleReassignment,
  monitorDelays,
  getFaultsRequiringAttention
};
