# Presentation — PortPulse

Place your slide deck in this folder as `slides.pdf` (preferred) or `slides.pptx`.

## Accepted Formats

```
slides.pdf      ← Preferred (universally viewable)
slides.pptx     ← Acceptable
slides.key      ← Acceptable (macOS Keynote)
```

---

## Recommended Slide Structure for PortPulse (6–8 slides)

| Slide | Title | Content |
|---|---|---|
| 1 | **Title** | PortPulse — Container Congestion Predictor & Port Operations Optimiser · Team: Out Of Tokens · Track: Open |
| 2 | **The Problem** | 2021 LA/Long Beach backlog: 100+ ships, $10B+ cost. Reactive spreadsheets can't prevent congestion. Port supervisors have zero 72-hour predictive visibility. |
| 3 | **Our Solution** | PortPulse pipeline: simulate → predict → optimize → visualize. One API call, full ops plan in <1 second. Screenshot of the dashboard with heatmap active. |
| 4 | **Architecture** | Pipeline diagram from `docs/architecture.md`. 5 Python modules + Next.js dashboard, no external dependencies. |
| 5 | **The Demo** | Before/after: congestion scenario injected → system detects CRITICAL slots at hour 24 → optimizer reroutes vessels → 74% wait reduction. Screenshot of Metrics Panel. |
| 6 | **IBM Bob** | How IBM Bob was used: scaffolding FastAPI structure, Pydantic models, React components, cross-module integration, demo script. |
| 7 | **Results & Impact** | Key metrics: Avg wait before vs after. Incidents avoided. At scale: even 1% improvement on 850M TEU/year = billions in value. |
| 8 | **Team** | Person A — Simulation + Prediction · Person B — Optimization · Person C — Dashboard · Person D — API + Integration |

---

## Key Numbers to Highlight on Slides

- **72-hour** prediction horizon
- **8 berths, 20 cranes** — mid-size terminal model
- **≥65% risk** = HIGH flag · **≥85% risk** = CRITICAL flag
- **~74% wait reduction** (demo scenario result)
- **<1 second** end-to-end pipeline runtime
- **$10B+** — cost of the 2021 LA/Long Beach backlog (your benchmark)
- **100+ ships** waiting offshore at peak (your hook)

---

## Tips

- Keep slides visual — use the Mermaid pipeline diagram from `docs/architecture.md`
- Show the before/after metric comparison side-by-side (it is the strongest result)
- Screenshot the Congestion Risk Heatmap — the red/orange bubble pattern is immediately intuitive
- One idea per slide; font size ≥ 24pt
- Do not paste code blocks into slides — reference the repo instead
- Export to PDF before submitting — links in `.pptx` may break on judge machines
