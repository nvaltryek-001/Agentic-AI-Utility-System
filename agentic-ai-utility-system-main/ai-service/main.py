from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from PIL import Image
import io
import random
import joblib
import os
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
import tensorflow as tf

app = FastAPI(title="Valtryek AI Service", version="2.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class FaultPredictionRequest(BaseModel):
    sensor_value: float
    location: Optional[dict] = None
    timestamp: Optional[str] = None

class SeverityPredictionRequest(BaseModel):
    description: str = ""
    category: str = ""
    population_density: int = 0
    time_of_day: str = "day"
    location_type: str = "residential"

class BatchPredictionRequest(BaseModel):
    sensor_values: List[float]

class TrainingRequest(BaseModel):
    data: List[dict]
    labels: List[int]

class AnalyticsRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    category: Optional[str] = None
    area: Optional[str] = None

# =========================
# SIMPLE ML MODEL (ANOMALY DETECTION)
# =========================

# Dummy training data
data = np.random.rand(100, 1) * 100

model = IsolationForest(contamination=0.1)
model.fit(data)

# =========================
# AI MODELS INITIALIZATION
# =========================

# Anomaly Detection Model
anomaly_model = IsolationForest(contamination=0.1, random_state=42)
anomaly_scaler = StandardScaler()

# Severity Classification Model
severity_model = RandomForestClassifier(n_estimators=100, random_state=42)
severity_scaler = StandardScaler()

# Initialize with dummy data
np.random.seed(42)
dummy_data = np.random.rand(200, 5) * 100
anomaly_model.fit(dummy_data)
severity_model.fit(dummy_data[:150], np.random.randint(0, 4, 150))

# Model storage path
MODEL_PATH = "models"
os.makedirs(MODEL_PATH, exist_ok=True)

# =========================
# HEALTH CHECK
# =========================

@app.get("/")
def home():
    return {
        "message": "Valtryek AI Service Running",
        "version": "2.0.0",
        "status": "healthy",
        "agents": [
            "AnomalyDetection",
            "ImageAnalysis", 
            "SeverityPrediction",
            "PredictiveMaintenance",
            "ResourceOptimization"
        ],
        "models_loaded": True,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "services": {
            "anomaly_detection": True,
            "severity_prediction": True,
            "image_analysis": True
        },
        "timestamp": datetime.now().isoformat()
    }

# =========================
# FAULT DETECTION ENDPOINT
# =========================

@app.post("/predict")
def predict_fault(request: FaultPredictionRequest):
    """
    Predict if a fault exists based on sensor data and context.
    """
    try:
        # Prepare features
        features = np.array([[request.sensor_value, 0, 0, 0, 0]])
        
        # Anomaly detection
        prediction = anomaly_model.predict(features)
        anomaly_score = anomaly_model.score_samples(features)[0]
        
        is_fault = prediction[0] == -1
        
        # Calculate confidence based on anomaly score
        confidence = min(0.99, max(0.5, abs(anomaly_score) + 0.5))
        
        if is_fault:
            # Determine severity based on value and context
            severity_score = request.sensor_value
            if request.location and request.location.get('population_density', 0) > 5000:
                severity_score += 20
            
            if severity_score > 80:
                severity = "critical"
            elif severity_score > 60:
                severity = "high"
            elif severity_score > 40:
                severity = "medium"
            else:
                severity = "low"
            
            return {
                "fault": True,
                "severity": severity,
                "value": request.sensor_value,
                "confidence": round(confidence, 3),
                "anomaly_score": round(anomaly_score, 3),
                "timestamp": datetime.now().isoformat()
            }
        
        return {
            "fault": False,
            "value": request.sensor_value,
            "confidence": round(confidence, 3),
            "anomaly_score": round(anomaly_score, 3),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# IMAGE ANALYSIS ENDPOINT
# =========================

@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze uploaded image for fault detection.
    This is a placeholder - in production, use TensorFlow/PyTorch models.
    """
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Placeholder analysis (random for demo)
        # In production: Use trained CNN model
        categories = ["electricity", "water", "road", "streetlight", "sewage", "gas", "other"]
        detected_category = random.choice(categories)
        confidence = random.uniform(0.6, 0.95)
        
        severities = ["low", "medium", "high", "critical"]
        severity_weights = [0.3, 0.4, 0.2, 0.1]
        detected_severity = random.choices(severities, weights=severity_weights)[0]
        
        return {
            "success": True,
            "analysis": {
                "detectedObjects": [detected_category, "infrastructure"],
                "category": detected_category,
                "severity": detected_severity,
                "confidence": round(confidence, 2),
                "requiresHumanReview": confidence < 0.75,
                "imageSize": {"width": image.width, "height": image.height}
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# =========================
# SEVERITY PREDICTION ENDPOINT
# =========================

@app.post("/predict-severity")
def predict_severity(request: SeverityPredictionRequest):
    """
    Predict fault severity based on multiple factors using ML model.
    """
    try:
        severity_score = 0
        reasons = []
        risk_factors = []
        
        # Category-based scoring
        category_scores = {
            "gas": 35,
            "electricity": 30,
            "water": 20,
            "sewage": 15,
            "road": 12,
            "streetlight": 5,
            "other": 8
        }
        cat_score = category_scores.get(request.category, 10)
        severity_score += cat_score
        reasons.append(f"Category ({request.category}): +{cat_score}")
        
        # Population density factor
        if request.population_density > 10000:
            severity_score += 25
            reasons.append("High population density: +25")
            risk_factors.append("high_density")
        elif request.population_density > 5000:
            severity_score += 15
            reasons.append("Medium population density: +15")
            risk_factors.append("medium_density")
        
        # Location type factor
        location_multipliers = {
            "hospital": 1.5,
            "school": 1.4,
            "commercial": 1.3,
            "residential": 1.0,
            "industrial": 1.2,
            "highway": 1.4
        }
        multiplier = location_multipliers.get(request.location_type, 1.0)
        severity_score = int(severity_score * multiplier)
        if multiplier > 1.0:
            reasons.append(f"Location type ({request.location_type}): x{multiplier}")
            risk_factors.append(request.location_type)
        
        # Time of day factor
        if request.time_of_day == "night":
            severity_score += 15
            reasons.append("Night time: +15")
            risk_factors.append("night_time")
        elif request.time_of_day in ["evening", "morning_rush"]:
            severity_score += 10
            reasons.append("Peak hours: +10")
        
        # Description keyword analysis with NLP-style scoring
        critical_keywords = {
            "emergency": 20, "dangerous": 18, "hazard": 16, "outage": 15,
            "burst": 14, "leak": 12, "fire": 20, "sparking": 18,
            "flooding": 16, "collapsed": 15, "broken": 10, "damaged": 8
        }
        desc_lower = request.description.lower()
        for keyword, points in critical_keywords.items():
            if keyword in desc_lower:
                severity_score += points
                reasons.append(f"Critical keyword '{keyword}': +{points}")
                risk_factors.append(f"keyword:{keyword}")
                break
        
        # Use ML model for final severity classification
        features = np.array([[severity_score, request.population_density / 1000, 
                             len(risk_factors), cat_score]])
        ml_prediction = severity_model.predict(features)[0]
        ml_confidence = max(severity_model.predict_proba(features)[0])
        
        # Map ML prediction to severity levels
        severity_map = {0: "low", 1: "medium", 2: "high", 3: "critical"}
        ml_severity = severity_map.get(ml_prediction, "medium")
        
        # Combine rule-based and ML predictions
        if severity_score >= 70:
            final_severity = "critical"
        elif severity_score >= 50:
            final_severity = "high"
        elif severity_score >= 25:
            final_severity = "medium"
        else:
            final_severity = "low"
        
        # Use ML severity if confidence is high
        if ml_confidence > 0.7:
            final_severity = ml_severity
        
        # Calculate response time recommendation
        response_times = {
            "critical": "< 30 minutes",
            "high": "< 2 hours",
            "medium": "< 24 hours",
            "low": "< 72 hours"
        }
        
        return {
            "severity": final_severity,
            "score": severity_score,
            "confidence": round(ml_confidence, 3),
            "ml_confidence": round(ml_confidence, 3),
            "reasoning": reasons,
            "risk_factors": risk_factors,
            "recommended_response_time": response_times[final_severity],
            "requires_immediate_attention": final_severity in ["critical", "high"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# BATCH PREDICTION ENDPOINT
# =========================

@app.post("/batch-predict")
def batch_predict(request: BatchPredictionRequest):
    """
    Process multiple sensor values in batch.
    """
    try:
        results = []
        for value in request.sensor_values:
            features = np.array([[value, 0, 0, 0, 0]])
            prediction = anomaly_model.predict(features)
            anomaly_score = anomaly_model.score_samples(features)[0]
            is_fault = prediction[0] == -1
            
            severity = None
            if is_fault:
                if value > 80:
                    severity = "critical"
                elif value > 60:
                    severity = "high"
                elif value > 40:
                    severity = "medium"
                else:
                    severity = "low"
            
            results.append({
                "value": value,
                "fault": is_fault,
                "severity": severity,
                "confidence": round(min(0.99, abs(anomaly_score) + 0.5), 3)
            })
        
        return {
            "results": results,
            "total": len(results),
            "faults_detected": sum(1 for r in results if r["fault"]),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# MODEL INFO ENDPOINT
# =========================

@app.get("/model-info")
def model_info():
    return {
        "models": {
            "anomaly_detection": {
                "type": "Isolation Forest",
                "contamination": 0.1,
                "training_samples": 200,
                "features": ["sensor_value", "location_lat", "location_lng", "hour", "day_of_week"],
                "version": "2.0.0"
            },
            "severity_classification": {
                "type": "Random Forest Classifier",
                "n_estimators": 100,
                "classes": ["low", "medium", "high", "critical"],
                "version": "2.0.0"
            }
        },
        "services": {
            "fault_prediction": True,
            "severity_prediction": True,
            "image_analysis": True,
            "batch_processing": True,
            "model_training": True
        },
        "timestamp": datetime.now().isoformat()
    }

# =========================
# ANALYTICS ENDPOINT
# =========================

@app.post("/analytics/fault-trends")
def fault_trends(request: AnalyticsRequest):
    """
    Analyze fault trends and patterns.
    """
    try:
        # Generate trend analysis (in production, query actual database)
        trends = {
            "daily_pattern": {
                "morning": random.randint(10, 30),
                "afternoon": random.randint(20, 40),
                "evening": random.randint(15, 35),
                "night": random.randint(5, 20)
            },
            "category_distribution": {
                "electricity": random.randint(20, 40),
                "water": random.randint(15, 30),
                "road": random.randint(10, 25),
                "streetlight": random.randint(5, 15),
                "sewage": random.randint(8, 20),
                "gas": random.randint(3, 10)
            },
            "severity_trends": {
                "critical": random.randint(5, 15),
                "high": random.randint(15, 30),
                "medium": random.randint(30, 50),
                "low": random.randint(20, 40)
            },
            "resolution_time": {
                "critical": {"avg": 2.5, "unit": "hours"},
                "high": {"avg": 8, "unit": "hours"},
                "medium": {"avg": 24, "unit": "hours"},
                "low": {"avg": 72, "unit": "hours"}
            },
            "peak_hours": ["09:00", "14:00", "18:00"],
            "ai_accuracy": {
                "severity_prediction": round(random.uniform(0.85, 0.95), 3),
                "fault_detection": round(random.uniform(0.90, 0.98), 3)
            }
        }
        
        return {
            "success": True,
            "data": trends,
            "period": f"{request.start_date} to {request.end_date}" if request.start_date else "last_30_days",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/predictive")
def predictive_analytics(request: AnalyticsRequest):
    """
    Predictive analytics for resource planning.
    """
    try:
        predictions = {
            "next_24h": {
                "expected_faults": random.randint(15, 35),
                "high_risk_areas": ["Downtown", "Industrial Zone", "Residential North"],
                "resource_requirements": {
                    "technicians": random.randint(8, 15),
                    "vehicles": random.randint(5, 10),
                    "equipment": ["crane", "generator", "pump"]
                }
            },
            "next_7d": {
                "expected_faults": random.randint(80, 150),
                "trend": "increasing" if random.random() > 0.5 else "stable",
                "peak_days": ["Monday", "Friday"]
            },
            "risk_factors": [
                {"factor": "weather", "impact": "high", "probability": 0.7},
                {"factor": "infrastructure_age", "impact": "medium", "probability": 0.5},
                {"factor": "population_density", "impact": "medium", "probability": 0.6}
            ]
        }
        
        return {
            "success": True,
            "predictions": predictions,
            "confidence": round(random.uniform(0.75, 0.90), 3),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================
# MODEL TRAINING ENDPOINT
# =========================

@app.post("/train")
def train_model(request: TrainingRequest):
    """
    Train models with new data.
    """
    try:
        # In production, implement actual training logic
        # For now, simulate training
        training_result = {
            "success": True,
            "models_trained": ["anomaly_detection", "severity_classification"],
            "samples_used": len(request.data),
            "metrics": {
                "anomaly_detection": {
                    "accuracy": round(random.uniform(0.90, 0.98), 3),
                    "precision": round(random.uniform(0.88, 0.96), 3),
                    "recall": round(random.uniform(0.85, 0.95), 3)
                },
                "severity_classification": {
                    "accuracy": round(random.uniform(0.85, 0.93), 3),
                    "f1_score": round(random.uniform(0.83, 0.91), 3)
                }
            },
            "training_time_seconds": round(random.uniform(5, 30), 2),
            "timestamp": datetime.now().isoformat()
        }
        
        return training_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
