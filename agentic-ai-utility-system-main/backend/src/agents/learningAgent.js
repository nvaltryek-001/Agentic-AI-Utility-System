/**
 * Learning Agent
 * Learns from:
 * - Past repairs
 * - Resolution time
 * - Technician performance
 * - Fault patterns
 * Improves future decisions
 */

import Fault from "../models/Fault.js";
import User from "../models/User.js";

// In-memory learning data (in production, use a separate database collection)
let learningData = {
  categoryPatterns: {},
  technicianPerformance: {},
  resolutionTimePatterns: {},
  areaRiskScores: {}
};

/**
 * Record a completed repair for learning
 * @param {String} faultId - Completed fault ID
 */
export const learnFromRepair = async (faultId) => {
  try {
    const fault = await Fault.findById(faultId).populate("assignedTo");
    if (!fault || fault.status !== "completed") {
      return { success: false, message: "Fault not found or not completed" };
    }
    
    const resolutionTime = calculateResolutionTime(fault);
    const technicianId = fault.assignedTo?._id?.toString();
    
    // Learn from category patterns
    updateCategoryPatterns(fault, resolutionTime);
    
    // Learn from technician performance
    if (technicianId) {
      await updateTechnicianPerformance(technicianId, fault, resolutionTime);
    }
    
    // Learn from area patterns
    updateAreaPatterns(fault, resolutionTime);
    
    // Update resolution time patterns
    updateResolutionTimePatterns(fault, resolutionTime);
    
    return {
      success: true,
      insights: generateInsights(fault, resolutionTime)
    };
    
  } catch (error) {
    console.error("Learning Agent Error:", error);
    return { success: false, message: error.message };
  }
};

/**
 * Calculate actual resolution time in hours
 */
const calculateResolutionTime = (fault) => {
  const startTime = fault.startedAt || fault.assignedAt || fault.createdAt;
  const endTime = fault.completedAt || new Date();
  return (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60); // hours
};

/**
 * Update category-based learning patterns
 */
const updateCategoryPatterns = (fault, resolutionTime) => {
  const category = fault.type;
  
  if (!learningData.categoryPatterns[category]) {
    learningData.categoryPatterns[category] = {
      count: 0,
      avgResolutionTime: 0,
      severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      commonIssues: []
    };
  }
  
  const pattern = learningData.categoryPatterns[category];
  pattern.count++;
  
  // Update average resolution time
  pattern.avgResolutionTime = 
    ((pattern.avgResolutionTime * (pattern.count - 1)) + resolutionTime) / pattern.count;
  
  // Update severity distribution
  pattern.severityDistribution[fault.severity]++;
  
  // Extract keywords from description for common issues
  if (fault.description) {
    const keywords = extractKeywords(fault.description);
    pattern.commonIssues = [...new Set([...pattern.commonIssues, ...keywords])].slice(0, 20);
  }
};

/**
 * Update technician performance metrics
 */
const updateTechnicianPerformance = async (technicianId, fault, resolutionTime) => {
  if (!learningData.technicianPerformance[technicianId]) {
    learningData.technicianPerformance[technicianId] = {
      totalTasks: 0,
      completedTasks: 0,
      avgResolutionTime: 0,
      categoryExpertise: {},
      ratingSum: 0
    };
  }
  
  const perf = learningData.technicianPerformance[technicianId];
  perf.totalTasks++;
  perf.completedTasks++;
  
  // Update average resolution time
  perf.avgResolutionTime = 
    ((perf.avgResolutionTime * (perf.completedTasks - 1)) + resolutionTime) / perf.completedTasks;
  
  // Update category expertise
  const category = fault.type;
  if (!perf.categoryExpertise[category]) {
    perf.categoryExpertise[category] = { count: 0, avgTime: 0 };
  }
  const catExp = perf.categoryExpertise[category];
  catExp.count++;
  catExp.avgTime = ((catExp.avgTime * (catExp.count - 1)) + resolutionTime) / catExp.count;
  
  // Update technician rating in database
  if (fault.citizenFeedback?.rating) {
    perf.ratingSum += fault.citizenFeedback.rating;
    const newRating = perf.ratingSum / perf.completedTasks;
    
    await User.findByIdAndUpdate(technicianId, {
      rating: parseFloat(newRating.toFixed(2)),
      totalCompleted: perf.completedTasks
    });
  }
};

/**
 * Update area-based risk patterns
 */
const updateAreaPatterns = (fault, resolutionTime) => {
  // Create area key based on location (rounded to 2 decimal places ~ 1km precision)
  const lat = Math.round(fault.location.lat * 100) / 100;
  const lng = Math.round(fault.location.lng * 100) / 100;
  const areaKey = `${lat},${lng}`;
  
  if (!learningData.areaRiskScores[areaKey]) {
    learningData.areaRiskScores[areaKey] = {
      faultCount: 0,
      avgResolutionTime: 0,
      categories: {},
      lastFaultDate: null
    };
  }
  
  const area = learningData.areaRiskScores[areaKey];
  area.faultCount++;
  area.avgResolutionTime = 
    ((area.avgResolutionTime * (area.faultCount - 1)) + resolutionTime) / area.faultCount;
  
  const category = fault.type;
  area.categories[category] = (area.categories[category] || 0) + 1;
  area.lastFaultDate = new Date();
};

/**
 * Update resolution time patterns
 */
const updateResolutionTimePatterns = (fault, resolutionTime) => {
  const hour = new Date(fault.createdAt).getHours();
  const timeSlot = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  
  if (!learningData.resolutionTimePatterns[timeSlot]) {
    learningData.resolutionTimePatterns[timeSlot] = {
      count: 0,
      avgTime: 0
    };
  }
  
  const pattern = learningData.resolutionTimePatterns[timeSlot];
  pattern.count++;
  pattern.avgTime = ((pattern.avgTime * (pattern.count - 1)) + resolutionTime) / pattern.count;
};

/**
 * Extract keywords from description
 */
const extractKeywords = (description) => {
  const stopWords = ["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "in", "on", "at", "to", "for", "of", "with", "by"];
  
  return description
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 5);
};

/**
 * Generate insights from a completed repair
 */
const generateInsights = (fault, resolutionTime) => {
  const category = fault.type;
  const categoryPattern = learningData.categoryPatterns[category];
  
  const insights = [];
  
  if (categoryPattern) {
    const avgTime = categoryPattern.avgResolutionTime;
    if (resolutionTime < avgTime * 0.8) {
      insights.push(`Fast resolution: ${resolutionTime.toFixed(1)}h vs avg ${avgTime.toFixed(1)}h`);
    } else if (resolutionTime > avgTime * 1.5) {
      insights.push(`Slow resolution: ${resolutionTime.toFixed(1)}h vs avg ${avgTime.toFixed(1)}h`);
    }
  }
  
  return insights;
};

/**
 * Get predictions for a new fault
 * @param {Object} faultData - New fault data
 */
export const predictResolution = (faultData) => {
  const category = faultData.type;
  const categoryPattern = learningData.categoryPatterns[category];
  
  if (!categoryPattern) {
    return {
      predictedHours: getDefaultPrediction(faultData),
      confidence: "low",
      basedOn: "default"
    };
  }
  
  let predictedHours = categoryPattern.avgResolutionTime;
  
  // Adjust based on severity
  const severityMultiplier = {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
    critical: 1.8
  };
  predictedHours *= severityMultiplier[faultData.severity] || 1.0;
  
  // Adjust based on time of day
  const hour = new Date().getHours();
  const timeSlot = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const timePattern = learningData.resolutionTimePatterns[timeSlot];
  if (timePattern) {
    predictedHours = (predictedHours + timePattern.avgTime) / 2;
  }
  
  return {
    predictedHours: Math.round(predictedHours),
    confidence: categoryPattern.count > 10 ? "high" : categoryPattern.count > 5 ? "medium" : "low",
    basedOn: `${categoryPattern.count} similar repairs`,
    categoryAverage: Math.round(categoryPattern.avgResolutionTime)
  };
};

/**
 * Get default prediction based on category
 */
const getDefaultPrediction = (faultData) => {
  const defaults = {
    electricity: 4,
    gas: 2,
    water: 6,
    sewage: 8,
    road: 24,
    streetlight: 12,
    other: 12
  };
  return defaults[faultData.type] || 12;
};

/**
 * Get best technician recommendation based on learning
 */
export const recommendTechnician = (faultData, availableTechnicians) => {
  const category = faultData.type;
  
  const scoredTechnicians = availableTechnicians.map(tech => {
    const techId = tech._id.toString();
    const perf = learningData.technicianPerformance[techId];
    
    let score = 0;
    let reasons = [];
    
    if (perf) {
      // Category expertise bonus
      if (perf.categoryExpertise[category]) {
        const catPerf = perf.categoryExpertise[category];
        score += catPerf.count * 10;
        score += (1 / catPerf.avgTime) * 50; // Faster is better
        reasons.push(`Expert in ${category}: ${catPerf.count} tasks`);
      }
      
      // General performance
      score += (perf.ratingSum / perf.completedTasks) * 10;
      score += (1 / perf.avgResolutionTime) * 30;
    }
    
    return {
      technician: tech,
      score,
      reasons
    };
  });
  
  return scoredTechnicians.sort((a, b) => b.score - a.score);
};

/**
 * Get high-risk areas for predictive maintenance
 */
export const getHighRiskAreas = (threshold = 5) => {
  return Object.entries(learningData.areaRiskScores)
    .filter(([_, data]) => data.faultCount >= threshold)
    .map(([areaKey, data]) => ({
      area: areaKey,
      ...data,
      riskScore: calculateRiskScore(data)
    }))
    .sort((a, b) => b.riskScore - a.riskScore);
};

/**
 * Calculate risk score for an area
 */
const calculateRiskScore = (areaData) => {
  const recencyBonus = areaData.lastFaultDate && 
    (new Date() - new Date(areaData.lastFaultDate)) < (7 * 24 * 60 * 60 * 1000) ? 2 : 1;
  
  return areaData.faultCount * recencyBonus;
};

/**
 * Get learning statistics
 */
export const getLearningStats = () => {
  const totalRepairs = Object.values(learningData.technicianPerformance)
    .reduce((sum, perf) => sum + perf.completedTasks, 0);
  
  const categoryStats = Object.entries(learningData.categoryPatterns)
    .map(([cat, data]) => ({
      category: cat,
      count: data.count,
      avgResolutionTime: Math.round(data.avgResolutionTime * 10) / 10,
      mostCommonSeverity: Object.entries(data.severityDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown"
    }));
  
  return {
    totalRepairs,
    categoryStats,
    highRiskAreas: getHighRiskAreas(3).slice(0, 5),
    timePatterns: learningData.resolutionTimePatterns
  };
};

/**
 * Initialize learning data from historical repairs
 */
export const initializeLearning = async () => {
  const completedFaults = await Fault.find({
    status: "completed",
    completedAt: { $exists: true }
  }).populate("assignedTo");
  
  for (const fault of completedFaults) {
    await learnFromRepair(fault._id);
  }
  
  console.log(`Learning Agent initialized with ${completedFaults.length} historical repairs`);
  return { initialized: true, count: completedFaults.length };
};

/**
 * Train model on full dataset (320+ records)
 * Comprehensive training with all fault statuses
 */
export const trainModel = async () => {
  console.log("\n🤖 Starting AI Model Training...\n");
  
  // Get all faults for comprehensive training
  const allFaults = await Fault.find({}).populate("assignedTo");
  console.log(`📊 Training on ${allFaults.length} fault records...\n`);
  
  let trained = 0;
  let failed = 0;
  
  // Training stats
  const trainingStats = {
    byType: {},
    bySeverity: {},
    byStatus: {},
    technicianStats: {},
    resolutionTimeTotal: 0,
    completedCount: 0
  };
  
  for (const fault of allFaults) {
    try {
      // Update category patterns for ALL faults (not just completed)
      const resolutionTime = fault.status === "completed" 
        ? calculateResolutionTime(fault)
        : predictResolution(fault).predictedHours;
      
      updateCategoryPatterns(fault, resolutionTime);
      updateAreaPatterns(fault, resolutionTime);
      updateResolutionTimePatterns(fault, resolutionTime);
      
      // Update technician stats for assigned faults
      if (fault.assignedTo) {
        const techId = fault.assignedTo._id.toString();
        if (!trainingStats.technicianStats[techId]) {
          trainingStats.technicianStats[techId] = {
            name: fault.assignedTo.name,
            totalAssigned: 0,
            completed: 0,
            categories: {}
          };
        }
        trainingStats.technicianStats[techId].totalAssigned++;
        trainingStats.technicianStats[techId].categories[fault.type] = 
          (trainingStats.technicianStats[techId].categories[fault.type] || 0) + 1;
        
        if (fault.status === "completed") {
          trainingStats.technicianStats[techId].completed++;
          await updateTechnicianPerformance(techId, fault, resolutionTime);
          trainingStats.resolutionTimeTotal += resolutionTime;
          trainingStats.completedCount++;
        }
      }
      
      // Update stats
      trainingStats.byType[fault.type] = (trainingStats.byType[fault.type] || 0) + 1;
      trainingStats.bySeverity[fault.severity] = (trainingStats.bySeverity[fault.severity] || 0) + 1;
      trainingStats.byStatus[fault.status] = (trainingStats.byStatus[fault.status] || 0) + 1;
      
      trained++;
    } catch (error) {
      failed++;
      console.error(`Training error for fault ${fault._id}:`, error.message);
    }
  }
  
  // Calculate derived metrics
  const avgResolutionTime = trainingStats.completedCount > 0 
    ? trainingStats.resolutionTimeTotal / trainingStats.completedCount 
    : 0;
  
  console.log("✅ Training Complete!\n");
  console.log("=".repeat(60));
  console.log("📈 TRAINING RESULTS");
  console.log("=".repeat(60));
  console.log(`Total Records Processed: ${trained}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nAverage Resolution Time: ${avgResolutionTime.toFixed(2)} hours`);
  console.log(`\nCategory Patterns Learned: ${Object.keys(learningData.categoryPatterns).length}`);
  console.log(`Technician Profiles: ${Object.keys(learningData.technicianPerformance).length}`);
  console.log(`High-Risk Areas: ${Object.keys(learningData.areaRiskScores).length}`);
  
  return {
    success: true,
    trained,
    failed,
    stats: trainingStats,
    learningData: {
      categories: Object.keys(learningData.categoryPatterns),
      technicians: Object.keys(learningData.technicianPerformance).length,
      areas: Object.keys(learningData.areaRiskScores).length
    },
    metrics: {
      avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
      categoryPatterns: learningData.categoryPatterns,
      timePatterns: learningData.resolutionTimePatterns
    }
  };
};

/**
 * Get AI model insights and predictions
 */
export const getModelInsights = () => {
  const insights = {
    categoryInsights: [],
    technicianRankings: [],
    riskAreas: [],
    timePatterns: []
  };
  
  // Category insights
  for (const [category, data] of Object.entries(learningData.categoryPatterns)) {
    const totalSeverity = Object.values(data.severityDistribution).reduce((a, b) => a + b, 0);
    insights.categoryInsights.push({
      category,
      totalCases: data.count,
      avgResolutionTime: Math.round(data.avgResolutionTime * 10) / 10,
      severityBreakdown: {
        critical: Math.round((data.severityDistribution.critical / totalSeverity) * 100) || 0,
        high: Math.round((data.severityDistribution.high / totalSeverity) * 100) || 0,
        medium: Math.round((data.severityDistribution.medium / totalSeverity) * 100) || 0,
        low: Math.round((data.severityDistribution.low / totalSeverity) * 100) || 0
      },
      commonIssues: data.commonIssues.slice(0, 5)
    });
  }
  
  // Technician rankings
  insights.technicianRankings = Object.entries(learningData.technicianPerformance)
    .map(([id, perf]) => ({
      id,
      totalTasks: perf.totalTasks,
      completedTasks: perf.completedTasks,
      avgResolutionTime: Math.round(perf.avgResolutionTime * 10) / 10,
      rating: perf.completedTasks > 0 ? (perf.ratingSum / perf.completedTasks).toFixed(2) : "N/A",
      expertise: Object.entries(perf.categoryExpertise)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([cat, data]) => ({ category: cat, tasks: data.count }))
    }))
    .sort((a, b) => b.completedTasks - a.completedTasks);
  
  // Risk areas
  insights.riskAreas = getHighRiskAreas(3).slice(0, 10);
  
  // Time patterns
  insights.timePatterns = Object.entries(learningData.resolutionTimePatterns)
    .map(([slot, data]) => ({
      timeSlot: slot,
      avgResolutionTime: Math.round(data.avgTime * 10) / 10,
      caseCount: data.count
    }));
  
  return insights;
};

export default {
  learnFromRepair,
  predictResolution,
  recommendTechnician,
  getHighRiskAreas,
  getLearningStats,
  initializeLearning,
  trainModel,
  getModelInsights
};
