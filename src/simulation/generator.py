"""
src/simulation/generator.py
Synthetic vessel schedule + port capacity generator.
Produces a 72-hour rolling window of vessel arrivals with optional
injected congestion scenarios for demo purposes.

Person A owns this module.
"""

import random
import json
import csv
import time
from datetime import datetime, timezone
from typing import List, Tuple
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))
from src.shared.models import (
    Vessel, Berth, Crane, VesselClass, Priority, BerthStatus
)

# ──────────────────────────────────────────────────────────────
# Port constants (fixed capacity)
# ──────────────────────────────────────────────────────────────
NUM_BERTHS = 8
NUM_CRANES = 20
SIMULATION_WINDOW_HOURS = 72
SECONDS_PER_HOUR = 3600

VESSEL_CLASS_TEU = {
    VesselClass.SMALL:  (1_000, 4_999),
    VesselClass.MEDIUM: (5_000, 9_999),
    VesselClass.LARGE:  (10_000, 14_999),
    VesselClass.VLARGE: (15_000, 24_000),
}

CRANE_THROUGHPUT_RANGE = (80, 140)   # TEU/hour per crane

BERTH_CONFIGS = [
    {"berth_id": "B01", "name": "Berth 1 – North Quay A",   "compatible_classes": [VesselClass.SMALL, VesselClass.MEDIUM], "max_cranes": 2},
    {"berth_id": "B02", "name": "Berth 2 – North Quay B",   "compatible_classes": [VesselClass.SMALL, VesselClass.MEDIUM], "max_cranes": 2},
    {"berth_id": "B03", "name": "Berth 3 – East Dock A",    "compatible_classes": [VesselClass.MEDIUM, VesselClass.LARGE], "max_cranes": 3},
    {"berth_id": "B04", "name": "Berth 4 – East Dock B",    "compatible_classes": [VesselClass.MEDIUM, VesselClass.LARGE], "max_cranes": 3},
    {"berth_id": "B05", "name": "Berth 5 – South Terminal A","compatible_classes": [VesselClass.LARGE, VesselClass.VLARGE],"max_cranes": 4},
    {"berth_id": "B06", "name": "Berth 6 – South Terminal B","compatible_classes": [VesselClass.LARGE, VesselClass.VLARGE],"max_cranes": 4},
    {"berth_id": "B07", "name": "Berth 7 – Deep Water A",   "compatible_classes": [VesselClass.VLARGE],                   "max_cranes": 4},
    {"berth_id": "B08", "name": "Berth 8 – Deep Water B",   "compatible_classes": [VesselClass.VLARGE],                   "max_cranes": 4},
]


def build_port(rng: random.Random | None = None) -> Tuple[List[Berth], List[Crane]]:
    """Instantiate the fixed port infrastructure.

    Parameters
    ----------
    rng : random.Random | None
        Seeded RNG for reproducible crane throughputs.
        Falls back to the global ``random`` module when *None*.
    """
    _rand = rng if rng is not None else random
    berths = [
        Berth(
            berth_id=cfg["berth_id"],
            name=cfg["name"],
            compatible_classes=cfg["compatible_classes"],
            max_cranes=cfg["max_cranes"],
        )
        for cfg in BERTH_CONFIGS
    ]

    cranes = []
    for i in range(1, NUM_CRANES + 1):
        cranes.append(Crane(
            crane_id=f"C{i:02d}",
            name=f"Crane {i:02d}",
            throughput_teu_per_hour=_rand.uniform(*CRANE_THROUGHPUT_RANGE),
        ))
    return berths, cranes


def _random_vessel(vessel_id: str, base_ts: float, hour_offset: float,
                   rng: random.Random) -> Vessel:
    """Generate a single random vessel arriving at base_ts + hour_offset."""
    vessel_class = rng.choices(
        [VesselClass.SMALL, VesselClass.MEDIUM, VesselClass.LARGE, VesselClass.VLARGE],
        weights=[20, 35, 30, 15],
    )[0]
    teu_min, teu_max = VESSEL_CLASS_TEU[vessel_class]
    cargo = rng.randint(teu_min, teu_max)
    priority = rng.choices(
        [Priority.LOW, Priority.NORMAL, Priority.HIGH, Priority.URGENT],
        weights=[10, 60, 25, 5],
    )[0]
    eta = base_ts + hour_offset * SECONDS_PER_HOUR + rng.uniform(-1800, 1800)

    vessel_names = [
        "MSC Altair", "Evergreen Fortune", "COSCO Pacific", "Maersk Horizon",
        "CMA CGM Atlas", "ONE Typhoon", "Yang Ming Coral", "Hapag Liberty",
        "PIL Navigator", "ZIM Atlantic", "Wan Hai Explorer", "OOCL Summit",
    ]
    name = rng.choice(vessel_names) + f" {vessel_id[-3:]}"
    return Vessel(
        vessel_id=vessel_id,
        name=name,
        vessel_class=vessel_class,
        cargo_volume_teu=cargo,
        eta=eta,
        priority=priority,
    )


def generate_schedule(
    seed: int = 42,
    base_ts: float | None = None,
    arrivals_per_hour: float = 1.2,
    congestion_scenario: bool = False,
    congestion_hour: int = 24,
    congestion_burst_size: int = 6,
    berth_offline_id: str | None = None,
) -> Tuple[List[Vessel], List[Berth], List[Crane], float]:
    """
    Generate a 72-hour vessel arrival schedule.

    Returns (vessels, berths, cranes, base_ts) — the base_ts is the
    actual start timestamp used, which callers must pass to predict/optimize.

    Parameters
    ----------
    seed : int
        Random seed for reproducibility.
    base_ts : float | None
        Start timestamp (Unix). Defaults to now.
    arrivals_per_hour : float
        Baseline mean arrival rate.
    congestion_scenario : bool
        If True, inject a burst of arrivals at congestion_hour plus
        optionally take a berth offline.
    congestion_hour : int
        Hour (0–71) at which the congestion burst is injected.
    congestion_burst_size : int
        Extra vessels injected in the congestion burst window.
    berth_offline_id : str | None
        If set, marks this berth as MAINTENANCE to simulate a breakdown.
    """
    rng = random.Random(seed)
    if base_ts is None:
        base_ts = time.time()

    berths, cranes = build_port(rng)

    if berth_offline_id:
        for b in berths:
            if b.berth_id == berth_offline_id:
                b.status = BerthStatus.MAINTENANCE
                break

    vessels: List[Vessel] = []
    vessel_counter = 1

    for hour in range(SIMULATION_WINDOW_HOURS):
        # Decide how many vessels arrive this hour
        n_arrivals = int(rng.expovariate(1.0 / arrivals_per_hour)) + (
            1 if rng.random() < 0.3 else 0
        )
        # Clamp to reasonable range
        n_arrivals = max(0, min(n_arrivals, 4))

        # Inject congestion burst at the designated hour
        if congestion_scenario and abs(hour - congestion_hour) <= 1:
            n_arrivals += congestion_burst_size // 2

        for _ in range(n_arrivals):
            v = _random_vessel(
                vessel_id=f"V{vessel_counter:04d}",
                base_ts=base_ts,
                hour_offset=float(hour),
                rng=rng,
            )
            vessels.append(v)
            vessel_counter += 1

    return vessels, berths, cranes, base_ts


def save_to_json(vessels: List[Vessel], berths: List[Berth],
                 cranes: List[Crane], path: str) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "vessels": [v.to_dict() for v in vessels],
        "berths": [b.to_dict() for b in berths],
        "cranes": [c.to_dict() for c in cranes],
    }
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, indent=2)
    print(f"[simulation] Saved {len(vessels)} vessels → {path}")


def save_to_csv(vessels: List[Vessel], path: str) -> None:
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    fieldnames = [
        "vessel_id", "name", "vessel_class", "cargo_volume_teu",
        "eta", "priority",
    ]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for v in vessels:
            writer.writerow({k: v.to_dict()[k] for k in fieldnames})
    print(f"[simulation] Saved {len(vessels)} vessels (CSV) → {path}")


# ──────────────────────────────────────────────────────────────
# CLI entry point for quick generation
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="PortPulse data generator")
    parser.add_argument("--congestion", action="store_true",
                        help="Inject congestion scenario at hour 24")
    parser.add_argument("--out", default="data/raw/schedule.json",
                        help="Output JSON path")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    vessels, berths, cranes, base_ts = generate_schedule(
        seed=args.seed,
        congestion_scenario=args.congestion,
        berth_offline_id="B05" if args.congestion else None,
    )
    save_to_json(vessels, berths, cranes, args.out)
    save_to_csv(vessels, args.out.replace(".json", ".csv"))
