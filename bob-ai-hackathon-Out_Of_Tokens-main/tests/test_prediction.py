"""
tests/test_prediction.py
Unit tests for the congestion prediction module.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.shared.models import VesselClass, Priority, BerthStatus
from src.simulation.generator import generate_schedule, build_port
from src.prediction.predictor import (
    predict_congestion,
    get_flagged_slots,
    summarize_predictions,
    RISK_THRESHOLD_HIGH,
)


def test_congestion_scenario_produces_flagged_slots():
    """Congestion injection must produce at least one flagged slot."""
    vessels_cong, berths_cong, _, base_ts_cong = generate_schedule(
        seed=42,
        arrivals_per_hour=1.2,
        congestion_scenario=True,
        congestion_hour=24,
        congestion_burst_size=10,
        berth_offline_id="B05",
    )
    slots_cong = predict_congestion(vessels_cong, berths_cong, base_ts_cong)
    flagged_cong = get_flagged_slots(slots_cong)

    assert len(slots_cong) > 0, "Should produce at least one slot"
    assert len(flagged_cong) > 0, "Congestion scenario must have at least one flagged slot"
    # Critical slots must exist when burst + berth offline are both active
    critical = [s for s in flagged_cong if s.flag_level == "CRITICAL"]
    assert len(critical) > 0, "Congestion scenario should produce at least one CRITICAL slot"


def test_congestion_scenario_raises_risk():
    """Injected congestion burst should produce at least one flagged slot."""
    vessels, berths, cranes, base_ts = generate_schedule(
        seed=42,
        congestion_scenario=True,
        congestion_hour=24,
        congestion_burst_size=8,
        berth_offline_id="B05",
    )
    slots = predict_congestion(vessels, berths, base_ts)
    flagged = get_flagged_slots(slots)
    assert len(flagged) > 0, "Congestion injection should produce at least one flagged slot"


def test_maintenance_berth_has_elevated_risk():
    """A berth in MAINTENANCE should score higher risk in congested windows."""
    vessels, berths, cranes, base_ts = generate_schedule(
        seed=10,
        congestion_scenario=True,
        berth_offline_id="B05",
    )
    slots = predict_congestion(vessels, berths, base_ts)
    b05_slots = [s for s in slots if s.berth_id == "B05"]
    assert len(b05_slots) > 0
    # At least one slot for B05 should be flagged when it is in maintenance
    max_risk = max(s.risk_score for s in b05_slots)
    assert max_risk > 0.2, f"Maintenance berth should have elevated risk, got {max_risk}"


def test_summary_structure():
    """summarize_predictions should return expected keys."""
    vessels, berths, cranes, base_ts = generate_schedule(seed=5, congestion_scenario=True)
    slots = predict_congestion(vessels, berths, base_ts)
    summary = summarize_predictions(slots)
    for key in ("total_slots_analyzed", "flagged_slots", "critical_slots",
                "berths_at_risk", "earliest_congestion_hour"):
        assert key in summary, f"Missing key in summary: {key}"
