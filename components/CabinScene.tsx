"use client";

import type { FuelGroup } from "@/lib/format";
import type { Atmosphere } from "@/lib/schema";

// The setup's picture of the environment being built.
//
// Integration point for the 3D ISS cabin model (see docs/CABIN_3D_CONTRACT.md).
// The 3D component must keep this file's default export and its props, so it
// can replace this 2D placeholder without touching the setup flow. It fills
// its parent box; the setup sets that box's size.
export type SetupStep = "habitat" | "oxygen" | "pressure" | "airflow" | "material" | "review";

export interface CabinSceneProps {
  atmosphere: Atmosphere;
  material: FuelGroup | "any";
  // The question the user is answering, so the scene can highlight it.
  step: SetupStep;
}

const W = 320;
const H = 190;

export default function CabinScene({ atmosphere, material, step }: CabinSceneProps) {
  // Airflow is drawn as streak lines: none for still air, more as flow rises.
  const streaks = atmosphere.flow_cm_s === 0 ? 0 : Math.min(5, 1 + Math.round(atmosphere.flow_cm_s / 10));
  const highlightFlow = step === "airflow";
  const highlightSample = step === "material";
  const highlightAir = step === "oxygen" || step === "pressure";

  return (
    <figure className="flex h-full flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label={`Illustration of a cabin module: ${
          streaks === 0 ? "still air" : `airflow from left to right`
        }, with a ${material === "any" ? "test sample" : `${material} sample`} burning at the centre`}
      >
        <defs>
          <radialGradient id="cabin-flame" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--flame-micro-inner)" stopOpacity="0.25" />
            <stop offset="65%" stopColor="var(--flame-micro-ring)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--flame-micro-ring)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Module shell: a pressurised cylinder seen from the side. */}
        <rect
          x="12"
          y="22"
          width={W - 24}
          height={H - 44}
          rx="60"
          fill={highlightAir ? "rgb(10 110 150 / 0.1)" : "rgb(255 255 255 / 0.55)"}
          stroke="var(--color-ink-2)"
          strokeWidth="1.5"
        />
        <rect x="40" y="36" width={W - 80} height={H - 72} rx="44" fill="none" stroke="var(--color-line)" />
        {/* Hatches at each end */}
        <rect x="6" y={H / 2 - 22} width="10" height="44" rx="3" fill="var(--color-muted)" />
        <rect x={W - 16} y={H / 2 - 22} width="10" height="44" rx="3" fill="var(--color-muted)" />

        {/* Airflow streaks */}
        {Array.from({ length: streaks }, (_, i) => {
          const yy = 62 + i * ((H - 124) / Math.max(streaks - 1, 1));
          return (
            <g key={i} opacity={highlightFlow ? 1 : 0.55}>
              <line x1="54" x2="118" y1={yy} y2={yy} stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
              <path d={`M118 ${yy - 4} L126 ${yy} L118 ${yy + 4}`} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
            </g>
          );
        })}
        {streaks === 0 && (
          <text x="86" y={H / 2 + 4} textAnchor="middle" className="fill-muted text-[11px]">
            still air
          </text>
        )}

        {/* Sample and its flame */}
        <g transform={`translate(${W / 2 + 20} ${H / 2})`}>
          <circle r="30" fill="url(#cabin-flame)" />
          <Sample material={material} highlighted={highlightSample} />
        </g>
      </svg>
      <figcaption className="text-xs text-muted">Illustration, not a simulation.</figcaption>
    </figure>
  );
}

function Sample({ material, highlighted }: { material: FuelGroup | "any"; highlighted: boolean }) {
  const stroke = highlighted ? "var(--color-accent)" : "var(--color-ink-2)";
  const width = highlighted ? 2 : 1.25;
  switch (material) {
    case "fabric":
      return <path d="M-14 -16 Q-6 -10 -14 -2 Q-6 6 -14 14 L10 14 Q18 6 10 -2 Q18 -10 10 -16 Z" fill="#ffffff" stroke={stroke} strokeWidth={width} />;
    case "plastic":
      return <rect x="-12" y="-16" width="24" height="32" rx="2" fill="#ffffff" stroke={stroke} strokeWidth={width} />;
    case "liquid":
      return <circle r="7" fill="#ffffff" stroke={stroke} strokeWidth={width} />;
    case "gas":
      return <rect x="-10" y="-4" width="20" height="18" rx="9" fill="#ffffff" stroke={stroke} strokeWidth={width} />;
    default:
      return <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#ffffff" stroke={stroke} strokeWidth={width} strokeDasharray="3 2" />;
  }
}
