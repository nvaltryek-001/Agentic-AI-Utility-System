/**
 * Client for the Python AI service (ai-service/main.py).
 * Uses the built-in fetch (Node 18+) with a timeout so a slow or missing
 * AI service never blocks fault creation - callers fall back to rules.
 */

const baseUrl = () => (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const timeoutMs = () => Number(process.env.AI_SERVICE_TIMEOUT || 4000);

const post = async (path, body) => {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!res.ok) {
    throw new Error(`AI service ${path} responded ${res.status}`);
  }
  return res.json();
};

/**
 * Multi-agent triage of a citizen report.
 * @returns {Promise<{category, category_confidence, severity, severity_confidence, priority_score,
 *   response_sla, requires_human_review, escalations, flags, trace}>}
 */
export const triageReport = ({ description, category, locationType, timeOfDay, populationDensity, timestamp }) =>
  post("/agents/triage", {
    description,
    category: category && category !== "other" ? category : undefined,
    location_type: locationType,
    time_of_day: timeOfDay,
    population_density: populationDensity,
    timestamp,
  });

/**
 * Sensor anomaly detection for a single normalised reading (0-100).
 * @returns {Promise<{fault: boolean, severity?: string, anomaly_score: number}>}
 */
export const analyzeSensorData = (value, { utility = "electricity", recentValues, hourOfDay } = {}) =>
  post("/predict", {
    sensor_value: Number(value),
    utility,
    recent_values: recentValues,
    hour_of_day: hourOfDay,
  });

export default { triageReport, analyzeSensorData };
