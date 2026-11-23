"""Shared paths and constants for the Valtryek ML pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # ai-service/
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
SPLIT_DIR = DATA_DIR / "splits"
SENSOR_DIR = DATA_DIR / "sensors"
ARTIFACT_DIR = ROOT / "artifacts"
FIGURE_DIR = ARTIFACT_DIR / "figures"

CATEGORIES = ["electricity", "water", "road", "streetlight", "sewage", "gas"]
SEVERITIES = ["low", "medium", "high", "critical"]
LOCATION_TYPES = ["residential", "commercial", "industrial", "hospital", "school", "highway"]
TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"]

RANDOM_SEED = 42
SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}

RESPONSE_SLA = {
    "critical": "< 30 minutes",
    "high": "< 2 hours",
    "medium": "< 24 hours",
    "low": "< 72 hours",
}
