"""
Multi-agent triage pipeline for a citizen fault report.

    Intake  ->  Classification  ->  Severity  ->  Safety guardrail  ->  Priority & dispatch

Each agent reads the shared `TriageState`, adds its output, and appends a trace entry
(what it decided, why, how long it took). The trace is returned to the caller so a
dispatcher can see exactly how a decision was made.

Models are the trained scikit-learn artifacts from `ml/`; the guardrail and priority
rules are deliberately simple, explicit and unit-tested.
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from ml.config import CATEGORIES, LOCATION_TYPES, RESPONSE_SLA, SEVERITIES, TIMES_OF_DAY
from ml.predictor import Predictor, get_predictor

# --------------------------------------------------------------------------- state
@dataclass
class TriageState:
    description: str
    reported_category: Optional[str] = None
    location_type: Optional[str] = None
    time_of_day: Optional[str] = None
    population_density: Optional[float] = None
    timestamp: Optional[str] = None
    # filled in by agents
    category: Optional[str] = None
    category_confidence: float = 0.0
    severity: Optional[str] = None
    severity_confidence: float = 0.0
    escalations: list[str] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)
    priority_score: Optional[float] = None
    trace: list[dict[str, Any]] = field(default_factory=list)


class Agent:
    name = "agent"

    def run(self, state: TriageState) -> None:
        start = time.perf_counter()
        output, reasoning = self.act(state)
        state.trace.append({"agent": self.name, "output": output, "reasoning": reasoning,
                            "ms": round((time.perf_counter() - start) * 1000, 2)})

    def act(self, state: TriageState) -> tuple[dict, list[str]]:  # pragma: no cover - interface
        raise NotImplementedError


# --------------------------------------------------------------------------- agents
_PLACE_HINTS = [
    ("hospital", r"\bhospital|clinic|emergency gate|aiims\b"),
    ("school", r"\bschool|college|vidyalaya|children take\b"),
    ("highway", r"\bhighway|nh-?\d+|expressway|toll plaza|flyover|ring road\b"),
    ("industrial", r"\bindustrial|factory|warehouse\b"),
    ("commercial", r"\bmarket|mall|shopping|shops|atm|bank\b"),
]


def _time_bucket(hour: int) -> str:
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 21:
        return "evening"
    return "night"


class IntakeAgent(Agent):
    """Normalises the report and fills missing context from the text or the timestamp."""
    name = "IntakeAgent"

    def act(self, s: TriageState):
        reasons = []
        s.description = re.sub(r"\s+", " ", (s.description or "")).strip()
        if len(s.description) < 8:
            s.flags.append("description_too_short")
            reasons.append("Description is very short; predictions will be low-confidence.")
        if s.reported_category not in CATEGORIES:
            if s.reported_category:
                reasons.append(f"Reported category '{s.reported_category}' is not a known utility; ignoring it.")
            s.reported_category = None
        if s.location_type not in LOCATION_TYPES:
            text = s.description.lower()
            s.location_type = next((lt for lt, pat in _PLACE_HINTS if re.search(pat, text)), "residential")
            reasons.append(f"Location type inferred from text: {s.location_type}.")
        if s.time_of_day not in TIMES_OF_DAY:
            try:
                hour = datetime.fromisoformat(s.timestamp.replace("Z", "+00:00")).hour if s.timestamp \
                    else datetime.now().hour
            except ValueError:
                hour = datetime.now().hour
            s.time_of_day = _time_bucket(hour)
            reasons.append(f"Time of day derived from {'timestamp' if s.timestamp else 'server clock'}: "
                           f"{s.time_of_day}.")
        if s.population_density is None or s.population_density < 0:
            s.population_density = 5000.0
            reasons.append("Population density unknown; using city median 5,000/km².")
        return ({"location_type": s.location_type, "time_of_day": s.time_of_day,
                 "population_density": s.population_density}, reasons or ["All context supplied by caller."])


class ClassificationAgent(Agent):
    """Predicts the utility category; overrides the citizen's choice only when the model is very sure."""
    name = "ClassificationAgent"
    OVERRIDE_CONFIDENCE = 0.90

    def __init__(self, predictor: Predictor):
        self.p = predictor

    def act(self, s: TriageState):
        pred = self.p.classify(s.description)
        reasons = [f"Model predicts '{pred['category']}' ({pred['confidence']:.0%}); evidence: "
                   f"{', '.join(pred['evidence']) or 'n/a'}."]
        if s.reported_category and s.reported_category != pred["category"]:
            if pred["confidence"] >= self.OVERRIDE_CONFIDENCE:
                s.category, s.category_confidence = pred["category"], pred["confidence"]
                s.flags.append("category_corrected")
                reasons.append(f"Citizen chose '{s.reported_category}' but model is ≥{self.OVERRIDE_CONFIDENCE:.0%} "
                               f"sure; re-routing to '{pred['category']}'.")
            else:
                s.category = s.reported_category
                s.category_confidence = pred["probabilities"].get(s.reported_category, 0.0)
                s.flags.append("category_disagreement")
                reasons.append(f"Keeping citizen's choice '{s.reported_category}' (model not confident enough to "
                               "override).")
        elif s.reported_category:
            s.category, s.category_confidence = s.reported_category, pred["confidence"]
            reasons.append("Model agrees with the citizen's category.")
        else:
            s.category, s.category_confidence = pred["category"], pred["confidence"]
        return pred | {"final_category": s.category}, reasons


class SeverityAgent(Agent):
    name = "SeverityAgent"

    def __init__(self, predictor: Predictor):
        self.p = predictor

    def act(self, s: TriageState):
        pred = self.p.severity(s.description, s.category, s.location_type, s.time_of_day, s.population_density)
        s.severity, s.severity_confidence = pred["severity"], pred["confidence"]
        pred.pop("inputs", None)
        return pred, [f"Model predicts '{pred['severity']}' ({pred['confidence']:.0%}); strongest signals: "
                      f"{', '.join(pred['evidence']) or 'n/a'}."]


class SafetyGuardrailAgent(Agent):
    """Hard, auditable rules that can only raise severity - never lower it."""
    name = "SafetyGuardrailAgent"
    RULES = [
        ("critical", r"\b(fire(?! hydrant)|flames?|burning|blast|explosion)\b", "fire/explosion mentioned"),
        ("critical", r"\b(gas|lpg|png|cng)\b.*\b(leak|leaking|smell|hissing)\b|\b(leak|smell)\w*\b.*\bgas\b",
         "gas leak mentioned"),
        ("critical", r"\b(shock|electrocut\w*|giving current)\b", "electric shock reported"),
        ("high", r"\blive (electric )?wire|naked wire|wire\w* (fallen|lying|sparking)|sparking\b",
         "exposed live conductor"),
        ("high", r"\b(manhole|sinkhole)\b.*\b(open|missing|without cover|uncovered)\b|\buncovered manhole\b",
         "open pit / manhole"),
        ("high", r"\b(injured|bleeding|accidents?)\b|\b(man|woman|child|someone|people|ppl|bikes?|kids?)\b"
                 r"( \w+)? (fell|got hurt|got a shock)\b", "injury or accident reported"),
    ]
    REVIEW_BELOW = 0.50

    def act(self, s: TriageState):
        text = s.description.lower()
        reasons, before = [], s.severity
        for floor, pattern, label in self.RULES:
            if re.search(pattern, text) and SEVERITIES.index(s.severity) < SEVERITIES.index(floor):
                s.severity = floor
                s.escalations.append(label)
                reasons.append(f"Raised to '{floor}': {label}.")
        if s.severity_confidence < self.REVIEW_BELOW or s.category_confidence < self.REVIEW_BELOW:
            s.flags.append("requires_human_review")
            reasons.append("Low model confidence; flagged for dispatcher review.")
        if not reasons:
            reasons.append("No safety rule fired; model severity kept.")
        return {"severity_before": before, "severity_after": s.severity, "escalations": s.escalations}, reasons


class PriorityAgent(Agent):
    """Turns severity + context into a 0-100 dispatch priority and an SLA."""
    name = "PriorityAgent"
    SEVERITY_BASE = {"low": 15, "medium": 40, "high": 65, "critical": 85}
    PLACE_BONUS = {"hospital": 10, "school": 8, "highway": 6, "commercial": 4, "industrial": 3, "residential": 0}

    def act(self, s: TriageState):
        base = self.SEVERITY_BASE[s.severity]
        place = self.PLACE_BONUS.get(s.location_type, 0)
        density = min(5.0, (s.population_density or 0) / 4000)
        night = 3 if s.time_of_day == "night" else 0
        score = min(100.0, base + place + density + night)
        s.priority_score = round(score, 1)
        return ({"priority_score": s.priority_score, "response_sla": RESPONSE_SLA[s.severity],
                 "dispatch": "immediate" if s.severity in ("critical", "high") else "queue"},
                [f"severity {s.severity} → {base}", f"location {s.location_type} → +{place}",
                 f"density → +{density:.1f}", f"night → +{night}"])


# --------------------------------------------------------------------------- orchestrator
class TriageOrchestrator:
    def __init__(self, predictor: Optional[Predictor] = None):
        p = predictor or get_predictor()
        self.agents: list[Agent] = [IntakeAgent(), ClassificationAgent(p), SeverityAgent(p),
                                    SafetyGuardrailAgent(), PriorityAgent()]

    def run(self, description: str, category: Optional[str] = None, location_type: Optional[str] = None,
            time_of_day: Optional[str] = None, population_density: Optional[float] = None,
            timestamp: Optional[str] = None) -> dict:
        """`category` is the citizen's own choice (may be empty or wrong)."""
        state = TriageState(description=description, reported_category=category, location_type=location_type,
                            time_of_day=time_of_day, population_density=population_density, timestamp=timestamp)
        started = time.perf_counter()
        for agent in self.agents:
            agent.run(state)
        return {
            "category": state.category,
            "category_confidence": round(state.category_confidence, 4),
            "severity": state.severity,
            "severity_confidence": round(state.severity_confidence, 4),
            "priority_score": state.priority_score,
            "response_sla": RESPONSE_SLA[state.severity],
            "requires_immediate_attention": state.severity in ("critical", "high"),
            "requires_human_review": "requires_human_review" in state.flags,
            "escalations": state.escalations,
            "flags": sorted(set(state.flags)),
            "context": {"location_type": state.location_type, "time_of_day": state.time_of_day,
                        "population_density": state.population_density},
            "trace": state.trace,
            "total_ms": round((time.perf_counter() - started) * 1000, 2),
        }
