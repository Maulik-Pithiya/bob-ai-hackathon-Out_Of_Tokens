"""
src/api/main.py
FastAPI backend — wires simulation, prediction, and optimization together.
Exposes REST endpoints consumed by the React dashboard.

Person D owns this module.
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Adjust Python path so modules resolve correctly regardless of cwd
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.simulation.generator import generate_schedule, save_to_json
from src.prediction.predictor import predict_congestion, get_flagged_slots, summarize_predictions
from src.optimization.optimizer import optimize, assignments_to_dicts

app = FastAPI(
    title="PortPulse API",
    description="Container Congestion Predictor & Port Operations Optimiser",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# In-memory state (reset on each /simulate call)
# ──────────────────────────────────────────────────────────────
_state: dict = {}

DEMO_SCENARIO_PATH = ROOT / "demo" / "scenario_congested.json"


def _load_state():
    return _state


# ──────────────────────────────────────────────────────────────
# Pydantic request/response models
# ──────────────────────────────────────────────────────────────
class SimulateRequest(BaseModel):
    seed: int = 42
    congestion_scenario: bool = False
    congestion_hour: int = 24
    congestion_burst_size: int = 6
    berth_offline_id: Optional[str] = None
    arrivals_per_hour: float = 1.2


class SimulateResponse(BaseModel):
    vessel_count: int
    berth_count: int
    crane_count: int
    base_ts: float
    message: str


class PredictResponse(BaseModel):
    summary: dict
    flagged_slots: List[dict]
    all_slots: List[dict]


class OptimizeResponse(BaseModel):
    metrics: dict
    assignments: List[dict]


class FullPipelineResponse(BaseModel):
    simulation: dict
    prediction: dict
    optimization: dict


# ──────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "PortPulse API"}


@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    """
    Generate a synthetic vessel schedule and store it in memory.
    Call this before /predict or /optimize.
    """
    vessels, berths, cranes, base_ts = generate_schedule(
        seed=req.seed,
        arrivals_per_hour=req.arrivals_per_hour,
        congestion_scenario=req.congestion_scenario,
        congestion_hour=req.congestion_hour,
        congestion_burst_size=req.congestion_burst_size,
        berth_offline_id=req.berth_offline_id,
    )
    _state.update({
        "vessels": vessels,
        "berths": berths,
        "cranes": cranes,
        "base_ts": base_ts,
    })
    return SimulateResponse(
        vessel_count=len(vessels),
        berth_count=len(berths),
        crane_count=len(cranes),
        base_ts=base_ts,
        message=f"Generated {len(vessels)} vessels over 72h window."
        + (" [CONGESTION SCENARIO ACTIVE]" if req.congestion_scenario else ""),
    )


@app.get("/predict", response_model=PredictResponse)
def predict(include_all_slots: bool = Query(False, description="Include all 72h slots, not just flagged ones")):
    """
    Run congestion prediction on the current simulation state.
    Returns risk scores per berth per 2-hour time slot.
    """
    if "vessels" not in _state:
        return {"error": "No simulation data. Call /simulate first."}

    slots = predict_congestion(
        vessels=_state["vessels"],
        berths=_state["berths"],
        base_ts=_state["base_ts"],
    )
    flagged = get_flagged_slots(slots)
    summary = summarize_predictions(slots)

    return PredictResponse(
        summary=summary,
        flagged_slots=[s.to_dict() for s in flagged],
        all_slots=[s.to_dict() for s in slots] if include_all_slots else [],
    )


@app.post("/optimize", response_model=OptimizeResponse)
def run_optimize():
    """
    Run the greedy optimizer using current simulation + prediction data.
    Returns berth/crane assignments and before/after wait-time metrics.
    """
    if "vessels" not in _state:
        return {"error": "No simulation data. Call /simulate first."}

    slots = predict_congestion(
        vessels=_state["vessels"],
        berths=_state["berths"],
        base_ts=_state["base_ts"],
    )
    flagged = get_flagged_slots(slots)

    assignments, metrics = optimize(
        vessels=_state["vessels"],
        berths=_state["berths"],
        cranes=_state["cranes"],
        base_ts=_state["base_ts"],
        flagged_slots=flagged,
    )
    _state["assignments"] = assignments
    _state["metrics"] = metrics

    return OptimizeResponse(
        metrics=metrics,
        assignments=assignments_to_dicts(assignments),
    )


@app.post("/pipeline", response_model=FullPipelineResponse)
def full_pipeline(req: SimulateRequest):
    """
    Run the full simulate → predict → optimize pipeline in one call.
    Ideal for the demo: single request, full story.
    """
    # 1. Simulate
    sim_resp = simulate(req)

    # 2. Predict
    pred_resp = predict()

    # 3. Optimize
    opt_resp = run_optimize()

    return FullPipelineResponse(
        simulation=sim_resp.model_dump(),
        prediction=pred_resp.model_dump(),
        optimization=opt_resp.model_dump(),
    )


@app.get("/demo/scenario")
def demo_scenario():
    """
    Return the pre-baked congestion scenario (fallback for live demo).
    """
    if DEMO_SCENARIO_PATH.exists():
        with open(DEMO_SCENARIO_PATH) as f:
            return json.load(f)
    # Generate and cache it on first call
    vessels, berths, cranes, base_ts = generate_schedule(
        seed=99,
        congestion_scenario=True,
        congestion_hour=24,
        congestion_burst_size=8,
        berth_offline_id="B05",
    )
    slots = predict_congestion(vessels=vessels, berths=berths, base_ts=base_ts)
    flagged = get_flagged_slots(slots)
    assignments, metrics = optimize(
        vessels=vessels, berths=berths, cranes=cranes,
        base_ts=base_ts, flagged_slots=flagged
    )
    payload = {
        "vessels": [v.to_dict() for v in vessels],
        "berths": [b.to_dict() for b in berths],
        "cranes": [c.to_dict() for c in cranes],
        "flagged_slots": [s.to_dict() for s in flagged],
        "prediction_summary": summarize_predictions(slots),
        "assignments": assignments_to_dicts(assignments),
        "metrics": metrics,
    }
    DEMO_SCENARIO_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(DEMO_SCENARIO_PATH, "w") as f:
        json.dump(payload, f, indent=2)
    return payload


@app.get("/assignments")
def get_assignments():
    """Return the current optimized assignment plan."""
    if "assignments" not in _state:
        return {"error": "No assignments yet. Call /optimize or /pipeline first."}
    return {
        "assignments": assignments_to_dicts(_state["assignments"]),
        "metrics": _state.get("metrics", {}),
    }


# ──────────────────────────────────────────────────────────────
# Dev entry point
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
