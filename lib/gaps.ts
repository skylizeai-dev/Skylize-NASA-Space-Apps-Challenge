// Data-gaps grid — plan.md section 5.
// Grids the oxygen x pressure plane; a cell with 0 verified findings is a gap, 1-2 is "thin".
import type { Finding } from "./schema";

export type GapStatus = "gap" | "thin" | "covered";

export interface GapCell {
  oxygenBucket: number; // lower bound of the O2 bucket, in %
  pressureBucket: number; // lower bound of the pressure bucket, in kPa
  count: number;
  status: GapStatus;
}

export function buildGapsGrid(
  findings: Finding[],
  oxygenStep = 10,
  pressureStep = 20,
  oxygenMax = 70,
  pressureMax = 101
): GapCell[] {
  const cells = new Map<string, GapCell>();

  for (let o = 0; o < oxygenMax; o += oxygenStep) {
    for (let p = 0; p < pressureMax; p += pressureStep) {
      cells.set(`${o}:${p}`, {
        oxygenBucket: o,
        pressureBucket: p,
        count: 0,
        status: "gap",
      });
    }
  }

  for (const f of findings) {
    if (!f.source_checked) continue;
    if (f.oxygen_pct === null || f.pressure_kpa === null) continue;

    const oBucket = Math.floor(f.oxygen_pct / oxygenStep) * oxygenStep;
    const pBucket = Math.floor(f.pressure_kpa / pressureStep) * pressureStep;
    const key = `${oBucket}:${pBucket}`;
    const cell = cells.get(key);
    if (cell) cell.count += 1;
  }

  for (const cell of cells.values()) {
    cell.status = cell.count === 0 ? "gap" : cell.count <= 2 ? "thin" : "covered";
  }

  return Array.from(cells.values());
}
