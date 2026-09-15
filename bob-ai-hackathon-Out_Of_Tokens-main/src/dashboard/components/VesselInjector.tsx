"use client";

/**
 * VesselInjector.tsx
 * Compact "Live What-If Vessel Injection" form.
 *
 * Valid enum values are hardcoded here to match src/shared/models.py exactly:
 *   VesselClass: SMALL | MEDIUM | LARGE | VLARGE
 *   Priority:    LOW | NORMAL | HIGH | URGENT
 * If those enums change in models.py, update the VESSEL_CLASSES and PRIORITIES
 * arrays below to match.
 */

import { useState } from "react";
import axios from "axios";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────

// Mirrors the valid values of VesselClass and Priority in src/shared/models.py
const VESSEL_CLASSES = ["SMALL", "MEDIUM", "LARGE", "VLARGE"] as const;
const PRIORITIES     = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

type VesselClass = (typeof VESSEL_CLASSES)[number];
type PriorityLevel = (typeof PRIORITIES)[number];

type SlotTierChange = {
  berth_id: string;
  hour_start: number;
  hour_end: number;
  risk_before: number;
  risk_after: number;
  tier_before: string;
  tier_after: string;
};

type ReroutedVessel = {
  vessel_id: string;
  original_berth_id: string;
  new_berth_id: string;
  wait_time_before: number;
  wait_time_hours: number;
  wait_delta_hours: number;
};

export type InjectedPipelineResponse = {
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
  diff: {
    slot_tier_changes: SlotTierChange[];
    avg_wait_delta_hours: number;
    avg_wait_before_injection: number;
    avg_wait_after_injection: number;
    rerouted_vessels: ReroutedVessel[];
    injected_vessel_id: string;
    injected_vessel_assignment: {
      berth_id: string;
      service_start: number;
      wait_time_hours: number;
    } | null;
  };
  base_schedule_auto_generated: boolean;
};

type Props = {
  apiBase: string;
  /** Called with the full response so the parent can update heatmap + metrics */
  onResult: (data: InjectedPipelineResponse) => void;
};

// ── Helpers ───────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  OK:       "text-ink-faint",
  HIGH:     "text-terra-500",
  CRITICAL: "text-danger",
};

const TIER_ARROW_COLOR: Record<string, string> = {
  OK:       "text-ink-faint",
  HIGH:     "text-terra-500",
  CRITICAL: "text-danger",
};

function tierLabel(tier: string) {
  return tier === "CRITICAL" ? "🔴 CRITICAL" : tier === "HIGH" ? "🟠 HIGH" : "🟢 OK";
}

// ── Component ─────────────────────────────────────────────────

// Max reroutes shown before "Show all N" expand link
const REROUTE_PREVIEW_COUNT = 8;

export default function VesselInjector({ apiBase, onResult }: Props) {
  const [vesselClass, setVesselClass]   = useState<VesselClass>("LARGE");
  const [etaHour,     setEtaHour]       = useState<number>(24);
  const [priority,    setPriority]      = useState<PriorityLevel>("NORMAL");
  const [cargoTeu,    setCargoTeu]      = useState<number>(12000);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [lastDiff, setLastDiff] = useState<InjectedPipelineResponse["diff"] | null>(null);
  const [autoGen,  setAutoGen]  = useState(false);

  // Flash state — set to true briefly after a successful inject to trigger
  // the highlight animation on changed items.
  const [flashing, setFlashing] = useState(false);

  // Reroute list expand/collapse
  const [showAllReroutes, setShowAllReroutes] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLastDiff(null);

    try {
      const res = await axios.post<InjectedPipelineResponse>(`${apiBase}/pipeline/inject`, {
        vessel: {
          vessel_class:      vesselClass,
          eta_hour:          etaHour,
          priority:          priority,
          cargo_volume_teu:  cargoTeu,
        },
      });

      setLastDiff(res.data.diff);
      setAutoGen(res.data.base_schedule_auto_generated);
      setShowAllReroutes(false);   // collapse reroute list on each new inject

      // Trigger flash highlight for 1.5 s
      setFlashing(true);
      setTimeout(() => setFlashing(false), 1500);

      // Propagate full result to parent so it can update heatmap + metrics
      onResult(res.data);
    } catch (err: any) {
      // Surface Pydantic 422 detail or generic message
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail) && detail.length > 0) {
        setError(detail.map((d: any) => d.msg).join("; "));
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(err.message || "Request failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-surface rounded-xl border border-border shadow-card p-4">
      <h2 className="font-display text-sm font-semibold text-ink mb-3">
        🧪 Live What-If Vessel Injection
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        {/* Vessel Class */}
        <label className="flex flex-col gap-1 text-2xs text-ink-muted uppercase tracking-wider font-medium">
          Vessel Class
          <select
            value={vesselClass}
            onChange={(e) => setVesselClass(e.target.value as VesselClass)}
            className="bg-canvas border border-border text-ink rounded px-2 py-1.5 text-xs shadow-inner-sm"
          >
            {VESSEL_CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {/* Priority */}
        <label className="flex flex-col gap-1 text-2xs text-ink-muted uppercase tracking-wider font-medium">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            className="bg-canvas border border-border text-ink rounded px-2 py-1.5 text-xs shadow-inner-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        {/* ETA Hour */}
        <label className="flex flex-col gap-1 text-2xs text-ink-muted uppercase tracking-wider font-medium min-w-[140px]">
          ETA Hour (0–72)
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={72}
              value={etaHour}
              onChange={(e) => setEtaHour(Number(e.target.value))}
              className="w-24 accent-teal-500"
            />
            <span className="text-ink font-semibold w-6 text-right text-xs">{etaHour}</span>
          </div>
        </label>

        {/* Cargo TEU */}
        <label className="flex flex-col gap-1 text-2xs text-ink-muted uppercase tracking-wider font-medium">
          Cargo (TEU)
          <input
            type="number"
            min={1}
            max={30000}
            value={cargoTeu}
            onChange={(e) => setCargoTeu(Number(e.target.value))}
            className="bg-canvas border border-border text-ink rounded px-2 py-1.5 text-xs w-28 shadow-inner-sm"
          />
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 rounded text-xs font-semibold text-white transition-colors self-end"
        >
          {loading ? "Injecting…" : "💉 Inject Vessel"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-3 p-2 bg-danger-light border border-danger/30 rounded text-danger text-xs">
          ⚠ {error}
        </div>
      )}

      {/* Auto-generated notice */}
      {autoGen && lastDiff && (
        <div className="mt-3 p-2 bg-sunken border border-border rounded text-ink-muted text-xs">
          ℹ No prior schedule found — generated a new base scenario (seed 42) to inject into.
        </div>
      )}

      {/* Diff panel */}
      {lastDiff && (
        <div
          className={clsx(
            "mt-4 space-y-3 transition-all duration-300",
            flashing && "ring-2 ring-teal-400 rounded-lg p-2"
          )}
        >
          {/* Wait delta */}
          <div className="flex gap-6 text-xs">
            <span className="text-ink-muted">
              Avg wait before:
              <strong className="ml-1 text-ink">{lastDiff.avg_wait_before_injection.toFixed(2)}h</strong>
            </span>
            <span className="text-ink-muted">
              After:
              <strong className={clsx("ml-1", lastDiff.avg_wait_delta_hours > 0 ? "text-danger" : "text-good")}>
                {lastDiff.avg_wait_after_injection.toFixed(2)}h
              </strong>
            </span>
            <span className={clsx("font-semibold", lastDiff.avg_wait_delta_hours > 0 ? "text-danger" : "text-good")}>
              {lastDiff.avg_wait_delta_hours > 0 ? "+" : ""}{lastDiff.avg_wait_delta_hours.toFixed(2)}h
            </span>
          </div>

          {/* Injected vessel assignment */}
          {lastDiff.injected_vessel_assignment && (
            <div className="text-xs text-ink-muted">
              <strong className="text-teal-600">{lastDiff.injected_vessel_id}</strong>
              {" "}→ <strong className="text-ink">{lastDiff.injected_vessel_assignment.berth_id}</strong>
              {" "}(wait: {lastDiff.injected_vessel_assignment.wait_time_hours.toFixed(2)}h)
            </div>
          )}

          {/* Slot tier changes */}
          {lastDiff.slot_tier_changes.length > 0 && (
            <div>
              <p className="text-2xs text-ink-faint mb-1">Slot tier changes ({lastDiff.slot_tier_changes.length})</p>
              <div className="flex flex-wrap gap-2">
                {lastDiff.slot_tier_changes.map((c, i) => (
                  <span
                    key={i}
                    className={clsx(
                      "text-2xs px-2 py-0.5 rounded-full border",
                      flashing ? "border-teal-400 bg-teal-50" : "border-border bg-sunken"
                    )}
                  >
                    <span className="text-ink-muted">{c.berth_id} h{c.hour_start}–{c.hour_end}</span>
                    {" "}
                    <span className={TIER_COLOR[c.tier_before]}>{tierLabel(c.tier_before)}</span>
                    {" → "}
                    <span className={TIER_ARROW_COLOR[c.tier_after]}>{tierLabel(c.tier_after)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rerouted vessels — sorted by abs wait delta DESC, truncated to top 8 */}
          {lastDiff.rerouted_vessels.length > 0 && (() => {
            const sorted = [...lastDiff.rerouted_vessels].sort(
              (a, b) => Math.abs(b.wait_delta_hours ?? 0) - Math.abs(a.wait_delta_hours ?? 0)
            );
            const visible = showAllReroutes ? sorted : sorted.slice(0, REROUTE_PREVIEW_COUNT);
            const hiddenCount = sorted.length - REROUTE_PREVIEW_COUNT;
            return (
              <div>
                <p className="text-2xs text-ink-faint mb-1">
                  Rerouted vessels ({lastDiff.rerouted_vessels.length}
                  {lastDiff.rerouted_vessels.length > REROUTE_PREVIEW_COUNT && !showAllReroutes
                    ? `, showing top ${REROUTE_PREVIEW_COUNT} by impact`
                    : ""})
                </p>
                <div className="flex flex-wrap gap-2">
                  {visible.map((r, i) => (
                    <span key={i} className="text-2xs px-2 py-0.5 rounded-full border border-terra-300 bg-terra-50 text-terra-700">
                      {r.vessel_id}: {r.original_berth_id} → {r.new_berth_id}
                      {r.wait_delta_hours != null && (
                        <span className={clsx("ml-1 font-semibold", r.wait_delta_hours > 0 ? "text-danger" : "text-good")}>
                          ({r.wait_delta_hours > 0 ? "+" : ""}{r.wait_delta_hours.toFixed(1)}h)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {!showAllReroutes && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllReroutes(true)}
                    className="mt-1.5 text-2xs text-teal-600 hover:underline"
                  >
                    Show all {sorted.length} reroutes ↓
                  </button>
                )}
                {showAllReroutes && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllReroutes(false)}
                    className="mt-1.5 text-2xs text-teal-600 hover:underline"
                  >
                    Show fewer ↑
                  </button>
                )}
              </div>
            );
          })()}

          {/* No changes */}
          {lastDiff.slot_tier_changes.length === 0 && lastDiff.rerouted_vessels.length === 0 && (
            <p className="text-2xs text-ink-faint">No tier changes or reroutes — schedule absorbed the vessel without congestion impact.</p>
          )}
        </div>
      )}
    </section>
  );
}
