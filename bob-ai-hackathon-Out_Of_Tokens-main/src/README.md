# Source Code — PortPulse

All project source code lives in this directory, organized by pipeline stage.

## Structure

```
src/
  shared/          ← Domain types (single source of truth — never redefine elsewhere)
  simulation/      ← Synthetic 72h vessel schedule generator
  prediction/      ← Congestion risk scorer (berth × time-slot)
  optimization/    ← Greedy berth/crane assignment optimizer
  api/             ← FastAPI backend (wires all modules, exposes REST endpoints)
  dashboard/       ← Next.js 14 dashboard (72h ops plan visualization)
  .env.example     ← Environment variable template (copy to .env — never commit .env)
```

## Module Ownership

| Module | Owner | Key Files |
|---|---|---|
| `shared/` | All | `models.py` — Vessel, Berth, Crane, VesselClass, Priority, BerthStatus |
| `simulation/` | Person A | `generator.py` — `generate_schedule()`, `build_port()` |
| `prediction/` | Person A | `predictor.py` — `predict_congestion()`, `CongestionSlot` |
| `optimization/` | Person B | `optimizer.py` — `optimize()`, `AssignmentResult` |
| `api/` | Person D | `main.py` — FastAPI app, all REST endpoints |
| `dashboard/` | Person C | `app/page.tsx`, `components/` — React UI panels |

## Quick Start

```bash
# Backend (from repository root)
pip install -r requirements.txt
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (in a separate terminal)
cd src/dashboard
npm install
npm run dev
```

See [`docs/setup-guide.md`](../docs/setup-guide.md) for the full setup guide.

## Key Conventions

- **`src/shared/models.py`** is the only place domain types are defined. Never copy or redefine `Vessel`, `Berth`, `Crane`, or their enums in another module — always import from `src.shared.models`.
- All modules accept and return plain Python dataclasses (not Pydantic models). The API layer handles serialization via `.to_dict()`.
- Environment variables: copy `src/.env.example` to `src/.env` and fill in values. The `NEXT_PUBLIC_API_URL` for the frontend lives in `src/dashboard/.env.local` (copy from `src/dashboard/.env.local.example`).

## What NOT to Commit

- `.env` files with real secrets (already in `.gitignore`)
- `node_modules/` or Python virtual environments (`venv/`, `.venv/`)
- Build artefacts (`src/dashboard/.next/`, `__pycache__/`, `*.pyc`)
- Large generated data files (put in `data/raw/` which is gitignored if large)
