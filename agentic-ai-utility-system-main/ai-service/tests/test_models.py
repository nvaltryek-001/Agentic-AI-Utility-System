import json

import pytest

from ml.config import ARTIFACT_DIR
from ml.predictor import get_predictor


@pytest.fixture(scope="module")
def metrics():
    return json.loads((ARTIFACT_DIR / "metrics.json").read_text())


@pytest.fixture(scope="module")
def p():
    return get_predictor()


def test_category_model_beats_keyword_baseline(metrics):
    c = metrics["category"]
    assert c["test"]["macro_f1"] >= 0.95
    assert c["test"]["macro_f1"] - c["baseline_keyword_rules_test"]["macro_f1"] >= 0.3


def test_severity_model_beats_rule_baseline(metrics):
    s = metrics["severity"]
    assert s["test"]["macro_f1"] >= 0.60
    assert s["test"]["critical_recall"] >= 0.70
    assert s["test"]["within_one_level"] >= 0.95
    assert s["test"]["macro_f1"] - s["baseline_rule_scorer_test"]["macro_f1"] >= 0.2


def test_anomaly_model_beats_old_detector(metrics):
    a = metrics["anomaly"]
    assert a["test"]["f1"] >= 0.85
    assert a["test"]["f1"] > a["baseline_raw_value_isolation_forest_test"]["f1"] + 0.3


def test_selection_used_validation_not_test(metrics):
    for task in ("category", "severity"):
        assert metrics[task]["selected"] in metrics[task]["validation_macro_f1"]
    assert metrics["anomaly"]["selected"] in metrics["anomaly"]["validation_f1"]


@pytest.mark.parametrize("text,expected", [
    ("transformer caught fire and smoke everywhere", "electricity"),
    ("main water pipeline burst and road flooding", "water"),
    ("deep pothole on the highway causing accidents", "road"),
    ("all street lights off, road is dark at night", "streetlight"),
    ("manhole cover missing and sewage overflowing", "sewage"),
    ("strong smell of gas with hissing sound", "gas"),
])
def test_category_predictions(p, text, expected):
    assert p.classify(text)["category"] == expected


def test_category_robust_to_typos_and_sms_spelling(p):
    assert p.classify("trnsformer blast pls send ppl immdtly")["category"] == "electricity"
    assert p.classify("no watr supply since yesterday")["category"] == "water"


def test_severity_is_context_sensitive(p):
    text = "electric pole is tilted and may fall"
    level = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    expected = lambda r: sum(level[k] * v for k, v in r["probabilities"].items())
    quiet = p.severity(text, "electricity", "residential", "afternoon", 800)
    busy = p.severity(text, "electricity", "hospital", "night", 20000)
    assert expected(busy) > expected(quiet) + 0.5
    assert busy["probabilities"]["critical"] > 10 * quiet["probabilities"]["critical"]


def test_severity_extremes(p):
    assert p.severity("gas pipeline caught fire", "gas", "school", "night", 12000)["severity"] == "critical"
    assert p.severity("street lamp bulb fused", "streetlight", "residential", "afternoon", 2000)["severity"] \
        in ("low", "medium")


def test_probabilities_sum_to_one(p):
    out = p.classify("water leaking from the joint")
    assert sum(out["probabilities"].values()) == pytest.approx(1.0, abs=1e-3)
    assert out["evidence"], "should explain its decision"


def test_anomaly_detector(p):
    calm = [50, 52, 51, 49, 53, 50]
    assert p.anomaly_score(95, "electricity", calm, 14)["fault"] is True
    assert p.anomaly_score(51, "electricity", calm, 14)["fault"] is False
    assert p.anomaly_score(0, "water", [45, 44, 46, 45, 47, 45], 10)["fault"] is True
