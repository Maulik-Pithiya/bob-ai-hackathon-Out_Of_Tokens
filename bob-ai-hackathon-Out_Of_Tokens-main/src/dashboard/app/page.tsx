"use client";

import { useState, useEffect } from "react";
import MetricsPanel from "@/components/MetricsPanel";
import CongestionHeatmap from "@/components/CongestionHeatmap";
import AssignmentTimeline from "@/components/AssignmentTimeline";
import BerthStatusGrid from "@/components/BerthStatusGrid";
import VesselInjector, { type InjectedPipelineResponse } from "@/components/VesselInjector";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type PipelineData = {
  simulation: { vessel_count: number; message: string; base_ts: number };
  prediction: {
    summary: {
      flagged_slots: number;
      critical_slots: number;
      berths_at_risk: string[];
      earliest_congestion_hour: number | null;
    };
    flagged_slots: any[];
    all_slots: any[];
  };
  optimization: {
    metrics: {
      vessels_assigned: number;
      avg_wait_before_hours: number;
      avg_wait_after_hours: number;
      wait_reduction_pct: number;
      congestion_incidents_avoided: number;
    };
    assignments: any[];
  };
};

export default function Home() {
  const [data, setData] = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [congestionMode, setCongestionMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedSlotKeys, setChangedSlotKeys] = useState<Set<string>>(new Set());
  const [highlightedBerth, setHighlightedBerth] = useState<string | null>(null);
  const [fadeKey, setFadeKey] = useState(0);

  async function runPipeline(congestion: boolean) {
    setLoading(true);
    setError(null);
    setCongestionMode(congestion);
    try {
      const res = await axios.post<PipelineData>(`${API}/pipeline`, {
        seed: 42,
        congestion_scenario: congestion,
        congestion_hour: 24,
        congestion_burst_size: 8,
        berth_offline_id: congestion ? "B05" : null,
        arrivals_per_hour: 1.2,
      });
      setData(res.data);
      setFadeKey((k) => k + 1);
    } catch (e: any) {
      setError(e.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  function handleInjectResult(injected: InjectedPipelineResponse) {
    setData({
      simulation: injected.simulation,
      prediction: injected.prediction,
      optimization: injected.optimization,
    });
    setCongestionMode(false);
    setFadeKey((k) => k + 1);
    const keys = new Set(
      injected.diff.slot_tier_changes.map((c) => `${c.berth_id}_${c.hour_start}`)
    );
    setChangedSlotKeys(keys);
    setTimeout(() => setChangedSlotKeys(new Set()), 2000);
  }

  async function loadDemo() {
    setLoading(true);
    setError(null);
    setCongestionMode(true);
    try {
      const res = await axios.get(`${API}/demo/scenario`);
      const d = res.data;
      setData({
        simulation: { vessel_count: d.vessels.length, message: "Pre-baked demo scenario", base_ts: 0 },
        prediction: { summary: d.prediction_summary, flagged_slots: d.flagged_slots, all_slots: [] },
        optimization: { metrics: d.metrics, assignments: d.assignments },
      });
      setFadeKey((k) => k + 1);
    } catch (e: any) {
      setError(e.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!highlightedBerth) return;
    const t = setTimeout(() => setHighlightedBerth(null), 2000);
    return () => clearTimeout(t);
  }, [highlightedBerth]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <header className="bg-teal-700 text-white px-6 py-3 flex items-center justify-between shadow-card-md">
        <div className="flex items-center gap-3">
          {/* Wordmark */}
          <span className="font-display text-lg font-bold tracking-tight">PortPulse</span>
          <span className="hidden sm:inline text-teal-200 text-xs border-l border-teal-500 pl-3">
            Container Congestion Predictor &amp; Port Operations Optimiser
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => runPipeline(false)}
            disabled={loading}
            className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 rounded text-xs font-semibold transition-colors"
          >
            {loading && !congestionMode ? "Running…" : "▶ Run Normal"}
          </button>
          <button
            onClick={() => runPipeline(true)}
            disabled={loading}
            className="px-3 py-1.5 bg-terra-500 hover:bg-terra-400 disabled:opacity-40 rounded text-xs font-semibold transition-colors"
          >
            {loading && congestionMode ? "Running…" : "⚠ Congestion Scenario"}
          </button>
          <button
            onClick={loadDemo}
            disabled={loading}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-40 rounded text-xs font-semibold transition-colors"
          >
            📦 Load Demo
          </button>
        </div>
      </header>

      <main className="px-6 pt-5 pb-10 max-w-[1400px] mx-auto space-y-5">

        {/* ── What-If Injection ───────────────────────────────────── */}
        <VesselInjector apiBase={API} onResult={handleInjectResult} />

        {/* ── Error ──────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 bg-danger-light border border-danger/30 rounded-lg text-danger text-sm">
            ⚠ {error} — is the backend running on port 8000?
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────── */}
        {!data && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-ink-faint">
            <p className="text-4xl mb-4">⚓</p>
            <p className="text-base text-ink-muted">Click an action above to run the prediction pipeline.</p>
            <p className="text-sm mt-1 text-ink-faint">
              Use <strong className="text-terra-500">⚠ Congestion Scenario</strong> to see the before/after demo.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-64 text-ink-muted">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-500 mr-3" />
            Running pipeline…
          </div>
        )}

        {/* ── Dashboard ──────────────────────────────────────────── */}
        {data && !loading && (
          <div
            key={fadeKey}
            className="space-y-5"
            style={{ animation: "fadeIn 0.35s ease-out both" }}
          >
            {/* Row 1: Metrics — flush chips, no card boxing */}
            <MetricsPanel
              vesselCount={data.simulation.vessel_count}
              metrics={data.optimization.metrics}
              predSummary={data.prediction.summary}
              congestionMode={congestionMode}
            />

            {/* Row 2: Heatmap — distinct treatment: full-bleed teal header */}
            {(data.prediction.all_slots.length > 0 || data.prediction.flagged_slots.length > 0) && (
              <section className="rounded-xl overflow-hidden border border-border shadow-card">
                <div className="bg-teal-700 text-white px-4 py-2.5 flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold tracking-tight">
                    Congestion Risk Heatmap — 72-Hour Horizon
                  </h2>
                  <span className="text-teal-200 text-xs">click cell → highlight berth</span>
                </div>
                <div className="bg-surface">
                  <CongestionHeatmap
                    flaggedSlots={
                      data.prediction.all_slots.length > 0
                        ? data.prediction.all_slots
                        : data.prediction.flagged_slots
                    }
                    onBerthClick={(id) => {
                      setHighlightedBerth(id);
                      document
                        .getElementById("berth-grid")
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    }}
                    changedSlotKeys={changedSlotKeys}
                  />
                </div>
              </section>
            )}

            {/* Row 3: Berth cards — slightly smaller spacing */}
            <section id="berth-grid">
              <h2 className="font-display text-sm font-semibold text-ink mb-2.5">
                Berth Utilisation
              </h2>
              <BerthStatusGrid
                assignments={data.optimization.assignments}
                flaggedSlots={data.prediction.flagged_slots}
                highlightedBerth={highlightedBerth}
              />
            </section>

            {/* Row 4: Assignment table — full width, inset treatment */}
            <section>
              <h2 className="font-display text-sm font-semibold text-ink mb-2.5">
                72-Hour Optimized Assignment Plan
              </h2>
              <AssignmentTimeline
                assignments={data.optimization.assignments}
                baseTs={data.simulation.base_ts}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
