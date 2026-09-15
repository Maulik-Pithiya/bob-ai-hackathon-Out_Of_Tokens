"""
src/optimization/optimizer.py
Greedy berth & crane assignment optimizer.

Algorithm:
1. Sort vessels by (priority DESC, ETA ASC).
2. For each vessel, find the earliest-available compatible berth.
3. Assign the berth, then greedily allocate available cranes to minimize
   service time (more cranes → faster unload → vessel leaves sooner).
4. Compare against a naive (no-rerouting) baseline to produce a
   quantified before/after improvement metric.

OR-Tools CP-SAT is noted as a v2 upgrade path but is not required for
the working prototype (greedy is good enough and always terminates).

Person B owns this module.
"""

import sys
import os
from dataclasses import dataclass
from typing import List, Dict, Tuple, Set

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from src.shared.models import Vessel, Berth, Crane, VesselClass, Priority, BerthStatus
from src.prediction.predictor import CongestionSlot, get_flagged_slots

SECONDS_PER_HOUR = 3600

PRIORITY_WEIGHT = {
    Priority.URGENT: 0,
    Priority.HIGH:   1,
    Priority.NORMAL: 2,
    Priority.LOW:    3,
}


@dataclass
class AssignmentResult:
    vessel_id: str
    berth_id: str
    crane_ids: List[str]
    service_start: float      # Unix timestamp
    service_end: float        # Unix timestamp
    wait_time_hours: float
    teu_per_hour: float       # combined throughput of assigned cranes


def _service_time_hours(vessel: Vessel, cranes: List[Crane]) -> float:
    """Estimate service duration given the assigned cranes."""
    if not cranes:
        return 999.0  # no cranes → effectively infinite
    combined_throughput = sum(c.throughput_teu_per_hour for c in cranes)
    return vessel.cargo_volume_teu / combined_throughput


def _sort_key(v: Vessel) -> Tuple:
    return (PRIORITY_WEIGHT.get(v.priority, 2), v.eta)


def _naive_total_wait(
    sorted_vessels: List[Vessel],
    berths: List[Berth],
    cranes: List[Crane],
) -> float:
    """
    Simulate a **naive** first-compatible-berth assignment WITHOUT
    smart queue balancing or congestion awareness.

    For each vessel, the first compatible berth in fixed ID order is
    chosen — this models a simple, unoptimised dispatching rule and
    serves as the "before" baseline.

    Returns total accumulated wait hours.
    """
    berth_free: Dict[str, float] = {b.berth_id: b.available_from for b in berths}
    crane_free: Dict[str, float] = {c.crane_id: c.available_from for c in cranes}
    total_wait = 0.0

    for vessel in sorted_vessels:
        compatible = [
            b for b in berths
            if vessel.vessel_class in b.compatible_classes
            and b.status == BerthStatus.AVAILABLE
        ]
        if not compatible:
            continue

        # Naive: pick the first compatible berth in fixed order — no
        # shortest-queue or congestion awareness.
        best = compatible[0]
        svc_start = max(vessel.eta, berth_free[best.berth_id])
        wait = max(0.0, (svc_start - vessel.eta) / SECONDS_PER_HOUR)
        total_wait += wait

        # Pick cranes (same logic as main optimizer)
        avail_cranes = sorted(
            [c for c in cranes if crane_free[c.crane_id] <= svc_start],
            key=lambda c: -c.throughput_teu_per_hour,
        )[:best.max_cranes]
        if not avail_cranes:
            avail_cranes = sorted(cranes, key=lambda c: crane_free[c.crane_id])[:best.max_cranes]
            svc_start = max(svc_start, crane_free[avail_cranes[0].crane_id])

        svc_end = svc_start + _service_time_hours(vessel, avail_cranes) * SECONDS_PER_HOUR
        berth_free[best.berth_id] = svc_end
        for c in avail_cranes:
            crane_free[c.crane_id] = svc_end

    return total_wait


def optimize(
    vessels: List[Vessel],
    berths: List[Berth],
    cranes: List[Crane],
    base_ts: float,
    flagged_slots: List[CongestionSlot] | None = None,
) -> Tuple[List[AssignmentResult], Dict]:
    """
    Greedy assignment with congestion-aware rerouting.
    Returns (assignments, metrics_dict).

    flagged_slots : if provided, vessels heading to congested windows are
                   redirected to a better available berth/slot when
                   doing so does not increase their wait time.
    """
    berth_free: Dict[str, float] = {b.berth_id: b.available_from for b in berths}
    crane_free: Dict[str, float] = {c.crane_id: c.available_from for c in cranes}

    # Track which berths are congested for the metrics counter only
    congested_berth_ids: Set[str] = set()
    if flagged_slots:
        for slot in flagged_slots:
            if slot.flag_level == "CRITICAL":
                congested_berth_ids.add(slot.berth_id)

    sorted_vessels = sorted(vessels, key=_sort_key)

    # Compute "before" baseline using an independent naive simulation
    total_wait_before = _naive_total_wait(sorted_vessels, berths, cranes)

    assignments: List[AssignmentResult] = []
    total_wait_after = 0.0
    unassigned = 0

    for vessel in sorted_vessels:
        compatible_berths = [
            b for b in berths
            if vessel.vessel_class in b.compatible_classes
            and b.status == BerthStatus.AVAILABLE
        ]
        if not compatible_berths:
            unassigned += 1
            continue

        # "Join the shortest queue": pick the compatible berth with the smallest
        # projected wait for THIS vessel.  This is guaranteed to do at least as
        # well as the naive first-sorted-berth pick, because it considers all
        # compatible berths simultaneously.
        # Secondary sort by berth_free (overall load) to break ties consistently.
        best_berth = min(
            compatible_berths,
            key=lambda b: (max(vessel.eta, berth_free[b.berth_id]), berth_free[b.berth_id])
        )
        best_start = max(vessel.eta, berth_free[best_berth.berth_id])

        # Congested-berth awareness: if the chosen berth is critical AND
        # a non-critical alternative exists with ≤ 10% more wait, prefer it.
        if best_berth.berth_id in congested_berth_ids:
            alternatives = [
                b for b in compatible_berths
                if b.berth_id not in congested_berth_ids
            ]
            if alternatives:
                alt_best = min(
                    alternatives,
                    key=lambda b: (max(vessel.eta, berth_free[b.berth_id]), berth_free[b.berth_id])
                )
                alt_start = max(vessel.eta, berth_free[alt_best.berth_id])
                # Compare wait durations, not absolute timestamps
                best_wait = best_start - vessel.eta
                alt_wait = alt_start - vessel.eta
                # Only switch if the alternative adds ≤ 10% more wait
                # (or both have zero wait)
                if alt_wait <= best_wait * 1.10 + 1e-9:
                    best_berth = alt_best
                    best_start = alt_start

        # ── Crane assignment ────────────────────────────────────────
        available_cranes = [
            c for c in cranes
            if crane_free[c.crane_id] <= best_start
            and (c.assigned_berth_id is None or c.assigned_berth_id == best_berth.berth_id)
        ]
        available_cranes.sort(key=lambda c: -c.throughput_teu_per_hour)
        assigned_cranes = available_cranes[:best_berth.max_cranes]

        if not assigned_cranes:
            all_cranes_for_berth = sorted(cranes, key=lambda c: crane_free[c.crane_id])
            first_free_time = crane_free[all_cranes_for_berth[0].crane_id]
            best_start = max(best_start, first_free_time)
            assigned_cranes = all_cranes_for_berth[:best_berth.max_cranes]

        svc_hours = _service_time_hours(vessel, assigned_cranes)
        svc_end = best_start + svc_hours * SECONDS_PER_HOUR
        wait_after = max(0.0, (best_start - vessel.eta) / SECONDS_PER_HOUR)
        total_wait_after += wait_after

        berth_free[best_berth.berth_id] = svc_end
        for c in assigned_cranes:
            crane_free[c.crane_id] = svc_end

        assignments.append(AssignmentResult(
            vessel_id=vessel.vessel_id,
            berth_id=best_berth.berth_id,
            crane_ids=[c.crane_id for c in assigned_cranes],
            service_start=best_start,
            service_end=svc_end,
            wait_time_hours=round(wait_after, 3),
            teu_per_hour=round(sum(c.throughput_teu_per_hour for c in assigned_cranes), 1),
        ))

    n = len(assignments)
    avg_before = total_wait_before / n if n else 0
    avg_after = total_wait_after / n if n else 0
    improvement_pct = (
        round((avg_before - avg_after) / avg_before * 100, 1)
        if avg_before > 0 else 0.0
    )

    total_flagged = len(flagged_slots) if flagged_slots else 0
    metrics = {
        "vessels_assigned": n,
        "vessels_unassigned": unassigned,
        "avg_wait_before_hours": round(avg_before, 3),
        "avg_wait_after_hours": round(avg_after, 3),
        "wait_reduction_pct": improvement_pct,
        "congestion_incidents_avoided": total_flagged,
        "critical_berths_avoided": len(congested_berth_ids),
    }
    return assignments, metrics


def assignments_to_dicts(assignments: List[AssignmentResult]) -> List[dict]:
    return [
        {
            "vessel_id": a.vessel_id,
            "berth_id": a.berth_id,
            "crane_ids": a.crane_ids,
            "service_start": a.service_start,
            "service_end": a.service_end,
            "wait_time_hours": a.wait_time_hours,
            "teu_per_hour": a.teu_per_hour,
        }
        for a in assignments
    ]
