"""
Rule-based baselines = the logic the project used *before* the trained models.

- `keyword_category` is a faithful port of CATEGORY_KEYWORDS in
  backend/src/agents/faultAnalysisAgent.js (first matching category wins).
- `rule_severity` is a port of the hand-tuned scorer that lived in the old
  ai-service/main.py `/predict-severity` endpoint.

They are kept so every evaluation reports "trained model vs. what we had".
"""
from __future__ import annotations

CATEGORY_KEYWORDS = {
    "electricity": ["power", "electric", "wire", "cable", "transformer", "outage", "blackout", "spark", "fuse",
                    "voltage"],
    "water": ["water", "leak", "pipe", "flood", "burst", "sewage", "drain", "tap", "main", "hydrant"],
    "road": ["pothole", "road", "street", "crack", "damage", "broken", "asphalt", "pavement", "sinkhole"],
    "streetlight": ["light", "lamp", "streetlight", "pole", "dark", "bulb", "illumination", "night"],
    "sewage": ["sewage", "drain", "manhole", "waste", "sewer", "clogged", "overflow"],
    "gas": ["gas", "leak", "pipeline", "smell", "odor", "valve"],
}


def keyword_category(description: str) -> str:
    text = (description or "").lower()
    for category, words in CATEGORY_KEYWORDS.items():
        if any(w in text for w in words):
            return category
    return "other"


_CATEGORY_SCORES = {"gas": 35, "electricity": 30, "water": 20, "sewage": 15, "road": 12, "streetlight": 5}
_LOCATION_MULT = {"hospital": 1.5, "school": 1.4, "commercial": 1.3, "residential": 1.0, "industrial": 1.2,
                  "highway": 1.4}
_KEYWORDS = {"emergency": 20, "dangerous": 18, "hazard": 16, "outage": 15, "burst": 14, "leak": 12, "fire": 20,
             "sparking": 18, "flooding": 16, "collapsed": 15, "broken": 10, "damaged": 8}


def rule_severity(description: str, category: str, population_density: float, time_of_day: str,
                  location_type: str) -> str:
    score = _CATEGORY_SCORES.get(category, 10)
    if population_density > 10000:
        score += 25
    elif population_density > 5000:
        score += 15
    score = int(score * _LOCATION_MULT.get(location_type, 1.0))
    if time_of_day == "night":
        score += 15
    elif time_of_day in ("evening", "morning_rush"):
        score += 10
    text = (description or "").lower()
    for word, pts in _KEYWORDS.items():
        if word in text:
            score += pts
            break
    if score >= 70:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"
