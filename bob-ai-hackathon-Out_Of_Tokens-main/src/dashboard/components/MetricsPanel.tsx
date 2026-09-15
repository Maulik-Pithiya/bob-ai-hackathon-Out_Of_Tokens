"use client";

import { useEffect, useState } from "react";

type Props = {
  vesselCount: number;
  congestionMode: boolean;
  predSummary: {
    flagged_slots: number;
    critical_slots: number;
    berths_at_risk: string[];
    earliest_congestion_hour: number | null;
  };
  metrics: {
    vessels_assigned: number;
    avg_wait_before_hours: number;
    avg_wait_after_hours: number;
    wait_reduction_pct: number;
    congestion_incidents_avoided: number;
  };
};

// ── Inline SVG icons (zero deps) ─────────────────────────────

function IconShip()   { return <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden><path d="M3 9h14l-2 6H5L3 9zm1-3 1-3h10l1 3H4zm4-3V2h4v1" /></svg>; }
function IconBerth()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="3" y="10" width="3" height="7" rx="0.4"/><rect x="8.5" y="7" width="3" height="10" rx="0.4"/><rect x="14" y="12" width="3" height="5" rx="0.4"/><line x1="1" y1="17" x2="19" y2="17"/></svg>; }
function IconClock()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="10" cy="10" r="7.5"/><polyline points="10,5.5 10,10 13,12.5" strokeLinecap="round"/></svg>; }
function IconTrend()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><polyline points="2,14 7,9 11,12 18,5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,5 18,5 18,9" strokeLinecap="round"/></svg>; }
function IconAlert()  { return <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M10 2.5l7.5 13H2.5L10 2.5z" strokeLinejoin="round"/><line x1="10" y1="8.5" x2="10" y2="12" strokeLinecap="round"/><circle cx="10" cy="14.5" r="0.8" fill="currentColor" stroke="none"/></svg>; }

// ── Stat chip ─────────────────────────────────────────────────

type StatProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  visible: boolean;
};

function Stat({ icon, label, value, sub, valueClass, visible }: StatProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg px-3 py-2.5 flex flex-col gap-0.5 shadow-card transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      <div className="flex items-center gap-1.5 text-ink-muted">
        {icon}
        <span className="text-2xs uppercase tracking-widest font-medium">{label}</span>
      </div>
      <span className={`text-xl font-display font-bold leading-tight ${valueClass ?? "text-ink"}`}>
        {value}
      </span>
      {sub && <span className="text-2xs text-ink-faint">{sub}</span>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────

export default function MetricsPanel({ vesselCount, metrics, predSummary, congestionMode }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, [metrics]);

  const imp = Math.round(metrics.wait_reduction_pct);
  const impClass = imp > 30 ? "text-good" : imp > 10 ? "text-terra-500" : "text-danger";

  return (
    <div>
      {congestionMode && (
        <div className="mb-3 px-3 py-2 bg-terra-50 border border-terra-300 rounded-lg text-terra-700 text-xs font-medium">
          ⚠ Congestion scenario active — B05 offline, burst at hour 24.
          {predSummary.earliest_congestion_hour != null && (
            <> Earliest bottleneck: <strong>Hour {predSummary.earliest_congestion_hour}</strong></>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Stat icon={<IconShip />}  label="Scheduled"       value={vesselCount.toLocaleString()}                         sub="vessels · 72h"           visible={visible} />
        <Stat icon={<IconBerth />} label="Assigned"        value={metrics.vessels_assigned.toLocaleString()}             sub="berths allocated"        visible={visible} />
        <Stat icon={<IconClock />} label="Avg Wait Before" value={`${metrics.avg_wait_before_hours.toFixed(1)}h`}        sub="no optimisation"         valueClass="text-danger" visible={visible} />
        <Stat icon={<IconClock />} label="Avg Wait After"  value={`${metrics.avg_wait_after_hours.toFixed(1)}h`}         sub="with optimisation"       valueClass="text-good"   visible={visible} />
        <Stat icon={<IconTrend />} label="Wait Reduction"  value={`${imp}%`}                                             sub="improvement"             valueClass={impClass}    visible={visible} />
        <Stat icon={<IconAlert />} label="Incidents"       value={metrics.congestion_incidents_avoided.toLocaleString()} sub="congestion windows"      valueClass="text-terra-500" visible={visible} />
      </div>
    </div>
  );
}
