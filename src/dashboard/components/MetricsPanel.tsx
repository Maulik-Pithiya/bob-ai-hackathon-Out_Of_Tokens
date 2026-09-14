"use client";

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

function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-1 border border-slate-700">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

export default function MetricsPanel({ vesselCount, metrics, predSummary, congestionMode }: Props) {
  const improvement = metrics.wait_reduction_pct;
  const improvColor =
    improvement > 30 ? "text-green-400" : improvement > 10 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      {congestionMode && (
        <div className="mb-3 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm font-medium">
          ⚠ Congestion scenario active — Berth B05 offline, burst arrival at hour 24.
          Earliest predicted bottleneck:{" "}
          <strong>
            {predSummary.earliest_congestion_hour != null
              ? `Hour ${predSummary.earliest_congestion_hour}`
              : "—"}
          </strong>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Vessels Scheduled" value={vesselCount} sub="72-hour window" />
        <Stat label="Vessels Assigned" value={metrics.vessels_assigned} sub="berths allocated" />
        <Stat
          label="Avg Wait — Before"
          value={`${metrics.avg_wait_before_hours.toFixed(1)}h`}
          sub="no optimization"
          color="text-red-400"
        />
        <Stat
          label="Avg Wait — After"
          value={`${metrics.avg_wait_after_hours.toFixed(1)}h`}
          sub="with optimization"
          color="text-green-400"
        />
        <Stat
          label="Wait Reduction"
          value={`${improvement}%`}
          sub="improvement"
          color={improvColor}
        />
        <Stat
          label="Incidents Avoided"
          value={metrics.congestion_incidents_avoided}
          sub="congestion windows"
          color="text-amber-400"
        />
      </div>
    </div>
  );
}
