# Setup Guide — PortPulse

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed:

- [x] **Python 3.12+** — [Download](https://www.python.org/downloads/)
- [x] **Node.js 18+** (for the dashboard) — [Download](https://nodejs.org/)
- [x] **pip** (bundled with Python)
- [x] **npm** (bundled with Node.js)

No IBM Cloud account or external API keys are required. PortPulse runs entirely locally with no external service dependencies.

---

## Environment Variables

The backend has **no required environment variables** for local development — it runs on defaults.

If you wish to configure the API port, copy the example file:

```bash
cp src/.env.example src/.env
```

| Variable | Description | Required |
|---|---|---|
| `APP_PORT` | Backend port (default: `8000`) | No |
| `APP_ENV` | `development` or `production` | No |
| `WATSONX_API_KEY` | IBM watsonx.ai API key (not used in v1) | No |
| `WATSONX_PROJECT_ID` | IBM watsonx.ai project ID (not used in v1) | No |

For the **frontend**, copy the dashboard example:

```bash
cp src/dashboard/.env.local.example src/dashboard/.env.local
```

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (default: `http://localhost:8000`) | No |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/bob-ai-hackathon-Out_Of_Tokens.git
cd bob-ai-hackathon-Out_Of_Tokens

# 2. Install Python backend dependencies
pip install -r requirements.txt

# 3. Install frontend dependencies
cd src/dashboard
npm install
cd ../..
```

---

## Running the Application

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Backend (FastAPI)

```bash
# From the repository root
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API base:** `http://localhost:8000`
- **Interactive docs (Swagger UI):** `http://localhost:8000/docs`
- **Health check:** `http://localhost:8000/health`

### Terminal 2 — Frontend (Next.js)

```bash
cd src/dashboard
npm run dev
```

The dashboard will be available at: `http://localhost:3000`

---

## Running Tests

```bash
# Install test dependencies
pip install -r requirements-dev.txt

# Run all tests (from repository root)
pytest tests/ -v
```

Tests cover:
- `tests/test_prediction.py` — congestion risk scoring logic
- `tests/test_optimization.py` — greedy berth/crane assignment and metrics

---

## Quick Demo

The fastest way to see PortPulse working end-to-end:

**Option A — Browser (recommended)**

1. Start both backend and frontend (see above).
2. Open `http://localhost:3000`.
3. Click **⚠ Congestion Scenario** to run the full pipeline with a congestion scenario.
4. Observe the Congestion Risk Heatmap, Metrics Panel, and 72-Hour Assignment Plan.
5. Use the **🧪 Live What-If Vessel Injection** panel to inject a surprise vessel and see the live diff.

**Option B — API only (no frontend needed)**

```bash
# Run the full pipeline via curl (congestion scenario)
curl -s -X POST http://localhost:8000/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "seed": 42,
    "congestion_scenario": true,
    "congestion_hour": 24,
    "congestion_burst_size": 8,
    "berth_offline_id": "B05",
    "arrivals_per_hour": 1.2
  }' | python -m json.tool
```

**Option C — Pre-baked demo fallback**

```bash
# Returns the cached scenario instantly (no computation needed)
curl -s http://localhost:8000/demo/scenario | python -m json.tool
```

Or in the browser, click **📦 Load Demo Scenario**.

**Option D — Generate data manually**

```bash
# Normal schedule
python -m src.simulation.generator

# Congestion scenario
python -m src.simulation.generator --congestion --out data/raw/schedule_congested.json
```

---

## API Endpoints Summary

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/simulate` | Generate synthetic 72h vessel schedule |
| `GET` | `/predict` | Run congestion risk scoring (`?include_all_slots=true` for heatmap) |
| `POST` | `/optimize` | Run greedy berth/crane assignment |
| `POST` | `/pipeline` | Full simulate → predict → optimize in one call (includes `all_slots`) |
| `POST` | `/pipeline/inject` | Inject a what-if vessel; returns full pipeline + diff |
| `GET` | `/demo/scenario` | Return pre-baked congestion scenario |
| `GET` | `/assignments` | Return the current optimized assignment plan |

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `ModuleNotFoundError: No module named 'fastapi'` | Run `pip install -r requirements.txt` from the repository root |
| `ModuleNotFoundError: No module named 'src'` | Run uvicorn from the **repository root**, not from inside `src/` |
| `CORS error in browser` | Confirm the backend is running on port 8000; check `NEXT_PUBLIC_API_URL` in `src/dashboard/.env.local` |
| Frontend shows "is the backend running on port 8000?" | Start the backend first: `uvicorn src.api.main:app --port 8000 --reload` |
| `npm install` fails | Ensure Node.js 18+ is installed: `node --version` |
| Slow first `/demo/scenario` call | Normal — it generates and caches the scenario on first call. Subsequent calls are instant. |
| `pytest` import errors | Run `pip install -r requirements-dev.txt` and ensure you are running pytest from the repository root |
