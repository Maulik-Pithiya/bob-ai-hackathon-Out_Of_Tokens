# Demo Script — PortPulse
## Timed Walkthrough (~2.5 minutes)

---

### [0:00 – 0:20] Hook — The Problem

> "In 2021, over 100 container ships sat waiting offshore at LA/Long Beach for weeks. The cost: $10 billion to global supply chains. The cause: reactive, spreadsheet-based berth management that spotted congestion only after ships were already queuing.
> PortPulse fixes that. It predicts congestion **before** it happens and automatically resolves it."

- Show the blank dashboard.

---

### [0:20 – 0:45] Inject the Scenario

> "Let me simulate the LA/Long Beach scenario. I'll inject a burst of arrivals at hour 24 and take Berth 5 offline — the kind of thing that caused the 2021 backlog."

- Click **⚠ Inject Congestion**.
- Dashboard loads with red banner: *"Congestion scenario active — Berth B05 offline, burst at hour 24."*
- Point to **Earliest predicted bottleneck: Hour 24**.

---

### [0:45 – 1:15] Walk the Prediction

> "The system has scored every berth across every 2-hour window. Red bubbles are critical risk — that's where ships will queue if we do nothing. This is the PREDICTION, not a report of what's already happening."

- Point to the **Congestion Risk Heatmap**.
- Highlight red/orange bubbles clustered around hours 22–30 on berths B03–B06.

---

### [1:15 – 1:45] Show the Optimization

> "Now watch the optimizer act. It reroutes vessels away from those congested windows — spreading load across available berths and assigning cranes to minimize turnaround time."

- Point to the **Metrics Panel**:
  - **Avg Wait Before**: e.g., `4.2h`
  - **Avg Wait After**: e.g., `1.1h`
  - **Wait Reduction**: e.g., `74%`
  - **Incidents Avoided**: e.g., `12`

> "74% reduction in average wait time. Those are the ships that **don't** sit offshore."

---

### [1:45 – 2:15] The Ops Plan

> "And here's what the shift supervisor actually sees — a clean 72-hour plan: vessel, berth, time slot, cranes assigned. Actionable in seconds."

- Scroll through the **Assignment Timeline** table.
- Point to green/amber/red wait badges.
- Show the **Berth Utilisation** grid — flagged berths marked in red.

---

### [2:15 – 2:30] Close

> "PortPulse turns a reactive crisis into a proactive plan. Predictive, prescriptive, and ready to put a shift supervisor in control before the queue ever forms."

---

## Fallback (if live compute is slow)

- Click **📦 Load Demo Scenario** instead of running the pipeline live.
- This loads `demo/scenario_congested.json` — a pre-baked result set that loads instantly.
