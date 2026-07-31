/**
 * Priority Decision Agent
 * Decides urgency using:
 * - Severity
 * - Population density
 * - Historical faults
 * - Time of day
 * - Weather conditions (optional)
 * Output: priority score (0-100)
 */

// Severity weights
const SEVERITY_WEIGHTS = {
  critical: 40,
  high: 30,
  medium: 20,
  low: 10
};

// Category urgency multipliers
const CATEGORY_URGENCY = {
  electricity: 1.3,
  gas: 1.4,
  water: 1.2,
  sewage: 1.1,
  road: 1.0,
  streetlight: 0.8,
  other: 0.9
};

/**
 * Calculate priority score for a fault
 * @param {Object} faultData - Fault information
 * @param {Object} historicalData - Historical fault data
 * @returns {Object} - { priorityScore, priorityLevel, reasoning }
 */
export const calculatePriority = (faultData, historicalData = {}) => {
  const { severity, category, populationDensity, location } = faultData;
  const { similarCount, averageResolutionTime } = historicalData;
  
  let score = 0;
  const reasoning = [];
  
  // Base score from severity
  const severityWeight = SEVERITY_WEIGHTS[severity] || SEVERITY_WEIGHTS.medium;
  score += severityWeight;
  reasoning.push(`Base severity (${severity}): +${severityWeight}`);
  
  // Category multiplier
  const categoryMultiplier = CATEGORY_URGENCY[category] || 1.0;
  score *= categoryMultiplier;
  reasoning.push(`Category multiplier (${category}): x${categoryMultiplier}`);
  
  // Population density factor (0-15 points)
  let densityScore = 0;
  if (populationDensity > 10000) {
    densityScore = 15;
  } else if (populationDensity > 5000) {
    densityScore = 10;
  } else if (populationDensity > 1000) {
    densityScore = 5;
  }
  score += densityScore;
  if (densityScore > 0) {
    reasoning.push(`Population density factor: +${densityScore}`);
  }
  
  // Historical pattern factor
  if (similarCount > 3) {
    score += 10;
    reasoning.push(`Multiple similar faults in area: +10`);
  }
  
  // Time of day factor
  const hour = new Date().getHours();
  if (hour >= 18 || hour <= 6) {
    // Night time - streetlight issues more urgent
    if (category === "streetlight") {
      score += 10;
      reasoning.push("Night time streetlight issue: +10");
    }
    // General night factor for safety
    if (severity === "critical" || severity === "high") {
      score += 5;
      reasoning.push("Night time critical issue: +5");
    }
  }
  
  // Cap score at 100
  score = Math.min(100, Math.round(score));
  
  // Determine priority level
  let priorityLevel;
  if (score >= 80) {
    priorityLevel = "urgent";
  } else if (score >= 60) {
    priorityLevel = "high";
  } else if (score >= 40) {
    priorityLevel = "medium";
  } else {
    priorityLevel = "low";
  }
  
  return {
    priorityScore: score,
    priorityLevel,
    reasoning,
    estimatedResolutionTime: estimateResolutionTime(score, category, averageResolutionTime),
    calculatedAt: new Date().toISOString()
  };
};

/**
 * Estimate resolution time based on priority and category
 */
const estimateResolutionTime = (priorityScore, category, historicalAvg) => {
  // Base hours by category
  const baseHours = {
    electricity: 4,
    gas: 2,
    water: 6,
    sewage: 8,
    road: 24,
    streetlight: 12,
    other: 12
  };
  
  let estimatedHours = baseHours[category] || 12;
  
  // Adjust based on priority
  if (priorityScore >= 80) {
    estimatedHours *= 0.5; // Urgent - half the time
  } else if (priorityScore >= 60) {
    estimatedHours *= 0.75; // High priority
  } else if (priorityScore <= 30) {
    estimatedHours *= 1.5; // Low priority - can wait
  }
  
  // Consider historical average if available
  if (historicalAvg) {
    estimatedHours = (estimatedHours + historicalAvg) / 2;
  }
  
  return Math.round(estimatedHours);
};

/**
 * Batch prioritize multiple faults
 */
export const batchPrioritize = (faults) => {
  return faults
    .map(fault => ({
      faultId: fault._id,
      ...calculatePriority(fault)
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
};

/**
 * Get recommended SLA time based on priority
 */
export const getSLA = (priorityLevel) => {
  const slas = {
    urgent: { hours: 2, description: "2 hours" },
    high: { hours: 8, description: "8 hours" },
    medium: { hours: 24, description: "24 hours" },
    low: { hours: 72, description: "72 hours" }
  };
  return slas[priorityLevel] || slas.medium;
};

export default {
  calculatePriority,
  batchPrioritize,
  getSLA
};
