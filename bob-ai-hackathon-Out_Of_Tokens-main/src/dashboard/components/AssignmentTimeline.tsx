"use client";

/**
 * AssignmentTimeline — warm light theme.
 * Wait badge colours are percentile-relative (bottom 33% green, mid amber, top red).
 * Summary strip shows avg/max wait above the table.
 */

import { format } from "date-fns";

type Assignment = {
  vessel_id: string;
  berth_id: string;
  crane_ids: string[];
  service_start: number;
  service_end: number;
  wait_time_hours: number;
  teu_per_hour: number;
};

type Props = { assignments: Assignment[]; baseTs: number; };

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function badgeClass(wait: number, p33: number, p66: number): string {
  if (wait <= p33) return "bg-good-light text-good-dark border border-good/30";
  if (wait <= p66) return "bg-terra-50 text-terra-700 border border-terra-200";
  return "bg-danger-light text-danger border border-danger/30";
}

function fmtWait(h: number): string {
  if (h < 0.01) return "0.0h";
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${h.toFixed(0)}h`;
}

function fmtDur(s: number, e: number): string {
  if (!s || !e || e <= s) return "—";
  const h = (e - s) / 3600;
  if (h < 1) return `${Math.round(h*60)}m`;
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${h.toFixed(0)}h`;
}

function ts(unix: number): string {
  if (!unix || unix === 0) return "—";
  try { return format(new Date(unix * 1000), "EEE HH:mm"); }
  catch { return "—"; }
}

export default function AssignmentTimeline({ assignments, baseTs }: Props) {
  const sorted = [...assignments].sort((a, b) => a.service_start - b.service_start);
  if (!sorted.length) return <p className="text-ink-faint text-sm">No assignments to display.</p>;

  const sortedWaits = sorted.map(a => a.wait_time_hours).sort((a,b) => a-b);
  const p33 = pct(sortedWaits, 33);
  const p66 = pct(sortedWaits, 66);
  const nonZero = sortedWaits.filter(w => w > 0);
  const avgWait = nonZero.length ? nonZero.reduce((s,w)=>s+w,0)/nonZero.length : 0;
  const maxWait = sortedWaits[sortedWaits.length - 1] ?? 0;

  return (
    <div className="space-y-2">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-xs text-ink-muted px-0.5">
        <span><strong className="text-ink">{sorted.length}</strong> assignments</span>
        <span>avg wait (non-zero): <strong className="text-terra-600">{fmtWait(avgWait)}</strong></span>
        <span>max wait: <strong className="text-danger">{fmtWait(maxWait)}</strong></span>
        <span className="text-ink-faint">colour: bottom 33% green · mid amber · top red</span>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-sunken text-ink-muted uppercase tracking-widest text-2xs border-b border-border">
              <th className="px-4 py-2.5 text-left font-semibold">Vessel</th>
              <th className="px-4 py-2.5 text-left font-semibold">Berth</th>
              <th className="px-4 py-2.5 text-left font-semibold">Start</th>
              <th className="px-4 py-2.5 text-left font-semibold">Duration</th>
              <th className="px-4 py-2.5 text-left font-semibold">Cranes</th>
              <th className="px-4 py-2.5 text-left font-semibold">TEU/h</th>
              <th className="px-4 py-2.5 text-left font-semibold">Wait</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 80).map((a, i) => (
              <tr key={i}
                className={`border-t border-border/60 hover:bg-sunken transition-colors ${
                  i % 2 === 0 ? "bg-surface" : "bg-canvas"
                }`}>
                <td className="px-4 py-2 font-mono text-ink-muted">{a.vessel_id}</td>
                <td className="px-4 py-2">
                  <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-2xs font-semibold">
                    {a.berth_id}
                  </span>
                </td>
                <td className="px-4 py-2 text-ink-muted">{ts(a.service_start)}</td>
                <td className="px-4 py-2 text-ink-muted">{fmtDur(a.service_start, a.service_end)}</td>
                <td className="px-4 py-2 text-ink-muted">{a.crane_ids.length}×</td>
                <td className="px-4 py-2 text-ink">{a.teu_per_hour.toFixed(0)}</td>
                <td className="px-4 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${badgeClass(a.wait_time_hours, p33, p66)}`}>
                    {fmtWait(a.wait_time_hours)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length > 80 && (
          <p className="text-2xs text-ink-faint text-center py-2.5 border-t border-border">
            Showing 80 of {sorted.length}
          </p>
        )}
      </div>
    </div>
  );
}
