# Problem Statement — PortPulse

## Background

Container shipping is the backbone of global trade — roughly 90% of everything manufactured moves inside a shipping container at some point. At major container terminals, vessels arrive on tight schedules coordinated months in advance, but the actual berth assignment, crane allocation, and queue management at the port happens in real time by shift supervisors working from spreadsheets, whiteboards, and radio calls.

This manual, reactive approach was barely adequate in normal conditions — and catastrophically fragile under any kind of surge.

---

## The Problem

Port operations teams have no predictive visibility into the 72-hour horizon. Berth assignments are made only when a vessel is already approaching or anchored offshore. Congestion is detected only after the queue has already formed — by which point it is too late to prevent the backlog.

The result: vessels waiting at anchor burn fuel, accrue demurrage charges (typically $15,000–$50,000 per day per vessel), and delay cargo deliveries downstream across hundreds of supply chains. A single slow-moving large vessel or a maintenance outage on one berth can ripple into a multi-day blockage if nothing intervenes early.

---

## Who is Affected

**Primary:** Port shift supervisors and terminal operations managers at container terminals who are responsible for berth scheduling and crane assignment on a rolling 24–72 hour window. They currently rely on spreadsheets, static ETA boards, and tribal knowledge — with no tool that synthesizes incoming vessel data with berth capacity to project where the queue will form.

**Secondary:** Shipping lines, freight forwarders, and cargo owners whose cargo sits aboard anchored vessels racking up demurrage costs and missing inland delivery windows. Their supply chains are downstream victims of a congestion event they had no warning of.

---

## Why It Matters

The 2021 LA/Long Beach port congestion crisis is the starkest recent example. At its peak, over 100 container ships sat offshore waiting for a berth — some for more than three weeks. The total cost to global supply chains exceeded **$10 billion USD**. The root cause was not a lack of berths or cranes; it was a lack of predictive orchestration. By the time the backlog was visible, the queue was already catastrophic and could not be unwound without weeks of disruption.

Container port throughput globally exceeded **850 million TEU** in 2023. Even a 1% improvement in average vessel wait time, applied at scale, represents billions of dollars in reclaimed efficiency and thousands of tons of fuel avoided.

---

## Why Existing Solutions Fall Short

Current practice at most mid-size terminals relies on:

- **Static ETA boards** — show when ships are expected, but do not project whether capacity will be available when they arrive.
- **Manual berth planning in spreadsheets** — updated infrequently, not integrated with crane availability, and cannot model burst scenarios or maintenance outages.
- **Port Management Systems (PMS)** — enterprise systems that record what has happened and track current occupancy, but rarely offer forward-looking congestion risk scores or automated rerouting suggestions.

The gap is not recording or tracking — it is **forecasting** and **prescribing**. No tool in common use at mid-size terminals scores every berth × time-slot on a 72-hour horizon and automatically generates an optimized assignment plan that redirects vessels before the queue forms.

PortPulse fills exactly that gap.
