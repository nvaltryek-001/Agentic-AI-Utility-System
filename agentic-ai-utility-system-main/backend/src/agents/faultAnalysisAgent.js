/**
 * Fault Analysis Agent
 * Analyzes fault reports (image + text + location) to determine:
 * - Fault category
 * - Severity level
 * - Confidence score
 */

import { triageReport } from "../services/aiService.js";

// Fault category keywords for text-based classification (fallback only)
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
 * Analyze a fault report.
 * 1. Ask the trained multi-agent pipeline in the AI service (category, severity, priority, safety rules).
 * 2. If the service is unreachable or times out, fall back to the keyword rules below so reporting
 *    never breaks. `source` in the result says which path was used.
 * @param {Object} data - { description, type, location, locationType, timestamp }
 */
export const analyzeFault = async (data) => {
  const { description, type, location, locationType, timestamp } = data;
  const populationDensity = estimatePopulationDensity(location);

  if (description && process.env.AI_SERVICE_DISABLED !== "true") {
    try {
      const ai = await triageReport({
        description,
        category: type,
        locationType,
        populationDensity,
        timestamp,
      });
      return {
        category: ai.category,
        severity: ai.severity,
        confidenceScore: Number(Math.min(ai.category_confidence, ai.severity_confidence).toFixed(2)),
        populationDensity,
        aiPriorityScore: ai.priority_score,
        responseSla: ai.response_sla,
        requiresHumanReview: ai.requires_human_review,
        escalations: ai.escalations,
        flags: ai.flags,
        source: "ml_agents",
        analysisTimestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn(`⚠️ AI service unavailable (${err.message}); using rule-based analysis`);
    }
  }
  return { ...ruleBasedAnalysis(description, type, populationDensity), source: "rules_fallback" };
};

/**
 * Keyword fallback (the original logic, kept for resilience).
 */
export const ruleBasedAnalysis = (description, type, populationDensity = 0) => {
  let category = type || "other";
  let severity = "medium";
  let confidenceScore = 0.5;

  if (description) {
    const descLower = description.toLowerCase();

    if (!type || type === "other") {
      for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          category = cat;
          confidenceScore += 0.2;
          break;
        }
      }
    }

    for (const [sev, indicators] of Object.entries(SEVERITY_INDICATORS)) {
      if (indicators.some(ind => descLower.includes(ind))) {
        severity = sev;
        confidenceScore += 0.15;
        break;
      }
    }

    const urgentKeywords = ["urgent", "immediate", "asap", "emergency", "dangerous", "hazard"];
    if (urgentKeywords.some(kw => descLower.includes(kw))) {
      severity = severity === "low" ? "medium" : severity === "medium" ? "high" : "critical";
      confidenceScore += 0.1;
    }
  }

  if (populationDensity > 1000 && severity === "low") {
    severity = "medium";
  } else if (populationDensity > 5000 && severity !== "critical") {
    severity = severity === "medium" ? "high" : "critical";
  }

  return {
    category,
    severity,
    confidenceScore: parseFloat(Math.min(confidenceScore, 0.95).toFixed(2)),
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
 * Count similar faults reported nearby in the last 30 days and their average resolution time.
 * The Fault model is imported lazily so this module stays usable without a database (tests, fallback).
 */
export const checkHistoricalFaults = async (location, category, radiusKm = 1) => {
  const empty = { similarCount: 0, recentTrend: "stable", averageResolutionTime: null };
  if (!location?.lat || !location?.lng || !category) return empty;
  try {
    const { default: Fault } = await import("../models/Fault.js");
    const dLat = radiusKm / 111;
    const dLng = radiusKm / (111 * Math.cos((location.lat * Math.PI) / 180));
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const nearby = await Fault.find({
      type: category,
      createdAt: { $gte: since },
      "location.lat": { $gte: location.lat - dLat, $lte: location.lat + dLat },
      "location.lng": { $gte: location.lng - dLng, $lte: location.lng + dLng },
    }).select("createdAt completedAt").lean();

    const resolved = nearby.filter(f => f.completedAt);
    const avgHours = resolved.length
      ? resolved.reduce((sum, f) => sum + (new Date(f.completedAt) - new Date(f.createdAt)), 0) / resolved.length / 3.6e6
      : null;
    const halfway = Date.now() - 15 * 24 * 3600 * 1000;
    const recent = nearby.filter(f => new Date(f.createdAt) >= halfway).length;
    const older = nearby.length - recent;
    return {
      similarCount: nearby.length,
      recentTrend: recent > older ? "increasing" : recent < older ? "decreasing" : "stable",
      averageResolutionTime: avgHours === null ? null : Math.round(avgHours),
    };
  } catch (err) {
    return empty;
  }
};

export default {
  analyzeFault,
  ruleBasedAnalysis,
  analyzeImage,
  checkHistoricalFaults
};
