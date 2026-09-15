import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from src.simulation.generator import generate_schedule, inject_vessel, make_injected_vessel
from src.prediction.predictor import predict_congestion, get_flagged_slots
from src.optimization.optimizer import optimize
from src.shared.models import VesselClass, Priority

vessels, berths, cranes, base_ts = generate_schedule(seed=42)

# pre-injection
slots_b = predict_congestion(vessels, berths, base_ts)
flagged_b = get_flagged_slots(slots_b)
asgn_b, _ = optimize(vessels, berths, cranes, base_ts, flagged_b)
map_b = {a.vessel_id: a for a in asgn_b}

# inject a VLARGE at hour 24
nv = make_injected_vessel(VesselClass.VLARGE, 24, Priority.URGENT, 20000, base_ts)
vessels_aug = inject_vessel(vessels, nv)
slots_a = predict_congestion(vessels_aug, berths, base_ts)
flagged_a = get_flagged_slots(slots_a)
asgn_a, _ = optimize(vessels_aug, berths, cranes, base_ts, flagged_a)
map_a = {a.vessel_id: a for a in asgn_a}

rerouted = [
    (vid, map_b[vid].berth_id, map_a[vid].berth_id,
     map_b[vid].wait_time_hours, map_a[vid].wait_time_hours)
    for vid in map_a
    if vid != nv.vessel_id and vid in map_b and map_b[vid].berth_id != map_a[vid].berth_id
]
print(f"Rerouted: {len(rerouted)} of {len(asgn_b)} vessels")
# Show wait change distribution
wait_deltas = [abs(map_a[vid].wait_time_hours - map_b[vid].wait_time_hours)
               for vid in map_a if vid in map_b and vid != nv.vessel_id]
wait_deltas.sort()
print(f"Wait delta range: {min(wait_deltas):.3f}h - {max(wait_deltas):.3f}h")
print(f"Deltas > 2h: {sum(1 for d in wait_deltas if d > 2)}")
print(f"Deltas < 0.1h: {sum(1 for d in wait_deltas if d < 0.1)}")
print("Sample deltas (sorted):", [round(d, 2) for d in wait_deltas[:20]])
# Show what's driving reroutes
for vid, b_from, b_to, w_b, w_a in sorted(rerouted, key=lambda x: abs(x[4]-x[3]), reverse=True)[:10]:
    print(f"  {vid}: {b_from}->{b_to}  wait {w_b:.1f}h -> {w_a:.1f}h  delta={w_a-w_b:+.1f}h")
