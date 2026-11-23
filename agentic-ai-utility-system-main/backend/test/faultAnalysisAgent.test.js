import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { analyzeFault, ruleBasedAnalysis, checkHistoricalFaults } from "../src/agents/faultAnalysisAgent.js";
import { analyzeSensorData } from "../src/services/aiService.js";

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; delete process.env.AI_SERVICE_DISABLED; });

const mockFetch = (payload, status = 200) => {
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok: status < 400, status, json: async () => payload };
  };
  return calls;
};

test("uses the ML triage agents when the AI service answers", async () => {
  const calls = mockFetch({
    category: "electricity", category_confidence: 0.97, severity: "critical", severity_confidence: 0.91,
    priority_score: 96, response_sla: "< 30 minutes", requires_human_review: false,
    escalations: ["exposed live conductor"], flags: [],
  });
  const out = await analyzeFault({ description: "live wire sparking near school", type: "electricity",
                                   location: { lat: 28.61, lng: 77.21 } });
  assert.equal(out.source, "ml_agents");
  assert.equal(out.severity, "critical");
  assert.equal(out.confidenceScore, 0.91);
  assert.deepEqual(out.escalations, ["exposed live conductor"]);
  assert.match(calls[0].url, /\/agents\/triage$/);
  assert.equal(calls[0].body.category, "electricity");
  assert.ok(calls[0].body.population_density > 0);
});

test("does not forward the placeholder category 'other'", async () => {
  const calls = mockFetch({ category: "water", category_confidence: 0.9, severity: "low",
                            severity_confidence: 0.8, flags: [], escalations: [] });
  await analyzeFault({ description: "tap is broken", type: "other" });
  assert.equal(calls[0].body.category, undefined);
});

test("falls back to keyword rules when the AI service is down", async () => {
  global.fetch = async () => { throw new Error("ECONNREFUSED"); };
  const out = await analyzeFault({ description: "big pothole on the road", type: "other" });
  assert.equal(out.source, "rules_fallback");
  assert.equal(out.category, "road");
});

test("falls back on HTTP errors and when disabled", async () => {
  mockFetch({ detail: "boom" }, 500);
  assert.equal((await analyzeFault({ description: "gas smell", type: "gas" })).source, "rules_fallback");
  process.env.AI_SERVICE_DISABLED = "true";
  global.fetch = async () => assert.fail("should not call the service");
  assert.equal((await analyzeFault({ description: "gas smell", type: "gas" })).source, "rules_fallback");
});

test("rule fallback escalates urgent keywords and dense areas", () => {
  assert.equal(ruleBasedAnalysis("small leak, urgent", "water", 0).severity, "high");
  assert.equal(ruleBasedAnalysis("small leak", "water", 6000).severity, "high");
});

test("sensor client sends a JSON body", async () => {
  const calls = mockFetch({ fault: true, severity: "high", anomaly_score: 0.9 });
  const out = await analyzeSensorData(91, { utility: "water", recentValues: [45, 46], hourOfDay: 3 });
  assert.equal(out.fault, true);
  assert.deepEqual(calls[0].body, { sensor_value: 91, utility: "water", recent_values: [45, 46], hour_of_day: 3 });
});

test("historical lookup degrades gracefully without location", async () => {
  assert.deepEqual(await checkHistoricalFaults(null, "water"),
                   { similarCount: 0, recentTrend: "stable", averageResolutionTime: null });
});
