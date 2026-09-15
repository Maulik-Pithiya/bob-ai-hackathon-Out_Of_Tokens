# 🚢 PortPulse — Container Congestion Predictor & Port Operations Optimiser

> **IBM Bob AI Innovation Hackathon — Problem Statement L1: Logistics & Ports**

PortPulse predicts container port congestion **before** it happens, automatically reroutes vessels and reassigns berths/cranes, and outputs a 72-hour operations plan a shift supervisor can act on.

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Out Of Tokens |
| **Track** | Logistics & Ports (L1) |
| **Members** | Person A (Simulation + Prediction), Person B (Optimization), Person C (Dashboard), Person D (API + Integration) |

---

## 🎯 Problem Statement

In 2021, 100+ container ships sat offshore at LA/Long Beach for weeks, costing global supply chains $10B+. The root cause: reactive, spreadsheet-based berth management that detected congestion only after ships were already queuing. Port operators had no predictive visibility — by the time they acted, the backlog was already catastrophic.

---

## 💡 Solution

PortPulse is an end-to-end congestion prediction and optimization system. It simulates a 72-hour vessel arrival schedule, scores every berth × time-slot with a congestion risk index, and runs a greedy optimizer that reroutes vessels and assigns cranes to minimize wait time — producing a clean ops plan before the queue ever forms.

**Pipeline:** `simulate → predict → optimize → visualize`

---

## ✨ Key Features

- **Predictive congestion scoring** — risk score per berth per 2-hour slot, flagging HIGH (>65%) and CRITICAL (>85%) windows up to 72 hours ahead
- **Injectable congestion scenario** — burst arrivals + berth offline for a vivid before/after demo
- **Greedy optimizer** — reroutes vessels away from flagged windows, allocates cranes to minimize turnaround time
- **Quantified improvement** — average wait time before vs after optimization displayed as a metric
- **72-hour assignment timeline** — vessel → berth → crane → time slot, ready for a shift supervisor
- **Pre-baked demo fallback** — `demo/scenario_congested.json` loads instantly if live compute is slow

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python 3.12, TypeScript |
| **Backend** | FastAPI, Uvicorn |
| **Frontend** | Next.js 14, React 18, Recharts, Tailwind CSS |
| **Prediction** | Rule-based queue-length forecasting (stdlib only) |
| **Optimization** | Greedy heuristic assignment (OR-Tools CP-SAT as v2 path) |
| **Data** | Synthetic in-memory (CSV/JSON flat files) |
| **Dev Assistant** | IBM Bob |

---

## 📁 Repository Structure

```
src/
  shared/          ← Vessel, Berth, Crane dataclasses (single source of truth)
  simulation/      ← Synthetic 72h vessel schedule generator
  prediction/      ← Congestion risk scorer
  optimization/    ← Greedy berth/crane assignment optimizer
  api/             ← FastAPI backend (wires all modules)
  dashboard/       ← Next.js dashboard (72h ops plan UI)
data/
  schema.md        ← Field definitions
  raw/             ← Generated data files (gitignored if large)
demo/
  scenario_congested.json   ← Pre-baked fallback scenario
  demo_script.md            ← Timed 2.5-minute walkthrough
docs/
  architecture.md  ← Pipeline diagram + module responsibilities
  decisions.md     ← Tradeoff log
  assumptions.md   ← Synthetic data + scope cuts, for judges
tests/             ← Unit tests for prediction + optimization
```

---

## ⚡ How to Run

### 1. Backend (Python)

```bash
# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload 
or
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs available at http://localhost:8000/docs

### 2. Frontend (Next.js)

```bash
cd src/dashboard
npm install
npm run dev
```

Dashboard available at http://localhost:3000

### 3. Run tests

```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

### 4. Generate data manually

```bash
# Normal schedule
python -m src.simulation.generator

# Congestion scenario
python -m src.simulation.generator --congestion --out data/raw/schedule_congested.json
```

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 📋 Demo Script | [demo/demo_script.md](demo/demo_script.md) |
| 📦 Fallback Scenario | [demo/scenario_congested.json](demo/scenario_congested.json) |

---

## ⚠️ Known Limitations

- Data is entirely synthetic — no live AIS feed integration
- Single port only; multi-port network effects are out of scope
- Optimizer is greedy (not globally optimal); OR-Tools CP-SAT noted as v2
- API state is in-memory; resets on server restart
- No authentication or production infrastructure

---

## 🏅 What We're Most Proud Of

The end-to-end working pipeline: a single POST to `/pipeline` runs simulation, prediction, and optimization and returns a complete 72-hour ops plan with a quantified before/after wait-time improvement — all in under a second, with no external dependencies beyond FastAPI.
