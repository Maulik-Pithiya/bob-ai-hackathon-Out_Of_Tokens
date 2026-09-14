"""
src/prediction/predictor.py
Congestion risk scorer — predicts which berths will become bottlenecks
and WHEN, over a 72-hour horizon.

Approach: queue-length forecasting.
- For each 2-hour time slot, count vessels expected to be queuing.
- Combine with berth availability to produce a 0–1 risk score.
- Deliberately simple and explainable — a working predictor beats a
  sophisticated one that doesn't run.

Person A owns this module.
"""

import sys
import os
from dataclasses import dataclass, field
from typing import List, Dict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from src.shared.models import Vessel, Berth, Crane, VesselClass, BerthStatus

SLOT_HOURS = 2          # time-slot granularity in hours
SECONDS_PER_HOUR = 3600
RISK_THRESHOLD_HIGH = 0.65
RISK_THRESHOLD_CRITICAL = 0.85

# Average service time (hours) by vessel class — used for queue projection
SERVICE_HOURS_BY_CLASS = {
    VesselClass.SMALL:  4.0,
    VesselClass.MEDIUM: 8.0,
    VesselClass.LARGE:  14.0,
    VesselClass.VLARGE: 22.0,
}


@dataclass
class CongestionSlot:
    """Risk score for one berth in one time slot."""
    berth_id: str
    slot_index: int          # 0-based slot number (slot 0 = hours 0–2, etc.)
    hour_start: float        # offset hours from simulation start
    hour_end: float
    expected_arrivals: int   # vessels whose ETA falls in this slot
    expected_queue: float    # projected queue length (arrivals - capacity)
    risk_score: float        # 0.0 → safe, 1.0 → critical
    flagged: bool            # True if above RISK_THRESHOLD_HIGH
    flag_level: str          # "OK" | "HIGH" | "CRITICAL"

    def to_dict(self) -> dict:
        return {
            "berth_id": self.berth_id,
            "slot_index": self.slot_index,
            "hour_start": round(self.hour_start, 1),
            "hour_end": round(self.hour_end, 1),
            "expected_arrivals": self.expected_arrivals,
            "expected_queue": round(self.expected_queue, 2),
            "risk_score": round(self.risk_score, 3),
            "flagged": self.flagged,
            "flag_level": self.flag_level,
        }


def _avg_service_hours(vessels: List[Vessel]) -> float:
    if not vessels:
        return 8.0
    total = sum(SERVICE_HOURS_BY_CLASS.get(v.vessel_class, 8.0) for v in vessels)
    return total / len(vessels)


def _berth_accepts(berth: Berth, vessel: Vessel) -> bool:
    return vessel.vessel_class in berth.compatible_classes


def predict_congestion(
    vessels: List[Vessel],
    berths: List[Berth],
    base_ts: float,
    window_hours: int = 72,
) -> List[CongestionSlot]:
    """
    Return a flat list of CongestionSlot records covering all berths × all
    time slots in the window.

    base_ts : Unix timestamp of simulation start (t=0).
    """
    num_slots = window_hours // SLOT_HOURS
    slots: List[CongestionSlot] = []

    # Active (non-maintenance) berths only
    active_berths = [b for b in berths if b.status == BerthStatus.AVAILABLE]

    for berth in berths:
        # Track when this berth's "queue pointer" is — i.e. when it will be free
        berth_free_at_slot: float = 0.0  # in fractional slot units

        for s in range(num_slots):
            h_start = s * SLOT_HOURS
            h_end = h_start + SLOT_HOURS
            ts_start = base_ts + h_start * SECONDS_PER_HOUR
            ts_end = base_ts + h_end * SECONDS_PER_HOUR

            # Vessels arriving in this slot that can use this berth
            arriving = [
                v for v in vessels
                if ts_start <= v.eta < ts_end and _berth_accepts(berth, v)
            ]
            n_arriving = len(arriving)

            # Capacity per slot = 1 vessel if berth available, else 0
            if berth.status == BerthStatus.MAINTENANCE:
                capacity = 0.0
                # Capacity across ALL active berths accepting these vessels
                alt_berths = [
                    b for b in active_berths if b is not berth
                    and any(_berth_accepts(b, v) for v in arriving)
                ]
                total_capacity = len(alt_berths) * 1.0
            else:
                capacity = 1.0  # one vessel served per slot per berth
                # penalise if this berth is still busy from prior slot
                if berth_free_at_slot > s:
                    capacity = 0.0
                total_capacity = capacity

            avg_svc = _avg_service_hours(arriving)
            slots_needed = avg_svc / SLOT_HOURS

            # Update when this berth will be free
            if n_arriving > 0 and capacity > 0:
                berth_free_at_slot = s + slots_needed

            # Queue = vessels arriving - capacity available (clamped to 0)
            queue = max(0.0, n_arriving - total_capacity)

            # Risk score: sigmoid-like based on queue depth vs arrivals
            if n_arriving == 0:
                risk = 0.0
            else:
                # Ratio of unserved vessels, boosted by berth being offline
                base_risk = min(queue / max(n_arriving, 1), 1.0)
                # Extra pressure if berth is still busy from previous slot
                overload_penalty = 0.2 if (berth.status != BerthStatus.MAINTENANCE and berth_free_at_slot > s + 1) else 0.0
                maintenance_penalty = 0.3 if berth.status == BerthStatus.MAINTENANCE else 0.0
                risk = min(base_risk + overload_penalty + maintenance_penalty, 1.0)

            if risk >= RISK_THRESHOLD_CRITICAL:
                flag_level = "CRITICAL"
            elif risk >= RISK_THRESHOLD_HIGH:
                flag_level = "HIGH"
            else:
                flag_level = "OK"

            slots.append(CongestionSlot(
                berth_id=berth.berth_id,
                slot_index=s,
                hour_start=float(h_start),
                hour_end=float(h_end),
                expected_arrivals=n_arriving,
                expected_queue=queue,
                risk_score=risk,
                flagged=(risk >= RISK_THRESHOLD_HIGH),
                flag_level=flag_level,
            ))

    return slots


def get_flagged_slots(slots: List[CongestionSlot]) -> List[CongestionSlot]:
    """Return only slots flagged as HIGH or CRITICAL risk."""
    return [s for s in slots if s.flagged]


def summarize_predictions(slots: List[CongestionSlot]) -> dict:
    """High-level summary dict for the API / dashboard."""
    flagged = get_flagged_slots(slots)
    critical = [s for s in flagged if s.flag_level == "CRITICAL"]
    by_berth: Dict[str, List[CongestionSlot]] = {}
    for s in flagged:
        by_berth.setdefault(s.berth_id, []).append(s)

    earliest_flag = None
    if flagged:
        earliest_flag = min(s.hour_start for s in flagged)

    return {
        "total_slots_analyzed": len(slots),
        "flagged_slots": len(flagged),
        "critical_slots": len(critical),
        "berths_at_risk": list(by_berth.keys()),
        "earliest_congestion_hour": earliest_flag,
        "risk_by_berth": {
            bid: {
                "max_risk": round(max(s.risk_score for s in ss), 3),
                "flagged_windows": len(ss),
            }
            for bid, ss in by_berth.items()
        },
    }
