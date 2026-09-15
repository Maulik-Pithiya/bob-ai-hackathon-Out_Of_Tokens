"use client";

/**
 * CongestionHeatmap — true grid, warm light theme.
 * Berths on Y-axis, 6-hour buckets on X-axis.
 * Cells coloured on a continuous gradient based on max risk score.
 * Clicking a cell fires onBerthClick(berth_id).
 */

import { useState } from "react";

type Slot = {
  berth_id: string;
  slot_index: number;
  hour_start: number;
  hour_end: number;
  risk_score: number;
  flag_level: string;
  expected_arrivals: number;
  expected_queue: number;
};

type Props = {
  flaggedSlots: Slot[];
  onBerthClick?: (berthId: string) => void;
  changedSlotKeys?: Set<string>;
};

const BERTHS      = ["B01","B02","B03","B04","B05","B06","B07","B08"];
const BUCKET_HRS  = 6;
const NUM_BUCKETS = 72 / BUCKET_HRS;

// ── Colour map (warm light palette) ──────────────────────────
// Empty cell → warm stone; risk → green → amber → terracotta → crimson

function riskToColor(risk: number): string {
  if (risk <= 0) return "#E8E5DE"; // empty = sunken token

  const t = Math.min(Math.max(risk, 0), 1);

  // Segment 1 [0–0.4]: forest-green → amber
  // Segment 2 [0.4–0.7]: amber → terracotta
  // Segment 3 [0.7–1.0]: terracotta → crimson
  let r: number, g: number, b: number;

  if (t <= 0.4) {
    const s = t / 0.4;
    r = lerp(0x2E, 0xD9, s); g = lerp(0x7D, 0x7C, s); b = lerp(0x32, 0x20, s);
  } else if (t <= 0.7) {
    const s = (t - 0.4) / 0.3;
    r = lerp(0xD9, 0xB5, s); g = lerp(0x7C, 0x51, s); b = lerp(0x20, 0x2D, s);
  } else {
    const s = (t - 0.7) / 0.3;
    r = lerp(0xB5, 0xC6, s); g = lerp(0x51, 0x28, s); b = lerp(0x2D, 0x28, s);
  }

  return `#${h(r)}${h(g)}${h(b)}`;
}

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }
function h(n: number) { return Math.min(255,Math.max(0,Math.round(n))).toString(16).padStart(2,"0"); }

function textOn(hex: string): string {
  if (hex === "#E8E5DE") return "#9C968C";
  const r = parseInt(hex.slice(1,3), 16);
  return r > 160 ? "#1E1C18" : "#F7F5F0";
}

type TipState = {
  berthId: string; label: string; maxRisk: number;
  flagLevel: string; arrivals: number; x: number; y: number;
} | null;

export default function CongestionHeatmap({ flaggedSlots, onBerthClick, changedSlotKeys }: Props) {
  const [tip, setTip] = useState<TipState>(null);

  // Build grid
  const grid: Record<string, Record<number, { maxRisk: number; flagLevel: string; arrivals: number }>> = {};
  for (const b of BERTHS) {
    grid[b] = {};
    for (let bk = 0; bk < NUM_BUCKETS; bk++) grid[b][bk] = { maxRisk: 0, flagLevel: "OK", arrivals: 0 };
  }
  for (const s of flaggedSlots) {
    const bk = Math.floor(s.hour_start / BUCKET_HRS);
    if (bk < 0 || bk >= NUM_BUCKETS) continue;
    const cell = grid[s.berth_id]?.[bk];
    if (!cell) continue;
    if (s.risk_score > cell.maxRisk) { cell.maxRisk = s.risk_score; cell.flagLevel = s.flag_level; }
    cell.arrivals += s.expected_arrivals;
  }

  return (
    <div className="p-4 overflow-x-auto">
      <div className="min-w-[520px]">
        {/* Column headers */}
        <div className="flex mb-1 ml-[64px]">
          {Array.from({ length: NUM_BUCKETS }, (_, bk) => (
            <div key={bk} className="flex-1 text-center text-2xs text-ink-faint font-medium">
              {bk * BUCKET_HRS}h
            </div>
          ))}
        </div>

        {/* Rows */}
        {BERTHS.map((berth) => (
          <div key={berth} className="flex items-center mb-0.5">
            <button
              className="w-[64px] shrink-0 text-2xs text-ink-muted font-semibold pr-2 text-right hover:text-teal-600 transition-colors"
              onClick={() => onBerthClick?.(berth)}
            >
              {berth}
            </button>
            {Array.from({ length: NUM_BUCKETS }, (_, bk) => {
              const cell   = grid[berth][bk];
              const bg     = riskToColor(cell.maxRisk);
              const fg     = textOn(bg);
              const isChg  = changedSlotKeys?.has(`${berth}_${bk * BUCKET_HRS}`);

              return (
                <div
                  key={bk}
                  className={`flex-1 h-7 mx-px rounded-sm cursor-pointer transition-all duration-100 hover:opacity-80 hover:scale-y-110 ${
                    isChg ? "ring-2 ring-teal-400 ring-offset-1" : ""
                  }`}
                  style={{ backgroundColor: bg }}
                  onMouseEnter={(e) => {
                    const r = (e.target as HTMLElement).getBoundingClientRect();
                    setTip({ berthId: berth, label: `h${bk*BUCKET_HRS}–${(bk+1)*BUCKET_HRS}`,
                      maxRisk: cell.maxRisk, flagLevel: cell.flagLevel,
                      arrivals: cell.arrivals, x: r.left + r.width/2, y: r.top });
                  }}
                  onMouseLeave={() => setTip(null)}
                  onClick={() => { if (cell.maxRisk > 0) onBerthClick?.(berth); }}
                >
                  {cell.maxRisk >= 0.65 && (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold leading-none"
                         style={{ color: fg }}>
                      {(cell.maxRisk * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
        <span className="text-2xs text-ink-faint">Risk scale:</span>
        <div className="h-2.5 w-32 rounded" style={{
          background: "linear-gradient(to right, #2E7D32, #D97C20, #B5512D, #C62828)"
        }} />
        <div className="flex gap-3 text-2xs text-ink-faint">
          <span>0% low</span>
          <span className="text-terra-500 font-medium">65% HIGH</span>
          <span className="text-danger font-medium">85% CRITICAL</span>
        </div>
      </div>

      {/* Tooltip */}
      {tip && (
        <div className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mt-[-6px]
                        bg-ink text-canvas text-xs rounded-lg px-3 py-2 shadow-card-md"
             style={{ left: tip.x, top: tip.y }}>
          <p className="font-semibold mb-0.5">{tip.berthId} · {tip.label}</p>
          <p>Peak risk: <strong className={
            tip.flagLevel === "CRITICAL" ? "text-terra-200" :
            tip.flagLevel === "HIGH"     ? "text-terra-300" : "text-canvas/70"
          }>{(tip.maxRisk * 100).toFixed(0)}%</strong> <span className="opacity-50">({tip.flagLevel})</span></p>
          {tip.arrivals > 0 && <p>Arrivals in window: {tip.arrivals}</p>}
        </div>
      )}
    </div>
  );
}
