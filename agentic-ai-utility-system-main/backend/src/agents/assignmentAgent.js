/**
 * Assignment Agent
 * Assigns best technician using:
 * - Distance (Haversine formula)
 * - Skill matching
 * - Current workload
 * - Rating
 * Output: technician ID + ETA
 */

import User from "../models/User.js";

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} loc1 - { lat, lng }
 * @param {Object} loc2 - { lat, lng }
 * @returns {Number} - Distance in kilometers
 */
export const calculateDistance = (loc1, loc2) => {
  if (!loc1 || !loc2 || !loc1.lat || !loc2.lat) return Infinity;
  
  const R = 6371; // Earth's radius in kilometers
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

/**
 * Calculate skill match score between technician and fault
 * @param {Array} technicianSkills - Array of technician skills
 * @param {String} faultCategory - Fault category
 * @returns {Number} - Match score (0-1)
 */
const calculateSkillMatch = (technicianSkills, faultCategory) => {
  if (!technicianSkills || technicianSkills.length === 0) return 0.5;
  
  const categoryToSkills = {
    electricity: ["electrical", "wiring", "power", "electrician"],
    water: ["plumbing", "water", "pipe", "plumber"],
    road: ["construction", "roadwork", "asphalt", "civil"],
    streetlight: ["electrical", "lighting", "maintenance"],
    sewage: ["plumbing", "sewage", "drainage", "sanitation"],
    gas: ["gas", "pipeline", "safety"],
    other: ["general", "maintenance"]
  };
  
  const relevantSkills = categoryToSkills[faultCategory] || categoryToSkills.other;
  const matches = technicianSkills.filter(skill => 
    relevantSkills.some(rs => skill.toLowerCase().includes(rs.toLowerCase()))
  );
  
  return matches.length > 0 ? Math.min(1, 0.5 + (matches.length * 0.25)) : 0.3;
};

/**
 * Calculate workload score (lower workload = higher score)
 * @param {Number} currentWorkload - Current number of assigned tasks
 * @returns {Number} - Score (0-1)
 */
const calculateWorkloadScore = (currentWorkload) => {
  if (currentWorkload === 0) return 1;
  if (currentWorkload >= 5) return 0.1;
  return 1 - (currentWorkload * 0.18);
};

/**
 * Calculate technician score for a specific fault
 * @param {Object} technician - Technician user object
 * @param {Object} fault - Fault object
 * @returns {Object} - Score details
 */
const calculateTechnicianScore = (technician, fault) => {
  // Distance score (closer is better, max 40 points)
  const distance = calculateDistance(technician.location, fault.location);
  const distanceScore = Math.max(0, 40 - (distance * 2)); // -2 points per km
  
  // Skill match score (max 30 points)
  const skillMatch = calculateSkillMatch(technician.skills, fault.type);
  const skillScore = skillMatch * 30;
  
  // Workload score (max 20 points)
  const workloadScore = calculateWorkloadScore(technician.currentWorkload) * 20;
  
  // Rating score (max 10 points)
  const ratingScore = (technician.rating / 5) * 10;
  
  const totalScore = distanceScore + skillScore + workloadScore + ratingScore;
  
  // Calculate ETA (estimated time of arrival)
  // Assuming average speed of 30 km/h in city
  const etaMinutes = Math.round((distance / 30) * 60) + 15; // +15 min preparation
  
  return {
    technicianId: technician._id,
    name: technician.name,
    totalScore,
    breakdown: {
      distanceScore,
      skillScore,
      workloadScore,
      ratingScore
    },
    distance: parseFloat(distance.toFixed(2)),
    eta: etaMinutes,
    skills: technician.skills,
    currentWorkload: technician.currentWorkload,
    rating: technician.rating
  };
};

/**
 * Find and assign the best technician for a fault
 * @param {Object} fault - Fault object
 * @param {Object} options - Options { excludeTechnicianId }
 * @returns {Object} - Assignment result
 */
export const findBestTechnician = async (fault, options = {}) => {
  const { excludeTechnicianId } = options;
  
  try {
    // Find available technicians with location data
    const query = {
      role: "technician",
      isAvailable: true
    };
    
    if (excludeTechnicianId) {
      query._id = { $ne: excludeTechnicianId };
    }
    
    const technicians = await User.find(query);
    
    if (technicians.length === 0) {
      return {
        success: false,
        message: "No available technicians found",
        technician: null
      };
    }
    
    // Score all technicians
    const scoredTechnicians = technicians
      .map(tech => calculateTechnicianScore(tech, fault))
      .sort((a, b) => b.totalScore - a.totalScore);
    
    // Get the best match
    const bestMatch = scoredTechnicians[0];
    
    if (bestMatch.totalScore < 20) {
      return {
        success: false,
        message: "No suitable technician found (score too low)",
        alternatives: scoredTechnicians.slice(0, 3),
        technician: null
      };
    }
    
    return {
      success: true,
      technician: {
        id: bestMatch.technicianId,
        name: bestMatch.name,
        eta: bestMatch.eta,
        etaFormatted: formatETA(bestMatch.eta),
        distance: bestMatch.distance,
        rating: bestMatch.rating
      },
      allOptions: scoredTechnicians,
      reasoning: `Selected based on distance (${bestMatch.distance}km), skill match, and workload`
    };
    
  } catch (error) {
    console.error("Assignment Agent Error:", error);
    return {
      success: false,
      message: error.message,
      technician: null
    };
  }
};

/**
 * Assign technician to fault and update records
 * @param {String} faultId - Fault ID
 * @param {String} technicianId - Technician ID
 * @param {Object} assignmentData - Additional assignment data
 */
export const assignTechnicianToFault = async (faultId, technicianId, assignmentData = {}) => {
  const Fault = (await import("../models/Fault.js")).default;
  
  const { eta } = assignmentData;
  
  const updatedFault = await Fault.findByIdAndUpdate(
    faultId,
    {
      assignedTo: technicianId,
      assignedAt: new Date(),
      status: "assigned",
      eta: eta ? new Date(Date.now() + eta * 60000) : null
    },
    { new: true }
  );
  
  // Increment technician workload
  await User.findByIdAndUpdate(technicianId, {
    $inc: { currentWorkload: 1 }
  });
  
  return updatedFault;
};

/**
 * Format ETA in human-readable format
 */
const formatETA = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Get nearby technicians for a location
 */
export const getNearbyTechnicians = async (location, radius = 10) => {
  const technicians = await User.find({
    role: "technician",
    isAvailable: true
  });
  
  return technicians
    .map(tech => ({
      ...tech.toObject(),
      distance: calculateDistance(tech.location, location)
    }))
    .filter(tech => tech.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
};

export default {
  findBestTechnician,
  assignTechnicianToFault,
  calculateDistance,
  getNearbyTechnicians
};
