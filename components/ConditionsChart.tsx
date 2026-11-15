"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { Atmosphere, ScoredFinding } from "@/lib/schema";

interface Props {
  atmosphere: Atmosphere;
  findings: ScoredFinding[];
}

export default function ConditionsChart({ atmosphere, findings }: Props) {
  const points = findings
    .filter((f) => f.oxygen_pct !== null && f.pressure_kpa !== null)
    .map((f) => ({
      x: f.oxygen_pct as number,
      y: f.pressure_kpa as number,
      z: Math.max(f.score, 0.05) * 100,
      label: `${f.fuel} (${f.outcome})`,
    }));

  return (
    <div className="h-80 w-full rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Oxygen"
            unit="%"
            domain={[0, 70]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Pressure"
            unit="kPa"
            domain={[0, 101]}
          />
          <ZAxis type="number" dataKey="z" range={[40, 300]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Findings" data={points} fill="#ea580c" />
          <Scatter
            name="Selected atmosphere"
            data={[{ x: atmosphere.oxygen_pct, y: atmosphere.pressure_kpa, z: 150 }]}
            fill="#1d4ed8"
            shape="star"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
