# Datasheet - Valtryek fault-report & sensor corpora

| | Fault reports | Sensor telemetry |
|---|---|---|
| Files | `data/raw/fault_reports.csv`, `data/splits/{train,val,test}.csv` | `data/sensors/{train,val,test}.csv` |
| Rows | 9,000 (6,300 / 1,350 / 1,350) | 17,280 (12,096 / 2,304 / 2,880) |
| Task | category (6 classes) and severity (4 ordinal classes) | binary anomaly detection |
| Split | stratified on category × severity, 70 / 15 / 15 | chronological: days 1-21 / 22-25 / 26-30 |
| Generator | `python -m ml.generate_dataset` (seed 42, reproducible byte for byte) | same |

## Why synthetic?

No public, licence-clean dataset of **Indian municipal utility complaints with severity labels** exists,
and the project had none of its own. Rather than train on random numbers (what the service did before),
the corpus is generated from an explicit, documented process so that:

- the train / validation / test protocol is real and reproducible;
- the models learn genuine structure (scenario, place, time, density) and can be compared fairly with the
  old hand-written rules;
- the files can be swapped for real data later without touching the training code.

**These numbers are not a claim about real-world accuracy.** Before deployment, retrain on real reports
(see "Using real data" below).

## Fault-report schema

| column | type | description |
|---|---|---|
| `report_id` | str | `VR-00001` … |
| `description` | str | free-text complaint as a citizen would type it |
| `category` | label | electricity, water, road, streetlight, sewage, gas |
| `severity` | label | low, medium, high, critical |
| `location_type` | str | residential, commercial, industrial, hospital, school, highway |
| `time_of_day` | str | morning, afternoon, evening, night |
| `population_density` | int | people / km² around the fault (log-normal per location type) |
| `locality` | str | neighbourhood named in the report (Indian cities) |

### How a report is built

1. **Scenario** - one of 44 fault scenarios (e.g. *live wire sparking*, *manhole open*, *gas pipe hit by
   excavation*), each with 2-4 phrasings and a latent hazard score (12-86).
2. **Context** - location type, time of day, population density, how long it has lasted, and an optional
   escalation sentence ("An old man already fell.").
3. **Text noise** - typos in ~18% of reports, SMS spelling (`pls`, `ppl`, `u`), lower-casing, stripped
   punctuation, Hinglish closers (`jaldi theek karo please`). Category vocabularies overlap on purpose
   (drain / water, pole / wire, pipeline / gas).
4. **Urgency is noisy** - "URGENT" openers appear in 8% of ordinary reports and 30% of dangerous ones, so
   the word alone is a weak signal (as with real citizens).

### Severity rubric

```
score = hazard(scenario)
      + place  {hospital 18, school 14, highway 10, commercial 6, industrial 4, residential 0}
      + density {>15k: 10, >8k: 6, >3k: 3}
      + 8 if night and category in {electricity, streetlight, road, gas}   (+2 morning/evening)
      + duration (0-6) + escalation (0-9) + Normal(0, 6)
severity = low < 33 ≤ medium < 52 ≤ high < 72 ≤ critical
```

Then **6%** of severity labels are moved one level up or down (annotator disagreement) and **1.5%** of
category labels are swapped to a related category. Those two sources of noise cap achievable scores
below 1.0, which is intentional.

### Label distribution (all 9,000 rows)

| category | share | | severity | share |
|---|---|---|---|---|
| electricity | 23.8% | | low | 12.0% |
| water | 20.5% | | medium | 31.8% |
| road | 18.6% | | high | 32.8% |
| streetlight | 15.2% | | critical | 23.3% |
| sewage | 14.1% | | | |
| gas | 7.8% | | | |

## Sensor schema

24 sensors (6 each for electricity, water, gas, sewage) × 720 hourly readings, normalised 0-100 with a
daily cycle and Gaussian noise. About 3% of hours carry an injected fault - `spike`, `drop`, `stuck`
(reading frozen at 0 or 99.5) or `drift` - with `is_anomaly = 1` and the `fault_type`.
Derived columns: `delta` (hour-on-hour change) and `rolling_mean_6h` (mean of the 6 *previous* readings,
so no future information leaks into a feature). The split is by time, not random, so the model is always
tested on days it has never seen.

## Quality checks (enforced by `tests/test_dataset.py`)

- split ratios are 70 / 15 / 15 (±0.5%) and stratified (class shares within 2 points)
- no `report_id` **and no identical description text** appears in two splits
- every label and context field is from the allowed set
- regeneration with the same seed is identical
- sensor splits are strictly chronological

## Using real data

Any CSV with the columns above drops straight in: write it to `data/splits/{train,val,test}.csv`
(or to `data/raw/fault_reports.csv` and reuse `split_reports()`), then run `python -m ml.train`.
Good sources to map onto this schema: exported `Fault` documents from the app's own MongoDB
(`type → category`, `severity`, `location`), or municipal 311 / grievance-portal exports with a manual
severity review.
