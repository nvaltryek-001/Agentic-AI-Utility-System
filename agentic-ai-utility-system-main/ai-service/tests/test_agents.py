import pytest

from agents.agent_system import TriageOrchestrator, _time_bucket


@pytest.fixture(scope="module")
def orch():
    return TriageOrchestrator()


def run(orch, **kw):
    kw.setdefault("time_of_day", "afternoon")
    kw.setdefault("population_density", 5000)
    return orch.run(**kw)


def test_pipeline_runs_all_agents_in_order(orch):
    out = run(orch, description="no water supply since yesterday in our colony")
    assert [t["agent"] for t in out["trace"]] == ["IntakeAgent", "ClassificationAgent", "SeverityAgent",
                                                  "SafetyGuardrailAgent", "PriorityAgent"]
    assert out["category"] == "water"
    assert 0 <= out["priority_score"] <= 100


def test_guardrail_escalates_gas_leak(orch):
    out = run(orch, description="slight gas smell near the meter", location_type="residential",
              population_density=500)
    assert out["severity"] == "critical"
    assert "gas leak mentioned" in out["escalations"]


def test_guardrail_ignores_fire_hydrant(orch):
    out = run(orch, description="fire hydrant is damaged and leaking")
    assert "fire/explosion mentioned" not in out["escalations"]


def test_guardrail_never_lowers_severity(orch):
    out = run(orch, description="transformer blast and fire near the hospital", location_type="hospital",
              time_of_day="night", population_density=20000)
    sa = next(t for t in out["trace"] if t["agent"] == "SafetyGuardrailAgent")["output"]
    order = ["low", "medium", "high", "critical"]
    assert order.index(sa["severity_after"]) >= order.index(sa["severity_before"])
    assert out["requires_immediate_attention"]


def test_confident_model_corrects_wrong_category(orch):
    out = run(orch, description="manhole cover missing and sewage overflowing on the street", category="road")
    assert out["category"] == "sewage"
    assert "category_corrected" in out["flags"]


def test_unsure_model_keeps_citizen_category():
    from agents.agent_system import ClassificationAgent, TriageState

    class Unsure:
        def classify(self, text):
            return {"category": "water", "confidence": 0.62, "evidence": ["rain"],
                    "probabilities": {"water": 0.62, "road": 0.35, "sewage": 0.03}}

    state = TriageState(description="water logging on the road after rain", reported_category="road")
    ClassificationAgent(Unsure()).run(state)
    assert state.category == "road" and state.category_confidence == 0.35
    assert "category_disagreement" in state.flags


def test_model_agrees_with_citizen(orch):
    out = run(orch, description="water logging on the road after rain", category="road")
    assert out["category"] == "road" and "category_disagreement" not in out["flags"]


def test_intake_infers_location_and_time(orch):
    out = orch.run(description="pipe leaking outside the hospital emergency gate",
                   timestamp="2026-11-20T23:30:00")
    assert out["context"]["location_type"] == "hospital"
    assert out["context"]["time_of_day"] == "night"


def test_short_description_is_flagged(orch):
    out = run(orch, description="help")
    assert "description_too_short" in out["flags"]


@pytest.mark.parametrize("hour,bucket", [(6, "morning"), (13, "afternoon"), (19, "evening"), (2, "night")])
def test_time_bucket(hour, bucket):
    assert _time_bucket(hour) == bucket
