"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Slot = {
  berth_id: string;
  hour_start: number;
  risk_score: number;
  flag_level: string;
  expected_arrivals: number;
  expected_queue: number;
};

type Props = {
  flaggedSlots: Slot[];
};

const FLAG_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
};

const BERTH_Y: Record<string, number> = {
  B01: 1, B02: 2, B03: 3, B04: 4, B05: 5, B06: 6, B07: 7, B08: 8,
};

function RiskTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded p-2 text-xs text-slate-200">
      <p className="font-semibold">{d.berth_id} — Hour {d.hour_start}–{d.hour_start + 2}</p>
      <p>Risk: <span className="font-bold">{(d.risk_score * 100).toFixed(0)}%</span></p>
      <p>Flag: <span className={d.flag_level === "CRITICAL" ? "text-red-400" : "text-orange-400"}>{d.flag_level}</span></p>
      <p>Arrivals in slot: {d.expected_arrivals}</p>
      <p>Projected queue: {d.expected_queue}</p>
    </div>
  );
}

export default function CongestionHeatmap({ flaggedSlots }: Props) {
  const data = flaggedSlots.map((s) => ({
    ...s,
    y: BERTH_Y[s.berth_id] ?? 0,
    size: s.risk_score * 400 + 80,
  }));

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            dataKey="hour_start"
            name="Hour"
            domain={[0, 72]}
            tickCount={13}
            label={{ value: "Hour (from now)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 11 }}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Berth"
            domain={[0, 9]}
            tickCount={9}
            tickFormatter={(v) => Object.keys(BERTH_Y).find((k) => BERTH_Y[k] === v) ?? ""}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
          />
          <Tooltip content={<RiskTooltip />} />
          <Scatter name="Congestion Risk" data={data}>
            {data.map((d, i) => (
              <Cell key={i} fill={FLAG_COLOR[d.flag_level] ?? "#f97316"} fillOpacity={0.85} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Critical (&gt;85%)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> High (&gt;65%)</span>
        <span className="text-slate-500">Bubble size = risk magnitude</span>
      </div>
    </div>
  );
}
