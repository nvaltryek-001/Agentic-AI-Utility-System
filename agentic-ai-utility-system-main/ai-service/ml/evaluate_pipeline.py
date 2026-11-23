"""
Evaluate the full multi-agent triage pipeline (models + safety guardrail) on the TEST split.

    python -m ml.evaluate_pipeline          # writes artifacts/pipeline_metrics.json
"""
from __future__ import annotations

import json
import time

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, recall_score

from .config import ARTIFACT_DIR, SEVERITIES, SPLIT_DIR


def main() -> dict:
    from agents.agent_system import TriageOrchestrator

    test = pd.read_csv(SPLIT_DIR / "test.csv")
    orch = TriageOrchestrator()
    t0 = time.perf_counter()
    out = [orch.run(description=r.description, location_type=r.location_type, time_of_day=r.time_of_day,
                    population_density=r.population_density) for r in test.itertuples()]
    ms = (time.perf_counter() - t0) / len(test) * 1000
    sev = np.array([o["severity"] for o in out])
    cat = np.array([o["category"] for o in out])
    rank = lambda a: np.array([SEVERITIES.index(x) for x in a])
    metrics = {
        "rows": len(test),
        "category_accuracy": round(accuracy_score(test["category"], cat), 4),
        "severity_macro_f1": round(f1_score(test["severity"], sev, average="macro"), 4),
        "severity_accuracy": round(accuracy_score(test["severity"], sev), 4),
        "critical_recall": round(recall_score(test["severity"] == "critical", sev == "critical"), 4),
        "under_triage_rate": round(float((rank(sev) < rank(test["severity"])).mean()), 4),
        "over_triage_rate": round(float((rank(sev) > rank(test["severity"])).mean()), 4),
        "guardrail_escalation_rate": round(float(np.mean([bool(o["escalations"]) for o in out])), 4),
        "human_review_rate": round(float(np.mean([o["requires_human_review"] for o in out])), 4),
        "mean_latency_ms": round(ms, 2),
    }
    (ARTIFACT_DIR / "pipeline_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    main()
