// Coverage: how much evidence sits near a point on the oxygen x pressure plane.
// One definition, used for the verdict, the chart shading and the gaps panel.
//
// A finding is "near" a point when it reports both oxygen and pressure and
// lies within NEAR.oxygen_pct and NEAR.pressure_kpa of it. Several findings
// taken from the same burn share one (oxygen, pressure) pair and count as one
// test condition, so one experiment cannot make a region look well tested.
import type { Finding } from "./schema";

export const NEAR = { oxygen_pct: 5, pressure_kpa: 15 } as const;

// The mapped plane. Sliders are clamped to the same bounds.
export const DOMAIN = {
  oxygen_pct: { min: 10, max: 40 },
  pressure_kpa: { min: 30, max: 110 },
  flow_cm_s: { min: 0, max: 50 },
} as const;

export type CoverageStatus = "tested" | "thin" | "untested";

export interface Coverage {
  status: CoverageStatus;
  findings: Finding[];
  conditions: number;
  investigations: string[];
}

export function plottable(findings: Finding[]): Finding[] {
  return findings.filter(
    (f) => f.source_checked && f.oxygen_pct !== null && f.pressure_kpa !== null
  );
}

export function statusFor(conditions: number): CoverageStatus {
  return conditions === 0 ? "untested" : conditions <= 2 ? "thin" : "tested";
}

export function coverageAt(
  oxygen_pct: number,
  pressure_kpa: number,
  findings: Finding[]
): Coverage {
  const near = plottable(findings).filter(
    (f) =>
      Math.abs((f.oxygen_pct as number) - oxygen_pct) <= NEAR.oxygen_pct &&
      Math.abs((f.pressure_kpa as number) - pressure_kpa) <= NEAR.pressure_kpa
  );
  const conditions = new Set(near.map((f) => `${f.oxygen_pct}:${f.pressure_kpa}`)).size;
  return {
    status: statusFor(conditions),
    findings: near,
    conditions,
    investigations: Array.from(new Set(near.map((f) => f.investigation_id))),
  };
}

export interface CoverageCell {
  oxygen_pct: number; // lower edge
  pressure_kpa: number; // lower edge
  status: CoverageStatus;
}

export const CELL = { oxygen_pct: 1, pressure_kpa: 2 } as const;

// Samples the plane on a fine grid; each cell takes the status at its centre.
export function buildCoverageGrid(findings: Finding[]): CoverageCell[] {
  const cells: CoverageCell[] = [];
  for (let p = DOMAIN.pressure_kpa.min; p < DOMAIN.pressure_kpa.max; p += CELL.pressure_kpa) {
    for (let o = DOMAIN.oxygen_pct.min; o < DOMAIN.oxygen_pct.max; o += CELL.oxygen_pct) {
      cells.push({
        oxygen_pct: o,
        pressure_kpa: p,
        status: coverageAt(o + CELL.oxygen_pct / 2, p + CELL.pressure_kpa / 2, findings)
          .status,
      });
    }
  }
  return cells;
}

export function coverageShare(cells: CoverageCell[]): Record<CoverageStatus, number> {
  const share = { tested: 0, thin: 0, untested: 0 };
  for (const cell of cells) share[cell.status] += 1 / cells.length;
  return share;
}

// The closest point of the mapped plane that counts as tested, measured in
// units of the NEAR window so oxygen and pressure are comparable.
export function nearestTested(
  oxygen_pct: number,
  pressure_kpa: number,
  cells: CoverageCell[]
): { oxygen_pct: number; pressure_kpa: number } | null {
  let best: { oxygen_pct: number; pressure_kpa: number } | null = null;
  let bestDistance = Infinity;
  for (const cell of cells) {
    if (cell.status !== "tested") continue;
    const o = cell.oxygen_pct + CELL.oxygen_pct / 2;
    const p = cell.pressure_kpa + CELL.pressure_kpa / 2;
    const distance = Math.hypot(
      (o - oxygen_pct) / NEAR.oxygen_pct,
      (p - pressure_kpa) / NEAR.pressure_kpa
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { oxygen_pct: o, pressure_kpa: p };
    }
  }
  return best;
}
