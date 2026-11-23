import pandas as pd
import pytest

from ml.config import CATEGORIES, LOCATION_TYPES, SENSOR_DIR, SEVERITIES, SPLIT_DIR, TIMES_OF_DAY
from ml.generate_dataset import build_reports, build_sensor_series, split_reports


@pytest.fixture(scope="module")
def splits():
    return {k: pd.read_csv(SPLIT_DIR / f"{k}.csv") for k in ("train", "val", "test")}


def test_split_sizes_are_70_15_15(splits):
    total = sum(len(v) for v in splits.values())
    assert total == 9000
    assert len(splits["train"]) / total == pytest.approx(0.70, abs=0.005)
    assert len(splits["val"]) / total == pytest.approx(0.15, abs=0.005)
    assert len(splits["test"]) / total == pytest.approx(0.15, abs=0.005)


def test_no_leakage_between_splits(splits):
    names = list(splits)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            assert not set(splits[a]["report_id"]) & set(splits[b]["report_id"])
            assert not set(splits[a]["description"]) & set(splits[b]["description"]), f"{a}/{b} share text"


def test_labels_and_fields_are_valid(splits):
    df = pd.concat(splits.values())
    assert set(df["category"]) == set(CATEGORIES)
    assert set(df["severity"]) == set(SEVERITIES)
    assert set(df["location_type"]) <= set(LOCATION_TYPES)
    assert set(df["time_of_day"]) <= set(TIMES_OF_DAY)
    assert (df["population_density"] > 0).all()
    assert df["description"].str.len().min() > 10


def test_splits_are_stratified(splits):
    base = splits["train"]["category"].value_counts(normalize=True)
    for name in ("val", "test"):
        share = splits[name]["category"].value_counts(normalize=True)
        assert (share - base).abs().max() < 0.02
        sev = splits[name]["severity"].value_counts(normalize=True)
        assert (sev - splits["train"]["severity"].value_counts(normalize=True)).abs().max() < 0.02


def test_generation_is_reproducible():
    a, b = build_reports(n=3000), build_reports(n=3000)
    pd.testing.assert_frame_equal(a, b)
    assert len(split_reports(a)["test"]) == 450


def test_sensor_split_is_chronological():
    parts = {k: pd.read_csv(SENSOR_DIR / f"{k}.csv") for k in ("train", "val", "test")}
    assert parts["train"]["hour_index"].max() < parts["val"]["hour_index"].min()
    assert parts["val"]["hour_index"].max() < parts["test"]["hour_index"].min()
    for p in parts.values():
        assert 0.01 < p["is_anomaly"].mean() < 0.08


def test_sensor_generation_is_reproducible():
    pd.testing.assert_frame_equal(build_sensor_series(sensors_per_type=1, hours=96),
                                  build_sensor_series(sensors_per_type=1, hours=96))
