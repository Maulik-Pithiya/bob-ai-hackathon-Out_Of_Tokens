# Solution Overview — PortPulse

## What We Built

PortPulse is a container port congestion prediction and operations optimization system. It watches a 72-hour window of incoming vessel arrivals, calculates where and when berths will become overloaded before it happens, automatically reroutes vessels to avoid those bottlenecks, and hands a shift supervisor a clean, prioritized assignment plan — vessel by vessel, berth by berth, crane by crane.

The entire system runs locally with no cloud dependencies. A single API call runs the full pipeline from raw schedule to optimized ops plan in under one second.

---

## How It Works

1. **Simulate** — `POST /simulate` or `POST /pipeline`
   A seeded random generator produces a realistic 72-hour vessel arrival schedule: vessel class (SMALL/MEDIUM/LARGE/VLARGE), cargo volume in TEU, estimated time of arrival, and priority (LOW/NORMAL/HIGH/URGENT). The port is modelled with 8 berths across four zones (North Quay, East Dock, South Terminal, Deep Water) and 20 cranes with varying throughput rates. An optional congestion scenario can be injected — a burst of extra arrivals at a chosen hour plus a berth taken offline for maintenance.

2. **Predict** — `GET /predict`
   The predictor scores every berth × 2-hour time slot over the full 72-hour horizon. For each slot it counts arriving vessels compatible with that berth, computes `demand_ratio = arrivals / port-wide compatible capacity`, and applies a sigmoid risk score: `max(0, tanh(4 × (demand_ratio − 0.35)))`. This is calibrated so a single vessel arriving at a 4-berth port (demand_ratio=0.25) scores near 0 (green), half-load (0.5) scores ~0.54 (yellow), and genuine overload scores ≥0.85 (critical red). A carryover term (+0.10 max) adds pressure when a berth is already occupied by a prior vessel at the moment new arrivals appear. Slots ≥0.65 are flagged **HIGH**; ≥0.85 **CRITICAL**.

3. **Optimize** — `POST /optimize`
   The greedy optimizer sorts all vessels by priority then ETA, then for each vessel picks the compatible berth with the shortest projected wait. If the chosen berth is marked CRITICAL, it checks whether a non-critical alternative exists with ≤10% more wait — if so, it reroutes the vessel there. Cranes are allocated greedily by throughput. A separate naive baseline is run independently, giving a clean before/after comparison.

4. **Live What-If Injection** — `POST /pipeline/inject`
   An operator selects a vessel class, arrival hour, priority, and cargo volume, then clicks "Inject Vessel". The system runs the full pipeline twice (before and after injection) and returns a `diff`: which time slots changed risk tier, the net change in average port wait, and which existing vessels were rerouted — filtered to cases where the wait-time change is ≥2 hours, so trivial greedy re-sort artefacts are hidden. The top reroutes are ranked by impact magnitude. Nothing in the live schedule changes; this is a pure what-if simulation.

5. **Visualize** — `http://localhost:3000`
   The Next.js dashboard shows five panels:
   - **What-If Injection panel** — form to pick vessel parameters, submit, and see the live diff inline
   - **Metrics Panel** — vessels processed, average wait before/after, wait reduction %, incidents avoided
   - **Congestion Risk Heatmap** — 8 berths × 12 six-hour buckets; cells coloured on a continuous green→amber→terracotta→crimson gradient using all 288 slots (not just flagged); clicking a cell highlights the corresponding berth below
   - **Berth Utilisation Grid** — per-berth cards showing assignment count, max risk tier, and crane allocation
   - **72-Hour Assignment Timeline** — the complete ops plan: vessel ID → berth → cranes → start time → end time → wait badge

---

## Architecture Diagram

```
Browser / Dashboard (Next.js)
        │  REST (axios)
        ▼
FastAPI Backend  ─── src/api/main.py
   │   │   │
   │   │   └─ POST /pipeline (runs all three in sequence)
   │   │
   ├─► Simulation  ─── src/simulation/generator.py
   │       └─ Synthetic vessel arrivals + port config
   │
   ├─► Prediction  ─── src/prediction/predictor.py
   │       └─ Risk score per berth per 2h slot → CongestionSlot[]
   │
   └─► Optimization ── src/optimization/optimizer.py
           └─ Greedy berth/crane assignment → AssignmentResult[] + metrics

Shared types: src/shared/models.py (Vessel, Berth, Crane, enums)
Demo fallback: demo/scenario_congested.json (cached on first call)
```

> Full Mermaid diagram: see [`architecture.md`](architecture.md)

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Rule-based queue-length predictor instead of ML | Explainable in 30 seconds to judges; no training data or GPU required; visibly works on synthetic data |
| Per-berth independent busy tracker in predictor | Shared tracker across berths caused cross-contamination — B02 saw B01's occupancy, inflating risk for every arrival regardless of load; independent per-berth scalar fixed bimodal clustering |
| Risk score only fires on arrivals (not on occupancy alone) | A busy berth serving an existing vessel is not a congestion risk; risk is only meaningful when additional vessels arrive and find limited capacity |
| Return `all_slots` from `/pipeline` (not just flagged) | Heatmap must show genuine green (low-risk) cells, not just orange/red (flagged-only) cells; without all_slots every populated cell was already HIGH/CRITICAL |
| Reroute diff filtered to ≥2h wait-delta | One injected VLARGE vessel can cause greedy reassignments for 30+ existing vessels by <1h each; threshold suppresses noise and surfaces only impactful reroutes |
| Greedy heuristic optimizer instead of OR-Tools CP-SAT | Always terminates; deterministic; easy to explain; CP-SAT noted as documented v2 path |
| In-memory API state instead of database | Eliminates setup complexity and potential failure during live demo; no multi-session requirement |
| Synthetic data only | No real AIS feed available; seeded generator ensures reproducible demo results |
| Pre-baked demo fallback (`demo/scenario_congested.json`) | Guarantees a consistent, fast-loading demo even if live computation is slow during judging |
| Single `POST /pipeline` endpoint | One call tells the entire story — ideal for a live demo and for judges to reproduce results |

---

## IBM Technologies Used

- **IBM Bob:** Used throughout the development sprint for scaffolding module boilerplate, cross-module integration, generating the FastAPI endpoint structure, Pydantic request/response models, React component skeletons, and refining the demo script narrative. IBM Bob significantly accelerated the time from architecture diagram to running code.
