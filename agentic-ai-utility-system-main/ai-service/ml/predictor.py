"""Load trained artifacts once and expose explainable predictions."""
from __future__ import annotations

import json
import logging
import threading
from typing import Iterable, Optional

import joblib
import numpy as np

from .config import ARTIFACT_DIR, SPLIT_DIR
from .features import sensor_point, severity_frame

log = logging.getLogger("valtryek.ml")
_STOP = {"a", "an", "the", "and", "is", "are", "in", "on", "of", "to", "for", "at", "near", "from", "with", "it",
         "this", "please", "pls", "since", "now", "our", "has", "been", "very", "0", "by", "be", "not"}
_ARTIFACTS = ("category_model.joblib", "severity_model.joblib", "anomaly_model.joblib", "metrics.json")


def _pretty_feature(name: str) -> Optional[str]:
    """Turn sklearn feature names into something a dispatcher can read; hide char n-grams."""
    if "char__" in name:
        return None
    name = name.replace("text__", "").replace("word__", "")
    if not name.startswith(("cats__", "density__")) and all(t in _STOP for t in name.split()):
        return None
    if name.startswith("cats__"):
        key, _, val = name[len("cats__"):].rpartition("_")
        return f"{key.replace('_', ' ')} = {val}"
    if name.startswith("density__"):
        return "population density"
    return f'"{name}"'


def _top_contributions(transformer, clf, X_row, class_index: int, k: int = 5) -> list[str]:
    coef = clf.coef_[class_index] if hasattr(clf, "coef_") else None
    if coef is None:
        return []
    names = transformer.get_feature_names_out()
    row = X_row.tocsr() if hasattr(X_row, "tocsr") else X_row
    idx, vals = row.indices, row.data * coef[row.indices]
    order = np.argsort(-vals)
    out = []
    for i in order:
        if vals[i] <= 0:
            break
        pretty = _pretty_feature(names[idx[i]])
        if pretty and pretty not in out:
            out.append(pretty)
        if len(out) == k:
            break
    return out


class Predictor:
    def __init__(self, auto_train: bool = True):
        self._lock = threading.Lock()
        self.auto_train = auto_train
        self.load()

    # ------------------------------------------------------------------ lifecycle
    def load(self) -> None:
        with self._lock:
            try:
                self._load_files()
            except Exception as exc:                       # missing files or sklearn version mismatch
                if not self.auto_train:
                    raise
                log.warning("Could not load artifacts (%s) - retraining from the committed dataset", exc)
                self._retrain_unlocked()

    def _load_files(self) -> None:
        missing = [a for a in _ARTIFACTS if not (ARTIFACT_DIR / a).exists()]
        if missing:
            raise FileNotFoundError(f"missing {missing}")
        self.category_model = joblib.load(ARTIFACT_DIR / "category_model.joblib")
        self.severity_model = joblib.load(ARTIFACT_DIR / "severity_model.joblib")
        self.anomaly = joblib.load(ARTIFACT_DIR / "anomaly_model.joblib")
        self.metrics = json.loads((ARTIFACT_DIR / "metrics.json").read_text())
        self.severity_model.predict(severity_frame("test", "water", "residential", "night", 100))  # smoke test

    def _retrain_unlocked(self) -> dict:
        from . import generate_dataset, train
        if not (SPLIT_DIR / "train.csv").exists():
            generate_dataset.main()
        metrics = train.main()
        self._load_files()
        return metrics

    def retrain(self) -> dict:
        with self._lock:
            return self._retrain_unlocked()

    # ------------------------------------------------------------------ predictions
    def classify(self, description: str) -> dict:
        pipe = self.category_model
        proba = pipe.predict_proba([description])[0]
        classes = list(pipe.classes_)
        i = int(np.argmax(proba))
        tfidf, clf = pipe.steps[0][1], pipe.steps[-1][1]
        evidence = _top_contributions(tfidf, clf, tfidf.transform([description]), i)
        return {"category": classes[i], "confidence": round(float(proba[i]), 4),
                "probabilities": {c: round(float(p), 4) for c, p in zip(classes, proba)},
                "evidence": evidence}

    def severity(self, description: str, category: str, location_type: str = "residential",
                 time_of_day: str = "afternoon", population_density: float = 0) -> dict:
        frame = severity_frame(description, category, location_type, time_of_day, population_density)
        pipe = self.severity_model
        proba = pipe.predict_proba(frame)[0]
        classes = list(pipe.classes_)
        i = int(np.argmax(proba))
        prep, clf = pipe.steps[0][1], pipe.steps[-1][1]
        evidence = _top_contributions(prep, clf, prep.transform(frame), i)
        return {"severity": classes[i], "confidence": round(float(proba[i]), 4),
                "probabilities": {c: round(float(p), 4) for c, p in zip(classes, proba)},
                "evidence": evidence, "inputs": frame.iloc[0].to_dict()}

    def anomaly_score(self, value: float, utility: str = "electricity",
                      recent_values: Optional[Iterable[float]] = None, hour_of_day: Optional[int] = None) -> dict:
        X = sensor_point(value, utility, recent_values, hour_of_day)
        kind, model, thr = self.anomaly["kind"], self.anomaly["model"], self.anomaly["threshold"]
        score = float(model.predict_proba(X)[0, 1]) if kind == "gradient_boosting" else float(-model.score_samples(X)[0])
        return {"fault": bool(score >= thr), "score": round(score, 4), "threshold": round(float(thr), 4),
                "model": kind, "features": {k: round(float(v), 3) for k, v in X.iloc[0].items()}}


_instance: Optional[Predictor] = None


def get_predictor() -> Predictor:
    global _instance
    if _instance is None:
        _instance = Predictor()
    return _instance
