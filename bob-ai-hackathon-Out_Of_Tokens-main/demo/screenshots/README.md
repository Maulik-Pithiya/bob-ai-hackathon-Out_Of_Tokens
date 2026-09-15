# Screenshots — PortPulse

Place your application screenshots in this folder.

## Naming Convention

Name your screenshots sequentially so they appear in logical order:

```
01-empty-dashboard.png          ← Dashboard on first load (no data yet)
02-congestion-heatmap.png       ← Congestion Risk Heatmap after injecting the scenario
03-metrics-panel.png            ← Metrics Panel showing before/after wait reduction
04-assignment-timeline.png      ← 72-Hour Assignment Timeline table
05-berth-utilisation-grid.png   ← Berth Utilisation Grid with flagged berths in red
```

## What to Capture for PortPulse

1. **`01-empty-dashboard.png`** — The blank dashboard with the three action buttons visible (Run Normal, Inject Congestion, Load Demo Scenario).

2. **`02-congestion-heatmap.png`** — After clicking **⚠ Inject Congestion**, show the Congestion Risk Heatmap with red/orange bubbles clustered around hours 22–30 on berths B03–B06.

3. **`03-metrics-panel.png`** — The Metrics Panel showing the key before/after numbers:
   - Avg Wait Before (e.g., `4.2h`)
   - Avg Wait After (e.g., `1.1h`)
   - Wait Reduction % (e.g., `74%`)
   - Congestion Incidents Avoided

4. **`04-assignment-timeline.png`** — The 72-Hour Optimized Assignment Plan table showing vessel IDs, berths, crane assignments, and wait time badges.

5. **`05-berth-utilisation-grid.png`** — The Berth Utilisation Grid with B05 marked offline/red and adjacent berths showing high load.

## Requirements

- Minimum: 3 screenshots
- Format: PNG or JPG
- Show the application running with the congestion scenario active
- Avoid screenshots of empty states or error messages
- Capture at 1280×800 or wider for readability

## Tips

- Use the **📦 Load Demo Scenario** button for consistent, reproducible results
- The congestion scenario (Berth B05 offline + burst at hour 24) gives the most visually compelling screenshots
- Consider annotating the heatmap screenshot with arrows pointing to the CRITICAL risk bubbles
