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
from pydantic import BaseModel, field_validator

# Adjust Python path so modules resolve correctly regardless of cwd
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.simulation.generator import generate_schedule, save_to_json, inject_vessel, make_injected_vessel
from src.shared.models import VesselClass, Priority
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
    Returns all_slots so the heatmap can render the full green/amber/red spread.
    """
    # 1. Simulate
    sim_resp = simulate(req)

    # 2. Predict — include all slots so the heatmap shows genuine green cells
    pred_resp = predict(include_all_slots=True)

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
# Live What-If Vessel Injection
# ──────────────────────────────────────────────────────────────

class InjectVesselInput(BaseModel):
    """
    Describes the single vessel to inject into the current schedule.

    Fields map directly to the Vessel dataclass in src/shared/models.py —
    no new fields are invented here.
    """
    vessel_class: VesselClass        # validated automatically by Pydantic enum coercion
    eta_hour: int                    # 0-72 inclusive; validated below
    priority: Priority               # validated automatically by Pydantic enum coercion
    cargo_volume_teu: int            # 1-30000

    @field_validator("eta_hour")
    @classmethod
    def eta_hour_in_window(cls, v: int) -> int:
        if not (0 <= v <= 72):
            raise ValueError(f"eta_hour must be between 0 and 72 (got {v})")
        return v

    @field_validator("cargo_volume_teu")
    @classmethod
    def cargo_volume_positive(cls, v: int) -> int:
        if not (1 <= v <= 30000):
            raise ValueError(f"cargo_volume_teu must be between 1 and 30000 (got {v})")
        return v


class InjectRequest(BaseModel):
    vessel: InjectVesselInput


class InjectedPipelineResponse(BaseModel):
    simulation: dict
    prediction: dict
    optimization: dict
    diff: dict
    base_schedule_auto_generated: bool


@app.post("/pipeline/inject", response_model=InjectedPipelineResponse)
def inject_pipeline(req: InjectRequest):
    """
    Inject a single what-if vessel into the current in-memory schedule and
    re-run predict + optimize, returning the full pipeline result PLUS a diff
    showing exactly what changed (slot tier changes, wait delta, rerouted vessels).

    If no schedule exists in _state yet, one is auto-generated with default
    seed 42 and base_schedule_auto_generated=True is set in the response so
    the frontend can surface a notice to the user.

    Existing endpoints (/simulate, /predict, /optimize, /pipeline,
    /demo/scenario) are completely unaffected by this endpoint.
    """
    # ── 1. Ensure we have a base schedule ──────────────────────
    auto_generated = False
    if "vessels" not in _state:
        vessels_base, berths, cranes, base_ts = generate_schedule(seed=42)
        _state.update({
            "vessels": vessels_base,
            "berths": berths,
            "cranes": cranes,
            "base_ts": base_ts,
        })
        auto_generated = True

    vessels_base: list = _state["vessels"]
    berths: list = _state["berths"]
    cranes: list = _state["cranes"]
    base_ts: float = _state["base_ts"]

    # ── 2. Build the injected vessel ───────────────────────────
    new_vessel = make_injected_vessel(
        vessel_class=req.vessel.vessel_class,
        eta_hour=req.vessel.eta_hour,
        priority=req.vessel.priority,
        cargo_volume_teu=req.vessel.cargo_volume_teu,
        base_ts=base_ts,
    )

    # ── 3. Pre-injection predict + optimize (baseline) ─────────
    slots_before = predict_congestion(
        vessels=vessels_base, berths=berths, base_ts=base_ts
    )
    flagged_before = get_flagged_slots(slots_before)
    assignments_before, metrics_before = optimize(
        vessels=vessels_base, berths=berths, cranes=cranes,
        base_ts=base_ts, flagged_slots=flagged_before,
    )
    # Index pre-injection assignments by vessel_id for diff lookup
    assign_before_by_id = {a.vessel_id: a for a in assignments_before}

    # ── 4. Post-injection predict + optimize ───────────────────
    vessels_augmented = inject_vessel(vessels_base, new_vessel)
    slots_after = predict_congestion(
        vessels=vessels_augmented, berths=berths, base_ts=base_ts
    )
    flagged_after = get_flagged_slots(slots_after)
    assignments_after, metrics_after = optimize(
        vessels=vessels_augmented, berths=berths, cranes=cranes,
        base_ts=base_ts, flagged_slots=flagged_after,
    )
    assign_after_by_id = {a.vessel_id: a for a in assignments_after}

    # ── 5. Compute diff ────────────────────────────────────────
    # 5a. Slot tier changes
    # Build a lookup: (berth_id, slot_index) -> CongestionSlot
    before_slot_map = {(s.berth_id, s.slot_index): s for s in slots_before}
    after_slot_map  = {(s.berth_id, s.slot_index): s for s in slots_after}

    slot_tier_changes = []
    for key, s_after in after_slot_map.items():
        s_before = before_slot_map.get(key)
        if s_before is None:
            continue
        if s_before.flag_level != s_after.flag_level:
            slot_tier_changes.append({
                "berth_id": s_after.berth_id,
                "hour_start": s_after.hour_start,
                "hour_end": s_after.hour_end,
                "risk_before": round(s_before.risk_score, 3),
                "risk_after": round(s_after.risk_score, 3),
                "tier_before": s_before.flag_level,
                "tier_after": s_after.flag_level,
            })

    # 5b. Wait delta
    avg_before = metrics_before["avg_wait_after_hours"]
    avg_after  = metrics_after["avg_wait_after_hours"]

    # 5c. Rerouted vessels — any vessel (excluding the injected one) whose
    #     berth_id differs between the pre- and post-injection runs AND whose
    #     wait-time change exceeds REROUTE_MIN_DELTA_HOURS.  This prevents
    #     trivial greedy re-sort artefacts (< 2 h delta) from flooding the UI.
    REROUTE_MIN_DELTA_HOURS = 2.0
    rerouted = []
    for vid, a_after in assign_after_by_id.items():
        if vid == new_vessel.vessel_id:
            continue
        a_before = assign_before_by_id.get(vid)
        if a_before is not None and a_before.berth_id != a_after.berth_id:
            wait_delta = a_after.wait_time_hours - a_before.wait_time_hours
            if abs(wait_delta) >= REROUTE_MIN_DELTA_HOURS:
                rerouted.append({
                    "vessel_id": vid,
                    "original_berth_id": a_before.berth_id,
                    "new_berth_id": a_after.berth_id,
                    "wait_time_before": round(a_before.wait_time_hours, 2),
                    "wait_time_hours": round(a_after.wait_time_hours, 2),
                    "wait_delta_hours": round(wait_delta, 2),
                })

    # 5d. Injected vessel's own assignment
    injected_assignment = assign_after_by_id.get(new_vessel.vessel_id)
    injected_assignment_dict = None
    if injected_assignment:
        injected_assignment_dict = {
            "berth_id": injected_assignment.berth_id,
            "service_start": injected_assignment.service_start,
            "wait_time_hours": injected_assignment.wait_time_hours,
        }

    diff = {
        "slot_tier_changes": slot_tier_changes,
        "avg_wait_delta_hours": round(avg_after - avg_before, 3),
        "avg_wait_before_injection": round(avg_before, 3),
        "avg_wait_after_injection": round(avg_after, 3),
        "rerouted_vessels": rerouted,
        "injected_vessel_id": new_vessel.vessel_id,
        "injected_vessel_assignment": injected_assignment_dict,
    }

    # ── 6. Assemble response (same shape as /pipeline + diff) ──
    summary_after = summarize_predictions(slots_after)
    return InjectedPipelineResponse(
        simulation={
            "vessel_count": len(vessels_augmented),
            "berth_count": len(berths),
            "crane_count": len(cranes),
            "base_ts": base_ts,
            "message": (
                f"Injected {new_vessel.vessel_id} "
                f"({req.vessel.vessel_class.value}, {req.vessel.priority.value}, "
                f"ETA hour {req.vessel.eta_hour})."
            ),
        },
        prediction={
            "summary": summary_after,
            "flagged_slots": [s.to_dict() for s in flagged_after],
            "all_slots": [s.to_dict() for s in slots_after],
        },
        optimization={
            "metrics": metrics_after,
            "assignments": assignments_to_dicts(assignments_after),
        },
        diff=diff,
        base_schedule_auto_generated=auto_generated,
    )


# ──────────────────────────────────────────────────────────────
# Dev entry point
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
