/**
 * Fault Analysis Agent
 * Analyzes fault reports (image + text + location) to determine:
 * - Fault category
 * - Severity level
 * - Confidence score
 */

// Fault category keywords for text-based classification
const CATEGORY_KEYWORDS = {
  electricity: ["power", "electric", "wire", "cable", "transformer", "outage", "blackout", "spark", "fuse", "voltage"],
  water: ["water", "leak", "pipe", "flood", "burst", "sewage", "drain", "tap", "main", "hydrant"],
  road: ["pothole", "road", "street", "crack", "damage", "broken", "asphalt", "pavement", "sinkhole"],
  streetlight: ["light", "lamp", "streetlight", "pole", "dark", "bulb", "illumination", "night"],
  sewage: ["sewage", "drain", "manhole", "waste", "sewer", "clogged", "overflow"],
  gas: ["gas", "leak", "pipeline", "smell", "odor", "valve"]
};

// Severity indicators
const SEVERITY_INDICATORS = {
  critical: ["hospital", "school", "emergency", "fire", "explosion", "electrocution", "major", "severe", "dangerous", "life-threatening"],
  high: ["busy", "main road", "highway", "intersection", "traffic", "commercial", "market"],
  medium: ["residential", "minor", "small", "local"],
  low: ["park", "empty", "closed", "backup available"]
};

/**
 * Analyze fault based on text description and location
 * @param {Object} data - { description, type, location }
 * @returns {Object} - { category, severity, confidenceScore }
 */
export const analyzeFault = async (data) => {
  const { description, type, location } = data;
  
  let category = type || "other";
  let severity = "medium";
  let confidenceScore = 0.5;
  
  // Text-based analysis
  if (description) {
    const descLower = description.toLowerCase();
    
    // Determine category from description if not provided
    if (!type || type === "other") {
      for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          category = cat;
          confidenceScore += 0.2;
          break;
        }
      }
    }
    
    // Determine severity from description
    for (const [sev, indicators] of Object.entries(SEVERITY_INDICATORS)) {
      if (indicators.some(ind => descLower.includes(ind))) {
        severity = sev;
        confidenceScore += 0.15;
        break;
      }
    }
    
    // Check for urgent keywords
    const urgentKeywords = ["urgent", "immediate", "asap", "emergency", "dangerous", "hazard"];
    if (urgentKeywords.some(kw => descLower.includes(kw))) {
      severity = severity === "low" ? "medium" : severity === "medium" ? "high" : "critical";
      confidenceScore += 0.1;
    }
  }
  
  // Location-based severity adjustment (mock population density)
  const populationDensity = estimatePopulationDensity(location);
  if (populationDensity > 1000 && severity === "low") {
    severity = "medium";
  } else if (populationDensity > 5000 && severity !== "critical") {
    severity = severity === "medium" ? "high" : "critical";
  }
  
  // Cap confidence score
  confidenceScore = Math.min(confidenceScore, 0.95);
  
  return {
    category,
    severity,
    confidenceScore: parseFloat(confidenceScore.toFixed(2)),
    populationDensity,
    analysisTimestamp: new Date().toISOString()
  };
};

/**
 * Analyze image for fault detection (placeholder for ML model)
 * In production, this would call a Python ML service with TensorFlow/OpenCV
 */
export const analyzeImage = async (imageUrl) => {
  // Placeholder for image analysis
  // In production: Call Python AI service for image classification
  return {
    detectedObjects: [],
    confidence: 0,
    requiresHumanReview: true
  };
};

/**
 * Estimate population density based on location coordinates
 * This is a mock function - in production, use actual demographic data
 */
const estimatePopulationDensity = (location) => {
  if (!location || !location.lat || !location.lng) return 0;
  
  // Mock density calculation based on coordinates
  // In a real system, this would query a demographics database
  const lat = location.lat;
  const lng = location.lng;
  
  // Simulate city center having higher density
  const cityCenterLat = 28.6; // Example: Delhi center
  const cityCenterLng = 77.2;
  
  const distanceFromCenter = Math.sqrt(
    Math.pow(lat - cityCenterLat, 2) + Math.pow(lng - cityCenterLng, 2)
  );
  
  // Higher density closer to center (mock logic)
  const density = Math.max(0, Math.round((0.5 - distanceFromCenter) * 20000));
  return Math.max(100, density); // Minimum 100 people per sq km
};

/**
 * Check for similar historical faults in the area
 */
export const checkHistoricalFaults = async (location, category, radius = 1) => {
  // This would query the database for similar faults
  // Returns count of similar faults in the radius (km)
  // Placeholder implementation
  return {
    similarCount: Math.floor(Math.random() * 5),
    recentTrend: "increasing", // increasing, decreasing, stable
    averageResolutionTime: Math.floor(Math.random() * 48) + 2 // hours
  };
};

export default {
  analyzeFault,
  analyzeImage,
  checkHistoricalFaults
};
