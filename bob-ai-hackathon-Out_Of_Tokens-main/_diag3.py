import sys, io, math
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from src.simulation.generator import generate_schedule
from src.prediction.predictor import predict_congestion

vessels, berths, cranes, base_ts = generate_schedule(seed=42)
slots = predict_congestion(vessels, berths, base_ts)

nonzero = [s for s in slots if s.risk_score > 0]
print(f"Total: {len(slots)}  nonzero: {len(nonzero)}")

# Exact score distribution
buckets = {i: 0 for i in range(10)}
for s in slots:
    b = min(int(s.risk_score * 10), 9)
    buckets[b] += 1
print("Score bucket distribution:")
for k, v in sorted(buckets.items()):
    lo, hi = k/10, (k+1)/10
    bar = '#' * (v // 2)
    print(f"  {lo:.1f}-{hi:.1f}: {v:3d}  {bar}")

# Show what feeds into a sample of nonzero risk slots
print("\nSample nonzero slots (first 12 sorted by score):")
for s in sorted(nonzero, key=lambda x: x.risk_score)[:12]:
    print(f"  {s.berth_id} s{s.slot_index:2d} h{s.hour_start:.0f}  arr={s.expected_arrivals}  score={s.risk_score:.3f}  [{s.flag_level}]")

# The KEY diagnostic: what is demand_ratio for typical nonzero slots?
# demand_ratio = n_arriving / port_capacity
# For a normal slot with 1 arrival and e.g. 4 compatible berths,
# demand_ratio = 0.25 → tanh(0.25) = 0.245
# with busy_weight=0 → risk = 0.245
# But user says they see 0.71 clustering.
# That means demand_ratio ≈ 0.87 → port_capacity ≈ n/0.87 ≈ 1.15?
# That would mean only 1 compatible berth most of the time.
print("\nCompatible berth counts per arriving vessel class:")
from src.shared.models import VesselClass
available = [b for b in berths if True]  # all berths
for vc in VesselClass:
    compat = [b for b in berths if vc in b.compatible_classes]
    print(f"  {vc.value}: {len(compat)} compatible berths")
