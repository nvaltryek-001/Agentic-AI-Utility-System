"""
Train, select and evaluate every Valtryek model.

    python -m ml.train               # uses data/splits and data/sensors (run ml.generate_dataset first)

Protocol (identical for all three tasks):
  1. fit each candidate on TRAIN
  2. pick the candidate with the best macro-F1 (or F1 for anomalies) on VALIDATION
  3. refit the winner on TRAIN+VALIDATION
  4. score it ONCE on the held-out TEST split, next to the old rule-based baseline
Artifacts land in artifacts/: *.joblib models, metrics.json, figures/*.png, MODEL_CARD.md
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report, confusion_matrix, f1_score, log_loss,
                             precision_score, recall_score)
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from .baselines import keyword_category, rule_severity
from .config import (ARTIFACT_DIR, CATEGORIES, FIGURE_DIR, RANDOM_SEED, SENSOR_DIR, SEVERITIES, SPLIT_DIR)
from .features import SEVERITY_COLUMNS, sensor_features_frame, severity_preprocessor, text_union


def load_splits():
    return {k: pd.read_csv(SPLIT_DIR / f"{k}.csv") for k in ("train", "val", "test")}


def load_sensor_splits():
    return {k: pd.read_csv(SENSOR_DIR / f"{k}.csv") for k in ("train", "val", "test")}


def _cls_metrics(y_true, y_pred, labels):
    return {
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "macro_f1": round(f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0), 4),
        "weighted_f1": round(f1_score(y_true, y_pred, labels=labels, average="weighted", zero_division=0), 4),
        "per_class": {k: {m: round(v, 4) for m, v in d.items() if m != "support"} | {"support": int(d["support"])}
                      for k, d in classification_report(y_true, y_pred, labels=labels, output_dict=True,
                                                        zero_division=0).items() if k in labels},
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
    }


def _ordinal_extras(y_true, y_pred):
    idx = {s: i for i, s in enumerate(SEVERITIES)}
    t = np.array([idx[s] for s in y_true])
    p = np.array([idx[s] for s in y_pred])
    return {"ordinal_mae": round(float(np.abs(t - p).mean()), 4),
            "within_one_level": round(float((np.abs(t - p) <= 1).mean()), 4),
            "critical_recall": round(recall_score(t == 3, p == 3, zero_division=0), 4),
            "under_triage_rate": round(float((p < t).mean()), 4)}


def _select(name, candidates, X_tr, y_tr, X_val, y_val, labels):
    print(f"\n[{name}] model selection on validation ({len(y_val)} rows)")
    scores, losses = {}, {}
    for cand_name, est in candidates.items():
        t0 = time.time()
        model = clone(est).fit(X_tr, y_tr)
        f1 = f1_score(y_val, model.predict(X_val), labels=labels, average="macro")
        loss = log_loss(y_val, model.predict_proba(X_val), labels=model.classes_)
        scores[cand_name], losses[cand_name] = round(float(f1), 4), round(float(loss), 4)
        print(f"  {cand_name:<36} val macro-F1 = {f1:.4f}  log-loss = {loss:.4f}  ({time.time() - t0:.1f}s)")
    # best macro-F1; ties broken by lower log-loss (better-calibrated confidence for the agents)
    best = max(scores, key=lambda k: (scores[k], -losses[k]))
    print(f"  -> selected: {best}")
    return best, scores


# ------------------------------------------------------------------------------ category
def train_category(splits):
    tr, val, te = splits["train"], splits["val"], splits["test"]
    candidates = {
        "tfidf_word + ComplementNB": Pipeline([("tfidf", text_union().transformer_list[0][1]),
                                               ("clf", ComplementNB(alpha=0.3))]),
        "tfidf_word+char + LogReg(C=4)": Pipeline([("tfidf", text_union()),
                                                   ("clf", LogisticRegression(C=4, max_iter=3000))]),
        "tfidf_word+char + LogReg(C=16)": Pipeline([("tfidf", text_union()),
                                                    ("clf", LogisticRegression(C=16, max_iter=3000))]),
        "tfidf_word+char + LinearSVC(cal.)": Pipeline([("tfidf", text_union()),
                                                       ("clf", CalibratedClassifierCV(LinearSVC(C=0.5), cv=3))]),
    }
    best, val_scores = _select("category", candidates, tr["description"], tr["category"], val["description"],
                               val["category"], CATEGORIES)
    full = pd.concat([tr, val])
    model = clone(candidates[best]).fit(full["description"], full["category"])
    pred = model.predict(te["description"])
    base = [keyword_category(d) for d in te["description"]]
    result = {"selected": best, "validation_macro_f1": val_scores,
              "test": _cls_metrics(te["category"], pred, CATEGORIES),
              "baseline_keyword_rules_test": _cls_metrics(te["category"], base, CATEGORIES)}
    print(f"  TEST macro-F1 {result['test']['macro_f1']:.4f} | keyword baseline "
          f"{result['baseline_keyword_rules_test']['macro_f1']:.4f}")
    return model, result


# ------------------------------------------------------------------------------ severity
def train_severity(splits, category_model):
    tr, val, te = splits["train"], splits["val"], splits["test"]
    candidates = {
        "text+context + LogReg(C=2)": Pipeline([("prep", severity_preprocessor()),
                                                ("clf", LogisticRegression(C=2, max_iter=4000))]),
        "text+context + LogReg(C=8)": Pipeline([("prep", severity_preprocessor()),
                                                ("clf", LogisticRegression(C=8, max_iter=4000))]),
        "text+context + LogReg(C=8,balanced)": Pipeline([("prep", severity_preprocessor()),
                                                         ("clf", LogisticRegression(C=8, max_iter=4000,
                                                                                    class_weight="balanced"))]),
        "text+context + LinearSVC(cal.)": Pipeline([("prep", severity_preprocessor()),
                                                    ("clf", CalibratedClassifierCV(LinearSVC(C=0.3), cv=3))]),
    }
    best, val_scores = _select("severity", candidates, tr[SEVERITY_COLUMNS], tr["severity"],
                               val[SEVERITY_COLUMNS], val["severity"], SEVERITIES)
    full = pd.concat([tr, val])
    model = clone(candidates[best]).fit(full[SEVERITY_COLUMNS], full["severity"])

    pred = model.predict(te[SEVERITY_COLUMNS])                         # category given by the citizen
    e2e = te[SEVERITY_COLUMNS].copy()
    e2e["category"] = category_model.predict(te["description"])         # category predicted by our model
    pred_e2e = model.predict(e2e)
    base = [rule_severity(r.description, r.category, r.population_density, r.time_of_day, r.location_type)
            for r in te.itertuples()]
    result = {"selected": best, "validation_macro_f1": val_scores,
              "test": _cls_metrics(te["severity"], pred, SEVERITIES) | _ordinal_extras(te["severity"], pred),
              "test_end_to_end_predicted_category": _cls_metrics(te["severity"], pred_e2e, SEVERITIES)
              | _ordinal_extras(te["severity"], pred_e2e),
              "baseline_rule_scorer_test": _cls_metrics(te["severity"], base, SEVERITIES)
              | _ordinal_extras(te["severity"], base)}
    print(f"  TEST macro-F1 {result['test']['macro_f1']:.4f} (end-to-end "
          f"{result['test_end_to_end_predicted_category']['macro_f1']:.4f}) | rule baseline "
          f"{result['baseline_rule_scorer_test']['macro_f1']:.4f}")
    return model, result


# ------------------------------------------------------------------------------ anomaly
def _bin_metrics(y, p):
    return {"precision": round(precision_score(y, p, zero_division=0), 4),
            "recall": round(recall_score(y, p, zero_division=0), 4),
            "f1": round(f1_score(y, p, zero_division=0), 4),
            "confusion_matrix": confusion_matrix(y, p, labels=[0, 1]).tolist()}


def train_anomaly(sensor_splits):
    tr, val, te = sensor_splits["train"], sensor_splits["val"], sensor_splits["test"]
    Xtr, Xval, Xte = (sensor_features_frame(d) for d in (tr, val, te))
    ytr, yval, yte = tr["is_anomaly"].values, val["is_anomaly"].values, te["is_anomaly"].values
    print(f"\n[anomaly] model selection on validation ({len(yval)} readings)")

    scores, fitted = {}, {}
    # (a) unsupervised Isolation Forest: tune the decision threshold on validation
    iso = IsolationForest(n_estimators=300, contamination="auto", random_state=RANDOM_SEED).fit(Xtr)
    val_scores = -iso.score_samples(Xval)
    thresholds = np.quantile(val_scores, np.linspace(0.90, 0.995, 60))
    f1s = [f1_score(yval, val_scores >= t) for t in thresholds]
    iso_thr = float(thresholds[int(np.argmax(f1s))])
    scores["IsolationForest (unsupervised)"] = round(float(max(f1s)), 4)
    fitted["IsolationForest (unsupervised)"] = ("isolation_forest", iso, iso_thr)
    # (b) supervised gradient boosting on the labelled incidents
    hgb = HistGradientBoostingClassifier(max_iter=300, learning_rate=0.08, random_state=RANDOM_SEED)
    hgb.fit(Xtr, ytr)
    pv = hgb.predict_proba(Xval)[:, 1]
    thr_grid = np.linspace(0.1, 0.9, 33)
    f1s = [f1_score(yval, pv >= t) for t in thr_grid]
    hgb_thr = float(thr_grid[int(np.argmax(f1s))])
    scores["HistGradientBoosting (supervised)"] = round(float(max(f1s)), 4)
    fitted["HistGradientBoosting (supervised)"] = ("gradient_boosting", hgb, hgb_thr)
    for k, v in scores.items():
        print(f"  {k:<36} val F1 = {v:.4f}")
    best = max(scores, key=scores.get)
    print(f"  -> selected: {best}")

    # refit winner on train+val (threshold kept from validation)
    kind, est, thr = fitted[best]
    Xfull = pd.concat([Xtr, Xval])
    yfull = np.concatenate([ytr, yval])
    est = clone(est).fit(Xfull, yfull) if kind == "gradient_boosting" else clone(est).fit(Xfull)
    test_score = est.predict_proba(Xte)[:, 1] if kind == "gradient_boosting" else -est.score_samples(Xte)
    pred = (test_score >= thr).astype(int)

    # baseline = the old service: IsolationForest(contamination=0.1) on the raw value only
    old = IsolationForest(contamination=0.1, random_state=RANDOM_SEED).fit(tr[["value"]])
    base_pred = (old.predict(te[["value"]]) == -1).astype(int)
    by_type = {ft: round(float(pred[te["fault_type"].fillna("").values == ft].mean()), 4)
               for ft in ("spike", "drop", "stuck", "drift")}
    result = {"selected": best, "validation_f1": scores, "threshold": round(thr, 5),
              "test": _bin_metrics(yte, pred) | {"detection_rate_by_fault_type": by_type},
              "baseline_raw_value_isolation_forest_test": _bin_metrics(yte, base_pred)}
    print(f"  TEST F1 {result['test']['f1']:.4f} | old raw-value IsolationForest "
          f"{result['baseline_raw_value_isolation_forest_test']['f1']:.4f}")
    return {"kind": kind, "model": est, "threshold": thr}, result


# ------------------------------------------------------------------------------ reporting
def _plot_confusions(metrics):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    panels = [("Category - trained model", metrics["category"]["test"]["confusion_matrix"], CATEGORIES),
              ("Category - keyword baseline", metrics["category"]["baseline_keyword_rules_test"]["confusion_matrix"],
               CATEGORIES),
              ("Severity - trained model", metrics["severity"]["test"]["confusion_matrix"], SEVERITIES),
              ("Severity - rule baseline", metrics["severity"]["baseline_rule_scorer_test"]["confusion_matrix"],
               SEVERITIES)]
    for title, cm, labels in panels:
        cm = np.array(cm)
        norm = cm / np.maximum(cm.sum(axis=1, keepdims=True), 1)
        fig, ax = plt.subplots(figsize=(5.2, 4.4), dpi=130)
        ax.imshow(norm, cmap="Blues", vmin=0, vmax=1)
        ax.set_xticks(range(len(labels)), labels, rotation=35, ha="right", fontsize=8)
        ax.set_yticks(range(len(labels)), labels, fontsize=8)
        for i in range(len(labels)):
            for j in range(len(labels)):
                ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=8,
                        color="white" if norm[i, j] > 0.55 else "#1f2937")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_title(f"{title} (test set)", fontsize=10)
        fig.tight_layout()
        fig.savefig(FIGURE_DIR / (title.lower().replace(" - ", "_").replace(" ", "_") + ".png"))
        plt.close(fig)

    fig, ax = plt.subplots(figsize=(7, 3.6), dpi=130)
    names = ["Category\nmacro-F1", "Severity\nmacro-F1", "Severity\ncritical recall", "Anomaly\nF1"]
    new = [metrics["category"]["test"]["macro_f1"], metrics["severity"]["test"]["macro_f1"],
           metrics["severity"]["test"]["critical_recall"], metrics["anomaly"]["test"]["f1"]]
    old = [metrics["category"]["baseline_keyword_rules_test"]["macro_f1"],
           metrics["severity"]["baseline_rule_scorer_test"]["macro_f1"],
           metrics["severity"]["baseline_rule_scorer_test"]["critical_recall"],
           metrics["anomaly"]["baseline_raw_value_isolation_forest_test"]["f1"]]
    x = np.arange(len(names))
    ax.bar(x - 0.18, old, 0.36, label="Previous rules", color="#cbd5e1")
    ax.bar(x + 0.18, new, 0.36, label="Trained models", color="#2563eb")
    for i, (o, n) in enumerate(zip(old, new)):
        ax.text(i - 0.18, o + 0.02, f"{o:.2f}", ha="center", fontsize=8)
        ax.text(i + 0.18, n + 0.02, f"{n:.2f}", ha="center", fontsize=8, color="#1e3a8a")
    ax.set_xticks(x, names, fontsize=8)
    ax.set_ylim(0, 1.22)
    ax.spines[["top", "right"]].set_visible(False)
    ax.legend(frameon=False, fontsize=8, loc="upper center", ncol=2)
    ax.set_title("Held-out test set: trained models vs. previous rule-based logic", fontsize=10)
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / "model_vs_baseline.png")
    plt.close(fig)


def _model_card(m):
    c, s, a = m["category"], m["severity"], m["anomaly"]
    rows = lambda d: "\n".join(f"| {k} | {v['precision']:.3f} | {v['recall']:.3f} | {v['f1-score']:.3f} | "
                               f"{v['support']} |" for k, v in d.items())
    return f"""# Model card - Valtryek AI service

Generated by `python -m ml.train` on {m['trained_at']} (scikit-learn {m['sklearn_version']}).
Data: {m['data']['train']:,} train / {m['data']['val']:,} validation / {m['data']['test']:,} test fault reports;
{m['data']['sensor_train']:,} / {m['data']['sensor_val']:,} / {m['data']['sensor_test']:,} sensor readings.
Selection on validation, final refit on train+validation, single evaluation on test.

> The corpus is synthetic (see `DATASET.md`). These numbers show the pipeline works and how it compares
> with the previous rules on the same data; they are **not** a claim about performance on real complaints.

## 1. Category classifier - `{c['selected']}`
Test accuracy **{c['test']['accuracy']:.3f}**, macro-F1 **{c['test']['macro_f1']:.3f}**
(keyword baseline: accuracy {c['baseline_keyword_rules_test']['accuracy']:.3f}, macro-F1 {c['baseline_keyword_rules_test']['macro_f1']:.3f}).

| class | precision | recall | F1 | support |
|---|---|---|---|---|
{rows(c['test']['per_class'])}

## 2. Severity classifier - `{s['selected']}`
Inputs: description + category + location type + time of day + population density.
Test macro-F1 **{s['test']['macro_f1']:.3f}**, accuracy {s['test']['accuracy']:.3f},
critical recall **{s['test']['critical_recall']:.3f}**, within one level {s['test']['within_one_level']:.3f},
under-triage rate {s['test']['under_triage_rate']:.3f}.
End-to-end (category also predicted): macro-F1 {s['test_end_to_end_predicted_category']['macro_f1']:.3f}.
Rule baseline: macro-F1 {s['baseline_rule_scorer_test']['macro_f1']:.3f}, critical recall {s['baseline_rule_scorer_test']['critical_recall']:.3f}.

| class | precision | recall | F1 | support |
|---|---|---|---|---|
{rows(s['test']['per_class'])}

About 6% of severity labels were deliberately shifted by one level (annotator disagreement), so the
ceiling is below 1.0.

## 3. Sensor anomaly detector - `{a['selected']}`
Features: value, hour-on-hour delta, residual from 6-hour rolling mean, hour of day (sin/cos), utility.
Test precision {a['test']['precision']:.3f}, recall {a['test']['recall']:.3f}, **F1 {a['test']['f1']:.3f}**
(old raw-value IsolationForest: F1 {a['baseline_raw_value_isolation_forest_test']['f1']:.3f}).
Detection rate by injected fault type: {a['test']['detection_rate_by_fault_type']}.

## Not covered
- **Images**: no labelled photo dataset is available, so `/analyze-image` does not classify pixels; it
  validates the image and routes any accompanying text through the text models.
- **Drift / fairness**: real complaints differ by city and language; retrain on real data before relying on it.
"""


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    splits = load_splits()
    sensor_splits = load_sensor_splits()
    print("Loaded splits:", {k: len(v) for k, v in splits.items()},
          "sensors:", {k: len(v) for k, v in sensor_splits.items()})

    category_model, cat_res = train_category(splits)
    severity_model, sev_res = train_severity(splits, category_model)
    anomaly_bundle, ano_res = train_anomaly(sensor_splits)

    joblib.dump(category_model, ARTIFACT_DIR / "category_model.joblib", compress=3)
    joblib.dump(severity_model, ARTIFACT_DIR / "severity_model.joblib", compress=3)
    joblib.dump(anomaly_bundle, ARTIFACT_DIR / "anomaly_model.joblib", compress=3)

    metrics = {"trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
               "sklearn_version": sklearn.__version__,
               "data": {k: len(v) for k, v in splits.items()}
               | {f"sensor_{k}": len(v) for k, v in sensor_splits.items()},
               "category": cat_res, "severity": sev_res, "anomaly": ano_res,
               "training_seconds": round(time.time() - t0, 1)}
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    _plot_confusions(metrics)
    (ARTIFACT_DIR / "MODEL_CARD.md").write_text(_model_card(metrics))
    print(f"\nSaved models, metrics.json, MODEL_CARD.md and figures to {ARTIFACT_DIR} "
          f"in {metrics['training_seconds']}s")
    return metrics


if __name__ == "__main__":
    main()
