import io

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)


def test_health_and_info():
    assert client.get("/health").json()["models_loaded"] is True
    info = client.get("/model-info").json()
    assert info["category"]["test"]["macro_f1"] > 0.9
    assert info["image_model"] is None


def test_triage_endpoint():
    r = client.post("/agents/triage", json={"description": "live wire sparking near the school gate",
                                            "time_of_day": "night", "population_density": 9000})
    assert r.status_code == 200
    body = r.json()
    assert body["category"] == "electricity"
    assert body["severity"] in ("high", "critical")
    assert len(body["trace"]) == 5


def test_triage_rejects_empty_description():
    assert client.post("/agents/triage", json={"description": ""}).status_code == 422


def test_classify_and_severity():
    assert client.post("/classify", json={"description": "pothole on the road"}).json()["category"] == "road"
    r = client.post("/predict-severity", json={"description": "gas pipeline caught fire", "category": "gas",
                                               "location_type": "school", "time_of_day": "night",
                                               "population_density": 12000}).json()
    assert r["severity"] == "critical" and r["requires_immediate_attention"]


def test_sensor_endpoints():
    r = client.post("/predict", json={"sensor_value": 96, "recent_values": [50, 51, 49, 52, 50, 51],
                                      "hour_of_day": 14}).json()
    assert r["fault"] is True and "severity" in r
    batch = client.post("/batch-predict", json={"sensor_values": [50, 51, 50, 97, 50, 49]}).json()
    assert batch["faults_detected"] >= 1 and batch["results"][3]["fault"] is True
    assert client.post("/predict", json={"sensor_value": 150}).status_code == 422


def test_analyze_image_is_honest():
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (32, 24), "gray").save(buf, format="PNG")
    r = client.post("/analyze-image", files={"file": ("x.png", buf.getvalue(), "image/png")},
                    data={"description": "pipe burst flooding the road"}).json()
    assert r["image_model"] is None and r["requiresHumanReview"] is True
    assert r["analysis"]["category"] == "water"
    bad = client.post("/analyze-image", files={"file": ("x.png", b"not an image", "image/png")})
    assert bad.status_code == 400


def test_analytics_uses_supplied_records():
    recs = [{"type": "water", "severity": "high", "status": "completed", "createdAt": "2026-11-01T10:00:00Z",
             "completedAt": "2026-11-01T14:00:00Z"},
            {"type": "road", "severity": "low", "status": "reported", "createdAt": "2026-11-02T22:00:00Z"}]
    r = client.post("/analytics/fault-trends", json={"records": recs}).json()
    assert r["total"] == 2 and r["category_distribution"] == {"water": 1, "road": 1}
    assert r["avg_resolution_hours"] == {"high": 4.0}


def test_training_disabled_by_default():
    assert client.post("/train").status_code == 403
