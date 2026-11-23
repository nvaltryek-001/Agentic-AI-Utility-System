"""
Valtryek AI service - trained models + multi-agent triage behind a small FastAPI app.

Run:  uvicorn main:app --port 8000        Docs: http://localhost:8000/docs
Demo console: http://localhost:8000/demo
"""
from __future__ import annotations

import io
import logging
import os
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from agents.agent_system import TriageOrchestrator
from ml.config import RESPONSE_SLA
from ml.predictor import get_predictor

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
VERSION = "3.0.0"
STATIC = Path(__file__).parent / "static"

app = FastAPI(title="Valtryek AI Service", version=VERSION,
              description="Fault-report triage (category, severity, priority) and sensor anomaly detection.")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])

predictor = get_predictor()
orchestrator = TriageOrchestrator(predictor)


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


# ------------------------------------------------------------------------- schemas
class TriageRequest(BaseModel):
    description: str = Field(..., min_length=1, examples=["Live wire sparking near the school gate"])
    category: Optional[str] = Field(None, description="Category chosen by the citizen, if any")
    location_type: Optional[str] = Field(None, examples=["school"])
    time_of_day: Optional[str] = Field(None, examples=["night"])
    population_density: Optional[float] = Field(None, ge=0)
    timestamp: Optional[str] = None


class ClassifyRequest(BaseModel):
    description: str = Field(..., min_length=1)


class SeverityPredictionRequest(BaseModel):
    description: str = ""
    category: str = ""
    population_density: float = 0
    time_of_day: str = "afternoon"
    location_type: str = "residential"


class FaultPredictionRequest(BaseModel):
    sensor_value: float = Field(..., ge=0, le=100, description="Normalised reading 0-100")
    utility: str = "electricity"
    recent_values: Optional[List[float]] = Field(None, description="Up to 6 previous readings, oldest first")
    hour_of_day: Optional[int] = Field(None, ge=0, le=23)
    location: Optional[dict] = None


class BatchPredictionRequest(BaseModel):
    sensor_values: List[float] = Field(..., min_length=1, max_length=5000)
    utility: str = "electricity"
    start_hour: int = Field(0, ge=0, le=23)


class AnalyticsRequest(BaseModel):
    records: List[dict] = Field(default_factory=list, description="Fault records (e.g. from MongoDB)")


# ------------------------------------------------------------------------- health / info
@app.get("/")
def home():
    return {"message": "Valtryek AI Service running", "version": VERSION, "status": "healthy",
            "agents": [a.name for a in orchestrator.agents], "docs": "/docs", "demo": "/demo", "timestamp": _now()}


@app.get("/health")
def health():
    return {"status": "healthy", "models_loaded": True, "trained_at": predictor.metrics.get("trained_at"),
            "timestamp": _now()}


@app.get("/model-info")
def model_info():
    m = predictor.metrics
    return {"trained_at": m["trained_at"], "sklearn_version": m["sklearn_version"], "data": m["data"],
            "category": {"model": m["category"]["selected"], "test": {k: m["category"]["test"][k]
                                                                    for k in ("accuracy", "macro_f1")}},
            "severity": {"model": m["severity"]["selected"],
                         "test": {k: m["severity"]["test"][k]
                                  for k in ("accuracy", "macro_f1", "critical_recall", "within_one_level")}},
            "anomaly": {"model": m["anomaly"]["selected"], "test": {k: m["anomaly"]["test"][k]
                                                                  for k in ("precision", "recall", "f1")}},
            "image_model": None}


@app.get("/demo", include_in_schema=False)
def demo():
    return FileResponse(STATIC / "demo.html")


# ------------------------------------------------------------------------- triage
@app.post("/agents/triage")
def triage(req: TriageRequest):
    """Run the full Intake → Classification → Severity → Safety → Priority agent pipeline."""
    return orchestrator.run(description=req.description, category=req.category,
                            location_type=req.location_type, time_of_day=req.time_of_day,
                            population_density=req.population_density, timestamp=req.timestamp)


@app.post("/classify")
def classify(req: ClassifyRequest):
    return predictor.classify(req.description)


@app.post("/predict-severity")
def predict_severity(req: SeverityPredictionRequest):
    category = req.category or predictor.classify(req.description)["category"]
    pred = predictor.severity(req.description, category, req.location_type, req.time_of_day,
                              req.population_density)
    return {"severity": pred["severity"], "confidence": pred["confidence"], "probabilities": pred["probabilities"],
            "category": category, "reasoning": pred["evidence"],
            "recommended_response_time": RESPONSE_SLA[pred["severity"]],
            "requires_immediate_attention": pred["severity"] in ("critical", "high"), "timestamp": _now()}


# ------------------------------------------------------------------------- sensors
def _severity_from_score(score: float) -> str:
    return "critical" if score >= 0.95 else "high" if score >= 0.8 else "medium" if score >= 0.5 else "low"


@app.post("/predict")
def predict_fault(req: FaultPredictionRequest):
    """Anomaly detection on a single telemetry reading (optionally with recent history)."""
    res = predictor.anomaly_score(req.sensor_value, req.utility, req.recent_values, req.hour_of_day)
    body = {"fault": res["fault"], "value": req.sensor_value, "anomaly_score": res["score"],
            "threshold": res["threshold"], "model": res["model"], "timestamp": _now()}
    if res["fault"]:
        body["severity"] = _severity_from_score(res["score"])
    return body


@app.post("/batch-predict")
def batch_predict(req: BatchPredictionRequest):
    """Score a time-ordered series; each reading uses the previous six as context."""
    results = []
    for i, value in enumerate(req.sensor_values):
        recent = req.sensor_values[max(0, i - 6):i]
        res = predictor.anomaly_score(value, req.utility, recent, (req.start_hour + i) % 24)
        results.append({"index": i, "value": value, "fault": res["fault"], "anomaly_score": res["score"],
                        "severity": _severity_from_score(res["score"]) if res["fault"] else None})
    return {"results": results, "total": len(results), "faults_detected": sum(r["fault"] for r in results),
            "timestamp": _now()}


# ------------------------------------------------------------------------- image
@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...), description: Optional[str] = Form(None)):
    """
    Validates an uploaded photo. No labelled image dataset exists yet, so pixels are NOT classified;
    if a description is sent with the photo it is triaged by the text models instead.
    """
    from PIL import Image, UnidentifiedImageError

    try:
        image = Image.open(io.BytesIO(await file.read()))
        image.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="File is not a readable image")
    body = {"success": True, "image": {"width": image.width, "height": image.height, "format": image.format},
            "image_model": None, "requiresHumanReview": True,
            "note": "Image classification is not trained yet; a dispatcher should review the photo."}
    if description:
        t = orchestrator.run(description=description)
        body["analysis"] = {"category": t["category"], "severity": t["severity"],
                            "confidence": t["category_confidence"], "source": "text_models"}
    return body


# ------------------------------------------------------------------------- analytics
@app.post("/analytics/fault-trends")
def fault_trends(req: AnalyticsRequest):
    """Aggregate real fault records supplied by the backend (no fabricated numbers)."""
    recs = req.records
    hours = [datetime.fromisoformat(str(r["createdAt"]).replace("Z", "+00:00")).hour
             for r in recs if r.get("createdAt")]
    resolution = {}
    for r in recs:
        if r.get("createdAt") and r.get("completedAt"):
            start = datetime.fromisoformat(str(r["createdAt"]).replace("Z", "+00:00"))
            end = datetime.fromisoformat(str(r["completedAt"]).replace("Z", "+00:00"))
            resolution.setdefault(r.get("severity", "unknown"), []).append((end - start).total_seconds() / 3600)
    return {"success": True, "total": len(recs),
            "category_distribution": dict(Counter(r.get("type") or r.get("category") for r in recs)),
            "severity_distribution": dict(Counter(r.get("severity") for r in recs)),
            "status_distribution": dict(Counter(r.get("status") for r in recs)),
            "hourly_distribution": dict(sorted(Counter(hours).items())),
            "avg_resolution_hours": {k: round(sum(v) / len(v), 2) for k, v in resolution.items()},
            "timestamp": _now()}


# ------------------------------------------------------------------------- training
@app.post("/train")
def train():
    """Retrain every model from the dataset on disk. Disabled unless ALLOW_TRAINING=true."""
    if os.getenv("ALLOW_TRAINING", "false").lower() != "true":
        raise HTTPException(status_code=403, detail="Training is disabled; set ALLOW_TRAINING=true")
    metrics = predictor.retrain()
    return {"success": True, "trained_at": metrics["trained_at"], "seconds": metrics["training_seconds"],
            "category_macro_f1": metrics["category"]["test"]["macro_f1"],
            "severity_macro_f1": metrics["severity"]["test"]["macro_f1"],
            "anomaly_f1": metrics["anomaly"]["test"]["f1"]}
