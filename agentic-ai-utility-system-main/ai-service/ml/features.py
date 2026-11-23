"""Feature builders shared by training and inference (one definition = no train/serve skew)."""
from __future__ import annotations

import math
import re
from typing import Iterable, Optional

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder

from .config import CATEGORIES, LOCATION_TYPES, TIMES_OF_DAY

SEVERITY_COLUMNS = ["description", "category", "location_type", "time_of_day", "population_density"]
SENSOR_UTILITIES = ["electricity", "water", "gas", "sewage"]
SENSOR_FEATURES = ["value", "delta", "residual", "hour_sin", "hour_cos"] + [f"u_{u}" for u in SENSOR_UTILITIES]


def clean_text(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"\d+", " 0 ", text)            # house / sector numbers carry no signal
    return re.sub(r"\s+", " ", text).strip()


def text_union() -> FeatureUnion:
    """Word n-grams for meaning + char n-grams for robustness to typos and SMS spelling."""
    return FeatureUnion([
        ("word", TfidfVectorizer(preprocessor=clean_text, ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
        ("char", TfidfVectorizer(preprocessor=clean_text, analyzer="char_wb", ngram_range=(3, 5), min_df=3,
                                 sublinear_tf=True, max_features=40000)),
    ])


def _log_density(x):
    return np.log1p(np.asarray(x, dtype=float)).reshape(-1, 1) / 10.0


def severity_preprocessor() -> ColumnTransformer:
    return ColumnTransformer([
        ("text", text_union(), "description"),
        ("cats", OneHotEncoder(categories=[CATEGORIES, LOCATION_TYPES, TIMES_OF_DAY], handle_unknown="ignore"),
         ["category", "location_type", "time_of_day"]),
        ("density", Pipeline([("log", FunctionTransformer(_log_density, feature_names_out="one-to-one"))]),
         "population_density"),
    ])


def severity_frame(description: str, category: str, location_type: str, time_of_day: str,
                   population_density: float) -> pd.DataFrame:
    return pd.DataFrame([{
        "description": description or "",
        "category": category if category in CATEGORIES else "electricity",
        "location_type": location_type if location_type in LOCATION_TYPES else "residential",
        "time_of_day": time_of_day if time_of_day in TIMES_OF_DAY else "afternoon",
        "population_density": max(0.0, float(population_density or 0)),
    }])


# ---------------------------------------------------------------- sensors
def sensor_features_frame(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "value": df["value"].astype(float),
        "delta": df["delta"].astype(float),
        "residual": (df["value"] - df["rolling_mean_6h"]).astype(float),
        "hour_sin": np.sin(2 * np.pi * df["hour_of_day"] / 24),
        "hour_cos": np.cos(2 * np.pi * df["hour_of_day"] / 24),
    })
    for u in SENSOR_UTILITIES:
        out[f"u_{u}"] = (df["utility"] == u).astype(float)
    return out[SENSOR_FEATURES]


def sensor_point(value: float, utility: str = "electricity", recent_values: Optional[Iterable[float]] = None,
                 hour_of_day: Optional[int] = None, baseline: Optional[float] = None) -> pd.DataFrame:
    """Build one feature row from an API request. Missing context falls back to neutral values."""
    recent = [float(v) for v in (recent_values or [])][-6:]
    prev = recent[-1] if recent else value
    rolling = float(np.mean(recent)) if recent else (baseline if baseline is not None else value)
    hour = 12 if hour_of_day is None else int(hour_of_day) % 24
    row = {"value": float(value), "delta": float(value) - prev, "residual": float(value) - rolling,
           "hour_sin": math.sin(2 * math.pi * hour / 24), "hour_cos": math.cos(2 * math.pi * hour / 24)}
    for u in SENSOR_UTILITIES:
        row[f"u_{u}"] = 1.0 if utility == u else 0.0
    return pd.DataFrame([row])[SENSOR_FEATURES]
