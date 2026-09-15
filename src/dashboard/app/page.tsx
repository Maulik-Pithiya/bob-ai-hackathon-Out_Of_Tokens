"use client";

import { useState } from "react";
import MetricsPanel from "@/components/MetricsPanel";
import CongestionHeatmap from "@/components/CongestionHeatmap";
import AssignmentTimeline from "@/components/AssignmentTimeline";
import BerthStatusGrid from "@/components/BerthStatusGrid";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

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
    } catch (e: any) {
      setError(e.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  async function loadDemo() {
    setLoading(true);
    setError(null);
    setCongestionMode(true);
    try {
      const res = await axios.get(`${API}/demo/scenario`);
      const d = res.data;
      // Wrap into PipelineData shape
      setData({
        simulation: { vessel_count: d.vessels.length, message: "Pre-baked demo scenario", base_ts: 0 },
        prediction: {
          summary: d.prediction_summary,
          flagged_slots: d.flagged_slots,
          all_slots: [],
        },
        optimization: {
          metrics: d.metrics,
          assignments: d.assignments,
        },
      });
    } catch (e: any) {
      setError(e.message || "API error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            🚢 PortPulse
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Container Congestion Predictor &amp; Port Operations Optimiser
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => runPipeline(false)}
            disabled={loading}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            {loading && !congestionMode ? "Running…" : "▶ Run Normal"}
          </button>
          <button
            onClick={() => runPipeline(true)}
            disabled={loading}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            {loading && congestionMode ? "Running…" : "⚠ Inject Congestion"}
          </button>
          <button
            onClick={loadDemo}
            disabled={loading}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-medium transition"
          >
            📦 Load Demo Scenario
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-600 rounded-lg text-red-300 text-sm">
          ⚠ {error} — is the backend running on port 8000?
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p className="text-4xl mb-4">⚓</p>
          <p className="text-lg">Click a button above to run the prediction pipeline.</p>
          <p className="text-sm mt-2">Use <strong className="text-amber-400">⚠ Inject Congestion</strong> to see the before/after demo.</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3" />
          Running pipeline…
        </div>
      )}

      {/* ── Dashboard ──────────────────────────────────────────── */}
      {data && !loading && (
        <div className="space-y-6">
          {/* Metrics */}
          <MetricsPanel
            vesselCount={data.simulation.vessel_count}
            metrics={data.optimization.metrics}
            predSummary={data.prediction.summary}
            congestionMode={congestionMode}
          />

          {/* Congestion Heatmap */}
          {data.prediction.flagged_slots.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-slate-300 mb-3">
                🔴 Congestion Risk Heatmap — 72-Hour Horizon
              </h2>
              <CongestionHeatmap flaggedSlots={data.prediction.flagged_slots} />
            </section>
          )}

          {/* Berth Status */}
          <section>
            <h2 className="text-base font-semibold text-slate-300 mb-3">
              🏗 Berth Utilisation
            </h2>
            <BerthStatusGrid
              assignments={data.optimization.assignments}
              flaggedSlots={data.prediction.flagged_slots}
            />
          </section>

          {/* Assignment Timeline */}
          <section>
            <h2 className="text-base font-semibold text-slate-300 mb-3">
              📋 72-Hour Optimized Assignment Plan
            </h2>
            <AssignmentTimeline
              assignments={data.optimization.assignments}
              baseTs={data.simulation.base_ts}
            />
          </section>
        </div>
      )}
    </main>
  );
}
