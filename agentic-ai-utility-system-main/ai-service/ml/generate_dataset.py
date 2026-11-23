"""
Generate the Valtryek fault-report corpus and sensor-reading corpus.

    python -m ml.generate_dataset            # writes data/raw + data/splits + data/sensors

The corpus is SYNTHETIC but built to behave like real citizen complaints:
- 44 fault scenarios across 6 utility categories, each with several phrasings
- free-form noise: typos, SMS spelling, lower-case, Hinglish fillers, missing punctuation
- overlapping vocabulary between categories (drain/water, pole/wire, pipeline/gas ...)
- severity comes from a documented rubric over latent factors (scenario hazard, place,
  population density, time, duration, escalation) plus Gaussian noise, and ~6% of
  labels are shifted to an adjacent class to mimic annotator disagreement
- ~1.5% of category labels are flipped to a related category

Everything is seeded so the files are byte-for-byte reproducible.
See DATASET.md for the full datasheet.
"""
from __future__ import annotations

import math
import random
import re

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from .config import (CATEGORIES, LOCATION_TYPES, RANDOM_SEED, RAW_DIR, SENSOR_DIR,
                     SEVERITIES, SPLIT_DIR, SPLIT_RATIOS, TIMES_OF_DAY)

N_REPORTS = 9000

# --------------------------------------------------------------------------------------
# Scenario bank: (hazard score 0-100, [phrasings]).  Hazard is the latent severity driver.
# --------------------------------------------------------------------------------------
SCENARIOS: dict[str, list[tuple[int, list[str]]]] = {
    "electricity": [
        (78, ["a live wire is hanging low and sparking", "live electric wire fallen on the road",
              "naked wire touching the iron gate, people got a shock", "HT line snapped and lying on ground"]),
        (74, ["transformer caught fire", "transformer blast heard and smoke coming out",
              "big spark and fire from the transformer box", "transformer is burning"]),
        (55, ["complete power outage in the whole area", "no electricity for the entire block",
              "power cut in all houses since the storm", "whole street is without power"]),
        (40, ["severe voltage fluctuation damaging appliances", "voltage keeps dropping, fans running slow",
              "low voltage problem, AC and fridge not working", "lights flickering due to voltage issue"]),
        (46, ["electric pole is tilted and may fall", "electricity pole leaning dangerously after rain",
              "concrete power pole cracked at the base"]),
        (30, ["frequent tripping of power supply", "power goes off every hour for few minutes",
              "supply is tripping again and again"]),
        (14, ["electricity meter is not working", "meter box door broken and open",
              "meter reading display is blank", "wrong electricity meter reading"]),
        (22, ["loose cables hanging from the junction box", "tangled overhead cables hanging low",
              "cable TV and power wires mixed and sagging"]),
    ],
    "water": [
        (66, ["main water pipeline burst, road is flooding", "huge pipe burst and water gushing out",
              "water main broke and the street is under water"]),
        (58, ["contaminated muddy water coming from taps", "dirty smelly water in supply, people falling sick",
              "yellow water coming in the tap, not drinkable"]),
        (46, ["no water supply since yesterday", "water supply stopped in the whole colony",
              "taps are dry, no water coming"]),
        (32, ["very low water pressure in the morning supply", "water pressure is too low to reach the tank",
              "only a thin stream of water comes"]),
        (28, ["pipe leaking near the valve", "small leakage in the water line",
              "water leaking continuously from the joint"]),
        (36, ["public water tank overflowing and wasting water", "overhead tank overflow running onto road"]),
        (18, ["public tap is broken", "handpump handle broken", "community tap not closing properly"]),
        (40, ["fire hydrant is damaged and leaking", "hydrant valve broken, water spraying"]),
    ],
    "road": [
        (64, ["a big sinkhole has opened on the road", "road caved in, deep hole in the middle",
              "part of the road collapsed"]),
        (50, ["huge pothole causing accidents", "deep potholes, two bikes fell yesterday",
              "dangerous pothole filled with water, not visible"]),
        (30, ["many small potholes on the stretch", "road surface is broken and uneven",
              "bumpy road full of cracks"]),
        (44, ["road divider broken and blocks lying on road", "crash barrier damaged after accident"]),
        (38, ["open trench left after digging work", "road dug up and left without barricade",
              "construction pit on the road without warning sign"]),
        (52, ["fallen tree blocking the road", "big tree branch fell and blocked traffic",
              "uprooted tree lying across the lane"]),
        (16, ["speed breaker paint faded", "road markings not visible", "footpath tiles broken"]),
        (26, ["waterlogging on the road after rain", "rain water collected, road not visible"]),
    ],
    "streetlight": [
        (36, ["all streetlights are off on the stretch", "entire road is dark, no street lights working",
              "street lights not working, very dark at night"]),
        (20, ["one street light is not working", "street lamp bulb fused", "single lamp post not glowing"]),
        (12, ["street light stays on during the day", "lights burning in daytime, wasting power"]),
        (46, ["streetlight pole has exposed wires at the bottom", "lamp post junction box open with wires out",
              "light pole giving current when touched"]),
        (34, ["street light pole bent and may fall", "lamp post leaning after truck hit it"]),
        (18, ["street light flickering on and off", "lamp keeps blinking all night"]),
        (24, ["dark stretch near the bus stop, lights broken", "lights broken near the park, unsafe for women"]),
    ],
    "sewage": [
        (56, ["sewage overflowing into houses", "drain water entering homes, very bad smell",
              "sewer backflow into the ground floor flats"]),
        (60, ["manhole is open without cover", "manhole cover missing, child almost fell in",
              "uncovered manhole in the middle of the lane"]),
        (42, ["sewer line blocked and overflowing on road", "drain choked and dirty water on the street",
              "gutter is overflowing onto the road"]),
        (28, ["drain is clogged with garbage", "nala blocked with plastic waste", "storm drain jammed with silt"]),
        (22, ["foul smell from the sewer", "bad odour from the drain all day", "stinking gutter near shops"]),
        (36, ["broken drain cover slab", "drain slab collapsed, open drain", "drain cover cracked and sinking"]),
        (48, ["sewage mixing with drinking water line", "gutter water mixing in our water pipe"]),
    ],
    "gas": [
        (86, ["strong smell of gas near the pipeline", "gas leaking with hissing sound",
              "LPG pipeline leak, smell everywhere", "PNG pipe leaking, people evacuating"]),
        (82, ["fire near the gas line", "gas pipeline caught fire", "flames coming out of the gas valve"]),
        (58, ["gas pipeline damaged by digging work", "JCB hit the gas pipe", "gas pipe dented by excavation"]),
        (44, ["gas valve box broken and exposed", "gas regulator box open and damaged"]),
        (30, ["no PNG gas supply since morning", "gas supply stopped in the society", "gas pressure very low"]),
        (20, ["gas meter not working", "gas meter showing wrong reading", "gas pipe marker post broken"]),
    ],
}

# Related categories used for label noise (a confused annotator picks a neighbour)
RELATED = {"water": "sewage", "sewage": "water", "electricity": "streetlight",
           "streetlight": "electricity", "road": "sewage", "gas": "electricity"}

LOC_BONUS = {"residential": 0, "commercial": 6, "industrial": 4, "hospital": 18, "school": 14, "highway": 10}
LOC_WEIGHTS = [0.46, 0.18, 0.10, 0.08, 0.09, 0.09]
TIME_WEIGHTS = [0.27, 0.27, 0.26, 0.20]
NIGHT_SENSITIVE = {"electricity", "streetlight", "road", "gas"}

LOCALITIES = ["Saket", "Hauz Khas", "Mayur Vihar", "Janakpuri", "Rajouri Garden", "Model Town", "Dwarka",
              "Andheri East", "Thane West", "Kothrud", "Pimpri", "Whitefield", "Yelahanka", "Jayanagar",
              "Gachibowli", "Kukatpally", "Secunderabad", "Ambattur", "Velachery", "Salt Lake", "Howrah",
              "Navrangpura", "Bopal", "Vaishali Nagar", "Gomti Nagar", "Indiranagar", "Koramangala",
              "Sector 62 Noida", "Kalyani Nagar", "Banjara Hills"]
HOSPITAL_NAMES = ["Apollo", "Fortis", "AIIMS", "City", "Sai", "Max", "Ram Manohar Lohia", "Lotus", "Sanjeevani"]
SCHOOL_NAMES = ["DPS", "Kendriya Vidyalaya", "St. Mary's", "Sunrise Public", "Little Flower", "Govt. Senior Secondary"]
MALL_NAMES = ["City Centre", "Metro", "Phoenix", "Orion", "Green Valley", "Central"]

LOC_PHRASES = {
    "residential": ["in sector {n}", "in our colony lane {n}", "near block {L}", "in {area}", "outside house no {h}",
                    "in {area} residential society", "near the community park in {area}"],
    "commercial": ["in the main market of {area}", "near {mall} mall", "outside the shopping complex",
                   "at the busy market road in {area}", "near the bank ATM in {area}"],
    "industrial": ["in industrial area phase {n}", "near the factory gate", "in the {area} industrial estate",
                   "near the warehouse lane"],
    "hospital": ["near {hosp} hospital", "outside the hospital emergency gate", "next to the government hospital",
                 "in front of {hosp} hospital in {area}"],
    "school": ["in front of {school} school", "near the primary school gate", "next to {school} school in {area}",
               "on the road children take to school"],
    "highway": ["on NH-{nh}", "on the highway service lane", "near the toll plaza", "on the expressway near exit {n}",
                "on the ring road flyover"],
}
OPENERS = ["", "", "", "Please help,", "Complaint:", "Sir/Madam,", "Hello team,", "Reporting a problem -",
           "Kindly look into this:", "Respected officer,", "Hi,", "Attention please."]
URGENT_OPENERS = ["Urgent:", "EMERGENCY -", "Very urgent!!", "Immediate action needed:"]
DURATIONS = [("", 0), ("", 0), ("since morning", 1), ("for 3 days now", 4), ("since last week", 5),
             ("just now", 0), ("for the past 2 hours", 1), ("since yesterday night", 2), ("for over a month", 6)]
ESCALATIONS = [("", 0), ("", 0), ("", 0), ("", 0), ("Children play here.", 6), ("Someone could get hurt.", 7),
               ("An old man already fell.", 9), ("Traffic is stuck because of this.", 5),
               ("Nobody has come despite calls.", 2), ("Shops are affected.", 3)]
CLOSERS = ["", "", "", "Please fix it soon.", "Please send someone.", "Kindly do the needful.", "Thanks.",
           "Please resolve asap.", "jaldi theek karo please.", "bahut problem ho rahi hai.", "Pls check."]
SMS = {"please": "pls", "you": "u", "are": "r", "because": "coz", "people": "ppl", "immediately": "immdtly"}


def _typo(word: str, rng: random.Random) -> str:
    if len(word) < 4 or not word.isalpha():
        return word
    i = rng.randrange(1, len(word) - 1)
    op = rng.random()
    if op < 0.4:
        return word[:i] + word[i + 1] + word[i] + word[i + 2:]
    if op < 0.7:
        return word[:i] + word[i + 1:]
    return word[:i] + word[i] + word[i:]


def _noisify(text: str, rng: random.Random) -> str:
    words = text.split()
    if rng.random() < 0.18:
        k = rng.randrange(len(words))
        words[k] = _typo(words[k], rng)
    if rng.random() < 0.12:
        words = [SMS.get(w.lower(), w) for w in words]
    text = " ".join(words)
    if rng.random() < 0.30:
        text = text.lower()
    if rng.random() < 0.15:
        text = re.sub(r"[.,!:;-]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _fill(template: str, area: str, rng: random.Random) -> str:
    return template.format(n=rng.randint(1, 60), L=rng.choice("ABCDEFGHJK"), area=area, h=rng.randint(10, 999),
                           hosp=rng.choice(HOSPITAL_NAMES), school=rng.choice(SCHOOL_NAMES),
                           mall=rng.choice(MALL_NAMES), nh=rng.choice([8, 9, 24, 44, 48, 58]))


def _density(location_type: str, rng: random.Random) -> int:
    base = {"residential": 6500, "commercial": 11000, "industrial": 3000, "hospital": 9000,
            "school": 7000, "highway": 1500}[location_type]
    return int(max(150, rng.lognormvariate(math.log(base), 0.55)))


def _severity_score(hazard, location_type, density, time_of_day, category, duration_bonus, escalation_bonus, rng):
    score = hazard + LOC_BONUS[location_type]
    score += 10 if density > 15000 else 6 if density > 8000 else 3 if density > 3000 else 0
    if time_of_day == "night" and category in NIGHT_SENSITIVE:
        score += 8
    elif time_of_day in ("morning", "evening"):
        score += 2
    score += duration_bonus + escalation_bonus
    return score + rng.gauss(0, 6)


def _bucket(score: float) -> str:
    if score < 33:
        return "low"
    if score < 52:
        return "medium"
    if score < 72:
        return "high"
    return "critical"


def build_reports(n: int = N_REPORTS, seed: int = RANDOM_SEED) -> pd.DataFrame:
    rng = random.Random(seed)
    cat_weights = [0.24, 0.20, 0.19, 0.15, 0.14, 0.08]   # electricity is the most-reported utility
    rows, seen = [], set()
    attempts = 0
    while len(rows) < n and attempts < n * 20:
        attempts += 1
        category = rng.choices(CATEGORIES, weights=cat_weights)[0]
        hazard, phrasings = rng.choice(SCENARIOS[category])
        location_type = rng.choices(LOCATION_TYPES, weights=LOC_WEIGHTS)[0]
        time_of_day = rng.choices(TIMES_OF_DAY, weights=TIME_WEIGHTS)[0]
        density = _density(location_type, rng)
        duration, dur_bonus = rng.choice(DURATIONS)
        escalation, esc_bonus = rng.choice(ESCALATIONS)
        score = _severity_score(hazard, location_type, density, time_of_day, category, dur_bonus, esc_bonus, rng)

        # Citizens over-claim urgency; it is only weakly linked to true severity.
        opener = rng.choice(URGENT_OPENERS) if rng.random() < (0.08 + 0.22 * (score > 62)) else rng.choice(OPENERS)
        core = rng.choice(phrasings)
        area = rng.choice(LOCALITIES)
        place = _fill(rng.choice(LOC_PHRASES[location_type]), area, rng) if rng.random() < 0.65 else ""
        if not place and rng.random() < 0.5:
            place = f"in {area}"
        night = "at night" if time_of_day == "night" and "night" not in duration and rng.random() < 0.35 else ""
        parts = [opener, " ".join(p for p in [core, place, duration, night] if p) + ".",
                 escalation, rng.choice(CLOSERS)]
        text = _noisify(" ".join(p for p in parts if p), rng)
        if text in seen:
            continue
        seen.add(text)

        severity = _bucket(score)
        if rng.random() < 0.06:                       # adjacent-class annotator disagreement
            i = SEVERITIES.index(severity) + rng.choice([-1, 1])
            severity = SEVERITIES[min(max(i, 0), 3)]
        label_cat = RELATED[category] if rng.random() < 0.015 else category

        rows.append({"report_id": f"VR-{len(rows) + 1:05d}", "description": text, "category": label_cat,
                     "severity": severity, "location_type": location_type, "time_of_day": time_of_day,
                     "population_density": density, "locality": area})
    return pd.DataFrame(rows)


def split_reports(df: pd.DataFrame, seed: int = RANDOM_SEED):
    strata = df["category"] + "|" + df["severity"]
    holdout = SPLIT_RATIOS["val"] + SPLIT_RATIOS["test"]
    train, rest = train_test_split(df, test_size=holdout, stratify=strata, random_state=seed)
    rest_strata = rest["category"] + "|" + rest["severity"]
    val, test = train_test_split(rest, test_size=SPLIT_RATIOS["test"] / holdout, stratify=rest_strata,
                                 random_state=seed)
    return {"train": train.sort_values("report_id"), "val": val.sort_values("report_id"),
            "test": test.sort_values("report_id")}


# --------------------------------------------------------------------------------------
# Sensor corpus: normalised (0-100) readings from utility telemetry with injected faults
# --------------------------------------------------------------------------------------
SENSOR_PROFILES = {          # baseline mean, daily amplitude, noise sd
    "electricity": (52, 9, 2.5), "water": (45, 7, 2.0), "gas": (38, 3, 1.2), "sewage": (30, 8, 2.8),
}


def build_sensor_series(seed: int = RANDOM_SEED, sensors_per_type: int = 6, hours: int = 24 * 30) -> pd.DataFrame:
    rs = np.random.default_rng(seed)
    frames = []
    for utility, (mean, amp, sd) in SENSOR_PROFILES.items():
        for s in range(sensors_per_type):
            t = np.arange(hours)
            hour = t % 24
            value = mean + amp * np.sin((hour - 6) / 24 * 2 * np.pi) + rs.normal(0, sd, hours)
            label = np.zeros(hours, dtype=int)
            fault_type = np.array([""] * hours, dtype=object)
            # inject ~4% anomalous hours as spikes, drops, stuck readings and drifts
            n_events = rs.integers(6, 11)
            for _ in range(n_events):
                start = int(rs.integers(24, hours - 12))
                kind = rs.choice(["spike", "drop", "stuck", "drift"])
                length = int(rs.integers(1, 3)) if kind in ("spike", "drop") else int(rs.integers(3, 7))
                sl = slice(start, start + length)
                if kind == "spike":
                    value[sl] += rs.uniform(22, 40)
                elif kind == "drop":
                    value[sl] -= rs.uniform(22, 35)
                elif kind == "stuck":
                    value[sl] = rs.choice([0.0, 99.5])
                else:
                    value[sl] += np.linspace(8, 26, length)
                label[sl] = 1
                fault_type[sl] = kind
            value = np.clip(value, 0, 100)
            frames.append(pd.DataFrame({"sensor_id": f"{utility[:3].upper()}-{s + 1:02d}", "utility": utility,
                                        "hour_index": t, "hour_of_day": hour, "value": value.round(2),
                                        "is_anomaly": label, "fault_type": fault_type}))
    df = pd.concat(frames, ignore_index=True)
    df["delta"] = df.groupby("sensor_id")["value"].diff().fillna(0).round(2)
    df["rolling_mean_6h"] = (df.groupby("sensor_id")["value"]
                             .transform(lambda v: v.shift(1).rolling(6, min_periods=1).mean()).bfill().round(2))
    return df


def split_sensor_series(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Chronological split per sensor (days 1-21 train, 22-25 val, 26-30 test) - no future leakage."""
    day = df["hour_index"] // 24
    return {"train": df[day < 21], "val": df[(day >= 21) & (day < 25)], "test": df[day >= 25]}


def main() -> None:
    for d in (RAW_DIR, SPLIT_DIR, SENSOR_DIR):
        d.mkdir(parents=True, exist_ok=True)
    reports = build_reports()
    reports.to_csv(RAW_DIR / "fault_reports.csv", index=False)
    splits = split_reports(reports)
    for name, part in splits.items():
        part.to_csv(SPLIT_DIR / f"{name}.csv", index=False)
    print(f"Fault reports: {len(reports):,} rows -> " +
          ", ".join(f"{k}={len(v):,}" for k, v in splits.items()))
    print("  category mix:", reports["category"].value_counts(normalize=True).round(3).to_dict())
    print("  severity mix:", reports["severity"].value_counts(normalize=True).round(3).to_dict())

    sensors = build_sensor_series()
    for name, part in split_sensor_series(sensors).items():
        part.to_csv(SENSOR_DIR / f"{name}.csv", index=False)
        print(f"Sensors {name}: {len(part):,} readings, anomaly rate {part['is_anomaly'].mean():.3f}")


if __name__ == "__main__":
    main()
