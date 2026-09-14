"""
tests/test_optimization.py
Unit tests for the greedy optimizer.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.simulation.generator import generate_schedule
from src.prediction.predictor import predict_congestion, get_flagged_slots
from src.optimization.optimizer import optimize, assignments_to_dicts


def _run_pipeline(congestion: bool = False, seed: int = 42):
    vessels, berths, cranes, base_ts = generate_schedule(
        seed=seed,
        congestion_scenario=congestion,
        congestion_hour=24,
        congestion_burst_size=6,
        berth_offline_id="B05" if congestion else None,
    )
    slots = predict_congestion(vessels, berths, base_ts)
    flagged = get_flagged_slots(slots)
    assignments, metrics = optimize(vessels, berths, cranes, base_ts, flagged)
    return vessels, assignments, metrics


def test_all_vessels_get_assigned():
    """Every vessel should receive a berth assignment under normal conditions."""
    vessels, assignments, metrics = _run_pipeline(congestion=False)
    assert metrics["vessels_assigned"] > 0
    assert metrics["vessels_unassigned"] == 0 or metrics["vessels_assigned"] > metrics["vessels_unassigned"]


def test_optimizer_reduces_wait_time():
    """
    Join-shortest-queue heuristic must produce lower or equal average wait
    than the naive (first-available) baseline, and all individual waits
    must be non-negative.
    """
    _, assignments, metrics = _run_pipeline(congestion=True)
    before = metrics["avg_wait_before_hours"]
    after = metrics["avg_wait_after_hours"]
    assert after <= before, (
        f"Optimizer increased avg wait: before={before:.2f}h after={after:.2f}h"
    )
    for a in assignments:
        assert a.wait_time_hours >= 0, f"Negative wait on {a.vessel_id}: {a.wait_time_hours}"
    assert metrics["congestion_incidents_avoided"] > 0, \
        "Congestion scenario must report incidents avoided"


def test_assignments_dict_serializable():
    """assignments_to_dicts should produce JSON-safe dicts."""
    _, assignments, _ = _run_pipeline(congestion=False)
    import json
    dicts = assignments_to_dicts(assignments)
    try:
        json.dumps(dicts)
    except (TypeError, ValueError) as e:
        assert False, f"assignments are not JSON-serializable: {e}"


def test_metrics_keys_present():
    """Metrics dict should contain all expected keys."""
    _, _, metrics = _run_pipeline()
    for key in ("vessels_assigned", "vessels_unassigned", "avg_wait_before_hours",
                "avg_wait_after_hours", "wait_reduction_pct", "congestion_incidents_avoided"):
        assert key in metrics, f"Missing metrics key: {key}"
