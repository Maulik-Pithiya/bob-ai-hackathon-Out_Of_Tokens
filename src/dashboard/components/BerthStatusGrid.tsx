"use client";

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
  flaggedSlots: any[];
};

const BERTHS = ["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08"];

const BERTH_LABELS: Record<string, string> = {
  B01: "B1 – N.Quay A",
  B02: "B2 – N.Quay B",
  B03: "B3 – East A",
  B04: "B4 – East B",
  B05: "B5 – South A",
  B06: "B6 – South B",
  B07: "B7 – DeepWater A",
  B08: "B8 – DeepWater B",
};

function waitColor(h: number): string {
  if (h <= 0.5) return "bg-green-700";
  if (h <= 2) return "bg-amber-600";
  return "bg-red-700";
}

export default function BerthStatusGrid({ assignments, flaggedSlots }: Props) {
  const flaggedBerths = new Set(flaggedSlots.map((s) => s.berth_id));
  const berthAssignments: Record<string, Assignment[]> = {};
  for (const b of BERTHS) berthAssignments[b] = [];
  for (const a of assignments) {
    if (berthAssignments[a.berth_id]) berthAssignments[a.berth_id].push(a);
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {BERTHS.map((b) => {
        const list = berthAssignments[b];
        const isFlagged = flaggedBerths.has(b);
        const totalVessels = list.length;
        const avgWait =
          totalVessels > 0
            ? list.reduce((s, a) => s + a.wait_time_hours, 0) / totalVessels
            : 0;

        return (
          <div
            key={b}
            className={`rounded-xl p-3 border ${
              isFlagged
                ? "bg-red-950/40 border-red-600"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">{BERTH_LABELS[b]}</span>
              {isFlagged && (
                <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">
                  ⚠ Risk
                </span>
              )}
            </div>
            <p className="text-xl font-bold text-white">{totalVessels}</p>
            <p className="text-xs text-slate-400">vessels assigned</p>
            <div className="mt-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium text-white ${waitColor(avgWait)}`}>
                avg wait {avgWait.toFixed(1)}h
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
