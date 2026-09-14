"use client";

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

type Props = {
  assignments: Assignment[];
  baseTs: number;
};

function waitBadge(h: number) {
  if (h <= 0.5) return <span className="text-xs bg-green-800 text-green-200 px-1.5 py-0.5 rounded">{h.toFixed(1)}h wait</span>;
  if (h <= 2) return <span className="text-xs bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded">{h.toFixed(1)}h wait</span>;
  return <span className="text-xs bg-red-800 text-red-200 px-1.5 py-0.5 rounded">{h.toFixed(1)}h wait</span>;
}

function ts(unix: number): string {
  if (!unix || unix === 0) return "—";
  try {
    return format(new Date(unix * 1000), "EEE HH:mm");
  } catch {
    return "—";
  }
}

export default function AssignmentTimeline({ assignments, baseTs }: Props) {
  // Sort by service_start
  const sorted = [...assignments].sort((a, b) => a.service_start - b.service_start);

  if (!sorted.length) {
    return <p className="text-slate-500 text-sm">No assignments to display.</p>;
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">Vessel</th>
            <th className="px-4 py-3 text-left">Berth</th>
            <th className="px-4 py-3 text-left">Start</th>
            <th className="px-4 py-3 text-left">End</th>
            <th className="px-4 py-3 text-left">Cranes</th>
            <th className="px-4 py-3 text-left">TEU/h</th>
            <th className="px-4 py-3 text-left">Wait</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 80).map((a, i) => (
            <tr
              key={i}
              className={`border-t border-slate-700/50 ${
                i % 2 === 0 ? "bg-slate-800" : "bg-slate-800/60"
              } hover:bg-slate-700/40 transition`}
            >
              <td className="px-4 py-2.5 font-mono text-slate-300">{a.vessel_id}</td>
              <td className="px-4 py-2.5">
                <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs font-medium">
                  {a.berth_id}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-400">{ts(a.service_start)}</td>
              <td className="px-4 py-2.5 text-slate-400">{ts(a.service_end)}</td>
              <td className="px-4 py-2.5 text-slate-400">{a.crane_ids.length}×</td>
              <td className="px-4 py-2.5 text-slate-300">{a.teu_per_hour.toFixed(0)}</td>
              <td className="px-4 py-2.5">{waitBadge(a.wait_time_hours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > 80 && (
        <p className="text-xs text-slate-500 text-center p-3">
          Showing first 80 of {sorted.length} assignments
        </p>
      )}
    </div>
  );
}
