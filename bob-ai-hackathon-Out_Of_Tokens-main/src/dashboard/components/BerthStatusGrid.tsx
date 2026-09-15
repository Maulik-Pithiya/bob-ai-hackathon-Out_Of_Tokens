"use client";

/**
 * BerthStatusGrid — warm light theme.
 * Risk tiers derived from data-relative thresholds (port-mean based).
 * Hover tooltip shows why a berth is flagged.
 * highlightedBerth prop (from heatmap click) adds a teal focus ring.
 */

import { useState } from "react";

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
  highlightedBerth?: string | null;
};

const BERTHS = ["B01","B02","B03","B04","B05","B06","B07","B08"];

const BERTH_LABELS: Record<string,string> = {
  B01: "B01 – N.Quay A",   B02: "B02 – N.Quay B",
  B03: "B03 – East A",     B04: "B04 – East B",
  B05: "B05 – South A",    B06: "B06 – South B",
  B07: "B07 – Deep Water A", B08: "B08 – Deep Water B",
};

type Tier = "NORMAL" | "ELEVATED" | "CRITICAL" | "IDLE";

function tier(avgWait: number, portMean: number, flagged: boolean): Tier {
  if (avgWait === 0) return "IDLE";
  if (flagged && avgWait > portMean * 1.35) return "CRITICAL";
  if (flagged || avgWait > portMean) return "ELEVATED";
  return "NORMAL";
}

const CARD: Record<Tier,string> = {
  NORMAL:   "bg-surface border-border",
  ELEVATED: "bg-terra-50 border-terra-200",
  CRITICAL: "bg-danger-light border-danger/40",
  IDLE:     "bg-sunken border-border",
};

const BADGE: Record<Tier,string> = {
  NORMAL:   "bg-good-light text-good border-good/30 border",
  ELEVATED: "bg-terra-100 text-terra-700 border-terra-300 border",
  CRITICAL: "bg-danger-light text-danger border-danger/40 border",
  IDLE:     "bg-sunken text-ink-faint border-border border",
};

const BADGE_LABEL: Record<Tier,string> = {
  NORMAL: "✓ Normal", ELEVATED: "↑ Elevated", CRITICAL: "⚠ Critical", IDLE: "— Idle",
};

const WAIT_COLOR: Record<Tier,string> = {
  NORMAL: "text-good-dark", ELEVATED: "text-terra-600", CRITICAL: "text-danger", IDLE: "text-ink-faint",
};

function Tooltip({ t, avgWait, portMean, flagged }: { t: Tier; avgWait: number; portMean: number; flagged: boolean }) {
  const pct = portMean > 0 ? ((avgWait - portMean) / portMean * 100) : 0;
  return (
    <div className="absolute z-20 bottom-full left-0 mb-1.5 w-52 bg-ink text-canvas text-2xs rounded-lg px-3 py-2 shadow-card-md pointer-events-none">
      <p className="font-semibold mb-0.5">{BADGE_LABEL[t]}</p>
      <p>Avg wait: <strong>{avgWait.toFixed(1)}h</strong></p>
      <p>Port avg: <strong>{portMean.toFixed(1)}h</strong></p>
      {portMean > 0 && <p>{pct >= 0 ? "+" : ""}{pct.toFixed(0)}% vs port avg</p>}
      {flagged && <p className="mt-1 text-terra-200">Flagged by congestion predictor</p>}
    </div>
  );
}

export default function BerthStatusGrid({ assignments, flaggedSlots, highlightedBerth }: Props) {
  const [hovered, setHovered] = useState<string|null>(null);

  const flaggedBerths = new Set(flaggedSlots.map(s => s.berth_id));
  const berthAsgn: Record<string,Assignment[]> = {};
  for (const b of BERTHS) berthAsgn[b] = [];
  for (const a of assignments) if (berthAsgn[a.berth_id]) berthAsgn[a.berth_id].push(a);

  const avgWaits: Record<string,number> = {};
  for (const b of BERTHS) {
    const list = berthAsgn[b];
    avgWaits[b] = list.length > 0 ? list.reduce((s,a)=>s+a.wait_time_hours,0)/list.length : 0;
  }

  const occ = BERTHS.map(b=>avgWaits[b]).filter(w=>w>0);
  const portMean = occ.length > 0 ? occ.reduce((s,w)=>s+w,0)/occ.length : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {BERTHS.map(b => {
        const list   = berthAsgn[b];
        const flagged = flaggedBerths.has(b);
        const n       = list.length;
        const avg     = avgWaits[b];
        const t       = n === 0 ? "IDLE" : tier(avg, portMean, flagged);
        const hilight = highlightedBerth === b;

        return (
          <div
            key={b}
            className={`relative rounded-xl p-3 border shadow-card transition-all duration-300
              ${CARD[t]}
              ${hilight ? "ring-2 ring-teal-400 ring-offset-2 ring-offset-canvas scale-[1.02]" : ""}
            `}
            onMouseEnter={() => setHovered(b)}
            onMouseLeave={() => setHovered(null)}
          >
            {hovered === b && n > 0 && (
              <Tooltip t={t} avgWait={avg} portMean={portMean} flagged={flagged} />
            )}

            <div className="flex items-start justify-between mb-1.5">
              <span className="text-2xs font-semibold text-ink-muted leading-tight">{BERTH_LABELS[b]}</span>
              <span className={`text-2xs px-1.5 py-0.5 rounded font-semibold shrink-0 ml-1 ${BADGE[t]}`}>
                {BADGE_LABEL[t]}
              </span>
            </div>

            <p className="text-2xl font-display font-bold text-ink leading-none">{n}</p>
            <p className="text-2xs text-ink-faint mt-0.5">{n === 1 ? "vessel" : "vessels"}</p>

            {n > 0 && (
              <p className={`text-xs mt-1.5 font-medium ${WAIT_COLOR[t]}`}>
                {avg.toFixed(1)}h avg wait
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
