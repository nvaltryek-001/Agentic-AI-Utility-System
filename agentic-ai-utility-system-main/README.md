# Valtryek: application source

The full project documentation (features, architecture, dataset, results, setup, API and testing) is in the
[repository README](../README.md).

| Folder | What it is |
|---|---|
| `ai-service/` | FastAPI service: trained models, 5-agent triage pipeline, dataset, tests ([datasheet](ai-service/DATASET.md), [model card](ai-service/artifacts/MODEL_CARD.md)) |
| `backend/` | Express + MongoDB + Socket.io API |
| `frontend/` | React (Vite) web app and Capacitor Android project |
| `database/` | seed scripts |
| `docs/history/` | development logs from earlier phases (historical; the root README is the source of truth) |

Quick start: `docker compose up --build` from this folder.
