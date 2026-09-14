import sys
sys.path.insert(0, '.')
from src.simulation.generator import generate_schedule
from src.prediction.predictor import predict_congestion, get_flagged_slots
from src.optimization.optimizer import optimize

vessels, berths, cranes, base_ts = generate_schedule(
    seed=42, congestion_scenario=True, congestion_hour=24,
    congestion_burst_size=6, berth_offline_id='B05'
)
slots = predict_congestion(vessels, berths, base_ts)
flagged = get_flagged_slots(slots)
assignments, metrics = optimize(vessels, berths, cranes, base_ts, flagged)
before = metrics['avg_wait_before_hours']
after = metrics['avg_wait_after_hours']
pct = (after - before) / before * 100
print(f'before={before:.3f} after={after:.3f} regression={pct:.1f}%')
print('metrics:', metrics)
