# How to Submit Your Hackathon Entry

> **Team:** Out Of Tokens — IBM Bob AI Innovation Hackathon
> **Project:** PortPulse — Container Congestion Predictor & Port Operations Optimiser
> **Track:** AI (Logistics & Ports — L1)

Follow these steps to set up your submission repository correctly.
The judges depend on this structure to review your entry — deviations may affect your score.

---

## Step 1 — Fork This Template

1. Click the **"Use this template"** button at the top of this repository
   (or **Fork** if you prefer)
2. Name your repository: `bob-ai-hackathon-Out_Of_Tokens`
3. Set visibility to **Public** so judges can access it
4. Click **Create repository**

---

## Step 2 — Clone Your Fork Locally

```bash
git clone https://github.com/[your-org]/bob-ai-hackathon-Out_Of_Tokens.git
cd bob-ai-hackathon-Out_Of_Tokens
```

---

## Step 3 — Fill in the Required Files

Work through these files in order:

### 3a. `submission.yaml` ← **Start here**
This is the most important file. Judges use it to get an overview of your entry.

- Open [`submission.yaml`](submission.yaml)
- ✅ **Already filled in** — team name, members, problem statement, solution summary, key features, and tech stack are complete
- Double-check all fields before final submission

### 3b. `README.md`
- ✅ **Already updated** — team info, problem statement, solution, tech stack, repo structure, and run instructions are in place
- Ensure no `[placeholder]` text remains before submitting

### 3c. `docs/`
All documentation files are present and should be kept up to date:
| File | Status | What it covers |
|---|---|---|
| [`docs/problem-statement.md`](docs/problem-statement.md) | ✍️ Fill in | The port congestion problem & stakeholder impact |
| [`docs/solution-overview.md`](docs/solution-overview.md) | ✍️ Fill in | PortPulse pipeline: simulate → predict → optimize → visualize |
| [`docs/architecture.md`](docs/architecture.md) | ✍️ Fill in | Module diagram — shared, simulation, prediction, optimization, api, dashboard |
| [`docs/setup-guide.md`](docs/setup-guide.md) | ✍️ Fill in | Step-by-step local setup for backend (FastAPI) and frontend (Next.js) |

### 3d. `src/`
Source code is organized as follows — **do not rename these directories**:
```
src/
  shared/       ← Vessel, Berth, Crane dataclasses
  simulation/   ← Synthetic 72h vessel schedule generator
  prediction/   ← Congestion risk scorer
  optimization/ ← Greedy berth/crane assignment optimizer
  api/          ← FastAPI backend (wires all modules)
  dashboard/    ← Next.js 14 real-time dashboard
```
- Copy [`src/.env.example`](src/.env.example) to `src/.env` and fill in any required variables
- **Never commit a real `.env` file** — it is already in `.gitignore`

### 3e. `demo/`
| File | Status | What to do |
|---|---|---|
| [`demo/demo-video-link.txt`](demo/demo-video-link.txt) | ⚠️ Pending | Replace placeholder URL with the real PortPulse demo video (3–5 min) |
| [`demo/live-demo-url.txt`](demo/live-demo-url.txt) | ⚠️ Pending | Add deployed URL or write "NOT DEPLOYED — run locally using docs/setup-guide.md" |
| [`demo/screenshots/`](demo/screenshots/) | ⚠️ Pending | Add 3+ screenshots named `01-*.png`, `02-*.png`, etc. |
| [`demo/scenario_congested.json`](demo/scenario_congested.json) | ✅ Present | Pre-baked congestion scenario — already committed |
| [`demo/demo_script.md`](demo/demo_script.md) | ✅ Present | Timed 2.5-min walkthrough script |

### 3f. `presentation/`
- Add the PortPulse slide deck as [`presentation/slides.pdf`](presentation/) (preferred) or `.pptx`
- Currently only a placeholder `README.md` is present — **add the actual deck before submitting**

---

## Step 4 — Verify Your Submission Passes Validation

Every push to your repository triggers the **Validate Submission** GitHub Action automatically.

To check manually:
1. Go to your repo on GitHub
2. Click the **Actions** tab
3. Look for **✅ Validate Submission**
4. A green checkmark means your submission is structurally complete
5. A red X means something is missing — click the run to see what

You can also run the validation locally:
```bash
# Install yq first: https://github.com/mikefarah/yq#install
yq '.' submission.yaml   # checks YAML is valid
```

---

## Step 5 — Submit Your Repository URL

Once validation passes:

1. Copy your repository URL:
   `https://github.com/[your-org]/bob-ai-hackathon-Out_Of_Tokens`

2. Submit it via the **official entry form** at:
   `[ORGANIZER: INSERT FORM URL HERE]`

3. **Deadline:** `[ORGANIZER: INSERT DEADLINE HERE]`

> ⚠️ Submissions after the deadline will not be reviewed.
> Changes after the deadline are not considered — make sure everything is complete before submitting.

---

## Checklist Before You Submit

> **Team: Out Of Tokens** — go through every item below before submitting PortPulse.

### 📄 Metadata & Docs
- [x] `submission.yaml` — all required fields filled (team, members, problem, solution, features, tech stack)
- [x] `README.md` — no `[placeholder]` text remaining; team info, run instructions, and repo structure present
- [ ] `docs/problem-statement.md` — written and accurate
- [ ] `docs/solution-overview.md` — written and accurate
- [ ] `docs/architecture.md` — pipeline diagram and module responsibilities included
- [ ] `docs/setup-guide.md` — someone outside the team can run PortPulse using only these instructions

### 💻 Source Code
- [x] `src/` directory structure intact (`shared/`, `simulation/`, `prediction/`, `optimization/`, `api/`, `dashboard/`)
- [ ] All source code committed — no `node_modules/`, no `.env`, no large generated data files
- [x] `src/.env.example` present with all required variable names documented
- [ ] Backend starts cleanly: `uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload`
- [ ] Frontend starts cleanly: `cd src/dashboard && npm install && npm run dev`
- [ ] All tests pass: `pytest tests/ -v`

### 🎬 Demo Assets
- [ ] `demo/demo-video-link.txt` — updated with the real PortPulse demo video URL (3–5 min, shows app running)
- [ ] `demo/live-demo-url.txt` — updated with deployed URL or "NOT DEPLOYED — run locally using docs/setup-guide.md"
- [ ] `demo/screenshots/` — at least 3 screenshots of the running application (named `01-*.png`, `02-*.png`, etc.)
- [x] `demo/scenario_congested.json` — pre-baked congestion scenario committed
- [x] `demo/demo_script.md` — walkthrough script committed

### 📊 Presentation
- [ ] `presentation/slides.pdf` (or `.pptx`) — full slide deck present (not just the placeholder README)

### ✅ Final Checks
- [ ] GitHub Actions **✅ Validate Submission** is green (check the **Actions** tab)
- [ ] Repository is **Public** and accessible without a GitHub login
- [ ] Entry form submitted before the deadline with URL: `https://github.com/[your-org]/bob-ai-hackathon-Out_Of_Tokens`
- [ ] No sensitive credentials, API keys, or `.env` files are committed

---
