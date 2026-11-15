"use client";

import { useId, useMemo, useState } from "react";
import {
  CELL,
  DOMAIN,
  NEAR,
  type CoverageCell,
  type CoverageStatus,
} from "@/lib/coverage";
import { OUTCOMES, OUTCOME_META, fmtNum, investigationLabel } from "@/lib/format";
import type { Atmosphere, ScoredFinding } from "@/lib/schema";
import { OutcomeIcon, OutcomeShape } from "./Outcome";

interface Props {
  atmosphere: Atmosphere;
  findings: ScoredFinding[];
  cells: CoverageCell[];
  onSelect: (id: string) => void;
}

const W = 360;
const H = 320;
const M = { top: 12, right: 12, bottom: 44, left: 44 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const O = DOMAIN.oxygen_pct;
const P = DOMAIN.pressure_kpa;
const x = (o: number) => M.left + ((o - O.min) / (O.max - O.min)) * PW;
const y = (p: number) => M.top + PH - ((p - P.min) / (P.max - P.min)) * PH;


// Merge same-status neighbours in a row into one rect.
export function runs(cells: CoverageCell[]) {
  const out: { o: number; p: number; width: number; status: CoverageStatus }[] = [];
  for (const cell of cells) {
    const last = out[out.length - 1];
    if (
      last &&
      last.p === cell.pressure_kpa &&
      last.status === cell.status &&
      last.o + last.width === cell.oxygen_pct
    ) {
      last.width += CELL.oxygen_pct;
    } else {
      out.push({
        o: cell.oxygen_pct,
        p: cell.pressure_kpa,
        width: CELL.oxygen_pct,
        status: cell.status,
      });
    }
  }
  return out;
}

export default function ConditionsChart({ atmosphere, findings, cells, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  // Per-instance ids: a hidden copy of the page may also be in the document.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const FILL: Record<CoverageStatus, string> = {
    tested: "var(--color-ramp-1)",
    thin: `url(#${uid}-hatch-light)`,
    untested: `url(#${uid}-hatch)`,
  };
  const background = useMemo(() => runs(cells), [cells]);

  // Marks that would overlap are spread sideways so each stays readable and
  // selectable. The tooltip and the card carry the exact values.
  const points = useMemo(() => {
    const SPACING = 13;
    const plotted = findings
      .filter((f) => f.oxygen_pct !== null && f.pressure_kpa !== null)
      .map((f) => ({ f, cx: x(f.oxygen_pct as number), cy: y(f.pressure_kpa as number) }))
      .sort((a, b) => a.cx - b.cx || a.f.id.localeCompare(b.f.id));
    const clusters: (typeof plotted)[] = [];
    for (const point of plotted) {
      const home = clusters.find((cluster) =>
        cluster.some(
          (other) =>
            Math.abs(other.cx - point.cx) < SPACING && Math.abs(other.cy - point.cy) < SPACING
        )
      );
      if (home) home.push(point);
      else clusters.push([point]);
    }
    return clusters.flatMap((cluster) => {
      if (cluster.length === 1) return cluster;
      const centre = cluster.reduce((sum, pt) => sum + pt.cx, 0) / cluster.length;
      const row = cluster.reduce((sum, pt) => sum + pt.cy, 0) / cluster.length;
      return cluster.map((pt, i) => ({
        f: pt.f,
        cx: centre + (i - (cluster.length - 1) / 2) * SPACING,
        cy: row,
      }));
    });
  }, [findings]);

  const oxygenOnly = findings.filter((f) => f.oxygen_pct !== null && f.pressure_kpa === null);
  const unplotted = findings.length - points.length;
  const active = points.find((pt) => pt.f.id === hovered);

  const cx = x(atmosphere.oxygen_pct);
  const cy = y(atmosphere.pressure_kpa);
  const boxLeft = Math.max(x(atmosphere.oxygen_pct - NEAR.oxygen_pct), M.left);
  const boxRight = Math.min(x(atmosphere.oxygen_pct + NEAR.oxygen_pct), M.left + PW);
  const boxTop = Math.max(y(atmosphere.pressure_kpa + NEAR.pressure_kpa), M.top);
  const boxBottom = Math.min(y(atmosphere.pressure_kpa - NEAR.pressure_kpa), M.top + PH);

  return (
    <section
      aria-label="Tested conditions"
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-4 py-3"
    >
      <div className="flex flex-col">
        <h3 className="text-base font-semibold">Where the tests are</h3>
        <p className="text-xs text-ink-2">
          Each mark is one finding at its tested oxygen and pressure. Hatching means little or no
          evidence. Select a mark to open its card.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
      {/* The plot scales with the window height so the whole view fits at 100 % zoom. */}
      <div
        className="relative min-w-[240px] flex-1"
        style={{ maxWidth: "max(220px, calc((100dvh - 395px) * 1.125))" }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Oxygen against pressure, with every plottable finding and your atmosphere">
          <defs>
            <pattern id={`${uid}-hatch`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="var(--chart-hatch-bg)" />
              <rect width="2" height="8" fill="var(--chart-hatch-line)" />
            </pattern>
            <pattern id={`${uid}-hatch-light`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="12" fill="var(--chart-hatch-bg)" />
              <rect width="1" height="12" fill="var(--chart-hatch-line)" />
            </pattern>
            <clipPath id={`${uid}-plot`}>
              <rect x={M.left} y={M.top} width={PW} height={PH} />
            </clipPath>
          </defs>

          <g clipPath={`url(#${uid}-plot)`}>
            {background.map((r) => (
              <rect
                key={`${r.o}:${r.p}`}
                x={x(r.o)}
                y={y(r.p + CELL.pressure_kpa)}
                width={x(r.o + r.width) - x(r.o) + 0.5}
                height={y(r.p) - y(r.p + CELL.pressure_kpa) + 0.5}
                fill={FILL[r.status]}
              />
            ))}
          </g>
          <rect x={M.left} y={M.top} width={PW} height={PH} fill="none" stroke="var(--color-line)" />

          {[10, 20, 30, 40].map((o) => (
            <g key={o}>
              <line x1={x(o)} x2={x(o)} y1={M.top + PH} y2={M.top + PH + 4} stroke="var(--color-muted)" />
              <text x={x(o)} y={M.top + PH + 16} textAnchor="middle" className="num fill-ink-2 text-[10px]">
                {o}
              </text>
            </g>
          ))}
          {[40, 60, 80, 100].map((p) => (
            <g key={p}>
              <line x1={M.left - 4} x2={M.left} y1={y(p)} y2={y(p)} stroke="var(--color-muted)" />
              <text x={M.left - 7} y={y(p) + 3} textAnchor="end" className="num fill-ink-2 text-[10px]">
                {p}
              </text>
            </g>
          ))}
          <text x={M.left + PW / 2} y={H - 6} textAnchor="middle" className="fill-ink-2 text-[11px]">
            Oxygen, % O₂
          </text>
          <text
            transform={`translate(11 ${M.top + PH / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-ink-2 text-[11px]"
          >
            Pressure, kPa
          </text>

          {/* Findings that report oxygen but not pressure: ticks on the oxygen axis. */}
          {oxygenOnly.map((f) => (
            <line
              key={f.id}
              x1={x(f.oxygen_pct as number)}
              x2={x(f.oxygen_pct as number)}
              y1={M.top + PH - 7}
              y2={M.top + PH}
              stroke={OUTCOME_META[f.outcome].color}
              strokeWidth="2"
            >
              <title>{`${f.id}: ${fmtNum(f.oxygen_pct as number)} % O₂, pressure not reported`}</title>
            </line>
          ))}

          {/* The selected atmosphere: crosshair plus the close-range window. */}
          <g clipPath={`url(#${uid}-plot)`} pointerEvents="none">
            <rect
              x={boxLeft}
              y={boxTop}
              width={boxRight - boxLeft}
              height={boxBottom - boxTop}
              fill="var(--chart-range-fill)"
              stroke="var(--color-accent)"
              strokeDasharray="3 3"
            />
            <line x1={cx} x2={cx} y1={M.top} y2={M.top + PH} stroke="var(--color-accent)" strokeWidth="1" />
            <line x1={M.left} x2={M.left + PW} y1={cy} y2={cy} stroke="var(--color-accent)" strokeWidth="1" />
          </g>

          {points.map(({ f, cx: px, cy: py }) => (
            <g
              key={f.id}
              transform={`translate(${px} ${py})`}
              role="button"
              tabIndex={0}
              aria-label={`${f.id}: ${f.fuel}, ${fmtNum(f.oxygen_pct as number)} % oxygen, ${fmtNum(
                f.pressure_kpa as number
              )} kPa, ${OUTCOME_META[f.outcome].label}. Open card.`}
              className="cursor-pointer"
              onClick={() => onSelect(f.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(f.id);
                }
              }}
              onMouseEnter={() => setHovered(f.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(f.id)}
              onBlur={() => setHovered(null)}
            >
              <circle r="6.5" fill="var(--chart-mark-halo)" opacity={hovered === f.id ? 1 : 0.85} stroke={hovered === f.id ? "var(--color-ink)" : "none"} />
              <OutcomeShape outcome={f.outcome} />
            </g>
          ))}

          <circle cx={cx} cy={cy} r="5" fill="var(--chart-mark-halo)" stroke="var(--color-accent)" strokeWidth="2" pointerEvents="none" />
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute z-10 w-44 rounded-md border border-line bg-surface-2 p-2 text-xs"
            style={{
              left: `${Math.min(Math.max((active.cx / W) * 100, 26), 74)}%`,
              top: `${(active.cy / H) * 100}%`,
              transform: `translate(-50%, ${active.cy < 110 ? "14px" : "calc(-100% - 14px)"})`,
            }}
          >
            <p className="font-semibold">
              {investigationLabel(active.f.investigation_id)} {active.f.fuel}
            </p>
            <p className="tnum text-ink-2">
              {fmtNum(active.f.oxygen_pct as number)} % O₂, {fmtNum(active.f.pressure_kpa as number)} kPa
            </p>
            <p style={{ color: OUTCOME_META[active.f.outcome].color }}>
              {OUTCOME_META[active.f.outcome].label}
            </p>
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-52">
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2 sm:grid sm:grid-cols-2">
        {OUTCOMES.map((outcome) => (
          <li key={outcome} className="flex items-center gap-1.5">
            <OutcomeIcon outcome={outcome} size={10} />
            {OUTCOME_META[outcome].label}
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2 text-xs text-ink-2 sm:flex-col">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 shrink-0 rounded-full border-2 border-accent" /> Your atmosphere, with its
          close range
        </li>
        <li className="flex items-center gap-1.5">
          <span className="hatch h-3 w-4 rounded-sm border border-line" /> Untested
        </li>
        <li className="flex items-center gap-1.5">
          <span className="hatch-light h-3 w-4 rounded-sm border border-line" /> Thin
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm border border-line bg-ramp-1" /> Tested
        </li>
      </ul>
      {unplotted > 0 && (
        <p className="border-t border-line pt-2 text-xs text-muted">
          {unplotted} of {findings.length} findings do not report both oxygen and pressure, so they
          cannot be placed here. They still rank in the list. Ticks on the oxygen axis mark the{" "}
          {oxygenOnly.length} that report oxygen only.
        </p>
      )}
      </div>
      </div>
    </section>
  );
}
