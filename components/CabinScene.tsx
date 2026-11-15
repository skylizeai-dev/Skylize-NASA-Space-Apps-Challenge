"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fmtNum, type FuelGroup } from "@/lib/format";
import type { Atmosphere } from "@/lib/schema";

// The setup's picture of the environment being built.
//
// A 3D cabin module (CabinScene3D, three.js) replaces the 2D drawing once it
// has loaded. The 2D drawing stays as the placeholder while the 3D chunk loads
// and as the fallback when WebGL is unavailable (see docs/CABIN_3D_CONTRACT.md).
// Both fill the parent box; the setup sets that box's size.
export type SetupStep = "habitat" | "oxygen" | "pressure" | "airflow" | "material" | "review";

export interface CabinSceneProps {
  atmosphere: Atmosphere;
  material: FuelGroup | "any";
  // The question the user is answering, so the scene can highlight it.
  step: SetupStep;
  // Optional: selecting a part of the scene asks the setup to open the step that edits it.
  onPick?: (step: SetupStep) => void;
}

// Client only, in its own chunk: three.js never reaches the server or the first paint.
const CabinScene3D = dynamic(() => import("./CabinScene3D"), { ssr: false });

let webglSupport: boolean | undefined;
function hasWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noSubscription = () => () => {};

const SAMPLE_WORDS: Record<FuelGroup | "any", string> = {
  plastic: "a plastic slab",
  fabric: "a fabric sheet",
  liquid: "a fuel droplet on a thin fibre",
  gas: "a gas burner",
  other: "a generic test sample",
  any: "a generic test sample",
};

export function describeScene(atmosphere: Atmosphere, material: FuelGroup | "any"): string {
  const air =
    atmosphere.flow_cm_s === 0
      ? "still air"
      : `air moving along the module, left to right, at ${fmtNum(atmosphere.flow_cm_s)} cm/s`;
  return (
    `Illustration of a pressurised cabin module, cut open to show the inside: ${air}, ` +
    `${fmtNum(atmosphere.oxygen_pct)} % oxygen at ${fmtNum(atmosphere.pressure_kpa)} kPa, ` +
    `with ${SAMPLE_WORDS[material]} burning at the centre.`
  );
}

export default function CabinScene(props: CabinSceneProps) {
  const [enlarged, setEnlarged] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (enlarged && !dialog.open) dialog.showModal();
    if (!enlarged && dialog.open) dialog.close();
  }, [enlarged]);

  return (
    <>
      <SceneFigure
        {...props}
        action={
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="rounded border border-line bg-bg px-1.5 py-0.5 text-xs text-ink-2 hover:text-ink"
          >
            Enlarge
          </button>
        }
      />
      <dialog
        ref={dialogRef}
        className="scene-dialog"
        aria-label="Cabin view, enlarged"
        onClose={() => setEnlarged(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setEnlarged(false);
        }}
      >
        {enlarged && (
          <div className="flex h-full flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Your environment</h2>
              <button
                type="button"
                onClick={() => setEnlarged(false)}
                className="rounded border border-line px-2.5 py-1 text-sm text-ink-2 hover:text-ink"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SceneFigure
                {...props}
                onPick={
                  props.onPick &&
                  ((step) => {
                    setEnlarged(false);
                    props.onPick?.(step);
                  })
                }
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function SceneFigure({ action, ...props }: CabinSceneProps & { action?: React.ReactNode }) {
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const show3D = webgl && status !== "failed";
  const live = show3D && status === "ready";

  return (
    <figure className="flex h-full flex-col gap-1">
      <div role="img" aria-label={describeScene(props.atmosphere, props.material)} className="relative min-h-0 flex-1">
        {!live && <CabinScene2D {...props} />}
        {show3D && (
          <CabinScene3D {...props} onReady={() => setStatus("ready")} onFail={() => setStatus("failed")} />
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted">
        <span>
          Illustration, not a simulation.
          {live && props.onPick && " Drag to turn. Select a part to change it."}
        </span>
        {action}
      </figcaption>
    </figure>
  );
}

// ---------- 2D placeholder and fallback ----------

const W = 320;
const H = 190;

function CabinScene2D({ atmosphere, material, step }: CabinSceneProps) {
  // Airflow is drawn as streak lines: none for still air, more as flow rises.
  const streaks = atmosphere.flow_cm_s === 0 ? 0 : Math.min(5, 1 + Math.round(atmosphere.flow_cm_s / 10));
  const highlightFlow = step === "airflow";
  const highlightSample = step === "material";
  const highlightAir = step === "oxygen" || step === "pressure";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
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
