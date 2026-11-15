import { CONDITION_RANGES } from "@/lib/rank";
import { FLOW_LABEL, fmtNum, investigationLabel } from "@/lib/format";
import type { Atmosphere, Investigation, ScoredFinding } from "@/lib/schema";
import { OutcomeChip } from "./Outcome";
import Term from "./Term";

interface Props {
  rank: number;
  finding: ScoredFinding;
  investigation?: Investigation;
  atmosphere: Atmosphere;
  highlighted: boolean;
  onVerify: (id: string) => void;
}

type Axis = "oxygen_pct" | "pressure_kpa" | "flow_cm_s";

// The reported condition that sits furthest from the selected atmosphere, if any
// differs by more than 5 % of its axis range.
function widestGap(finding: ScoredFinding, atmosphere: Atmosphere): Axis | null {
  let widest: Axis | null = null;
  let widestShare = 0.05;
  for (const axis of ["oxygen_pct", "pressure_kpa", "flow_cm_s"] as Axis[]) {
    const value = finding[axis];
    if (value === null) continue;
    const share = Math.abs(value - atmosphere[axis]) / CONDITION_RANGES[axis];
    if (share > widestShare) {
      widest = axis;
      widestShare = share;
    }
  }
  return widest;
}

export default function EvidenceCard({
  rank,
  finding,
  investigation,
  atmosphere,
  highlighted,
  onVerify,
}: Props) {
  const gap = widestGap(finding, atmosphere);
  const relevance = finding.safety_relevance / 3;
  const fuelTerm = finding.fuel.includes("SIBAL")
    ? "SIBAL"
    : finding.fuel.includes("PMMA")
      ? "PMMA"
      : "";

  return (
    <article
      id={`finding-${finding.id}`}
      className={`flex scroll-mt-20 gap-3 rounded-lg border border-line bg-surface p-4 ${
        highlighted ? "card-flash" : ""
      }`}
    >
      <div className="num w-6 shrink-0 pt-0.5 text-right text-sm text-muted" aria-label={`Rank ${rank}`}>
        {rank}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-base leading-snug font-semibold">
            <a
              href={investigation?.psi_url ?? finding.source_url}
              target="_blank"
              rel="noopener noreferrer"
              title={investigation?.name}
              className="text-accent hover:underline"
            >
              {investigationLabel(finding.investigation_id)}
            </a>{" "}
            <Term id={fuelTerm}>{finding.fuel}</Term>
          </h3>
          <OutcomeChip outcome={finding.outcome} />
        </header>

        <ul className="flex flex-wrap gap-1.5">
          <Chip
            label="O₂"
            value={finding.oxygen_pct}
            unit="%"
            delta={gap === "oxygen_pct" ? (finding.oxygen_pct as number) - atmosphere.oxygen_pct : null}
          />
          <Chip
            label="P"
            value={finding.pressure_kpa}
            unit="kPa"
            delta={
              gap === "pressure_kpa" ? (finding.pressure_kpa as number) - atmosphere.pressure_kpa : null
            }
          />
          <Chip
            label="Flow"
            value={finding.flow_cm_s}
            unit="cm/s"
            delta={gap === "flow_cm_s" ? (finding.flow_cm_s as number) - atmosphere.flow_cm_s : null}
          />
          <li className="rounded border border-line px-2 py-0.5 text-xs text-ink-2">
            {finding.flow_direction === "unknown" ? (
              <span className="text-muted">{FLOW_LABEL.unknown}</span>
            ) : (
              <Term id={finding.flow_direction}>{FLOW_LABEL[finding.flow_direction]}</Term>
            )}
          </li>
        </ul>

        <p className="max-w-[70ch] text-sm text-ink">{finding.finding}</p>

        <footer className="flex flex-col gap-2 border-t border-line pt-3">
          <div
            className="h-1 w-full rounded-full bg-ramp-1"
            role="img"
            aria-label={`Score ${finding.score.toFixed(2)} out of 1`}
          >
            <div
              className="h-1 rounded-full"
              style={{
                width: `${Math.max(finding.score, 0.01) * 100}%`,
                background:
                  finding.score > 0.66 ? "#4CC9F0" : finding.score > 0.33 ? "#2A6F8F" : "#3B7F9E",
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="num text-xs text-ink-2">
              <span className="font-semibold text-ink">Score {finding.score.toFixed(2)}</span> ={" "}
              <Term id="closeness">closeness</Term> {finding.closeness.toFixed(2)} ×{" "}
              <Term id="relevance">relevance</Term> {relevance.toFixed(2)} ×{" "}
              <Term id="completeness">completeness</Term> {finding.completeness.toFixed(2)}
            </p>
            <div className="flex items-center gap-3 text-xs">
              <a
                href={finding.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Open source
              </a>
              <button
                type="button"
                onClick={() => onVerify(finding.id)}
                className="rounded border border-line bg-bg px-2.5 py-1 font-semibold text-ink hover:bg-surface-2"
              >
                Verify
              </button>
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}

function Chip({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
}) {
  if (value === null) {
    return (
      <li className="rounded border border-dashed border-line px-2 py-0.5 text-xs text-muted">
        {label} not reported
      </li>
    );
  }
  return (
    <li className="num rounded border border-line bg-bg px-2 py-0.5 text-xs text-ink">
      <span className="font-sans text-ink-2">{label}</span> {fmtNum(value)} {unit}
      {delta !== null && (
        <span className="ml-1.5 text-ink-2" title="Difference from your atmosphere">
          Δ {delta > 0 ? "+" : "−"}
          {fmtNum(Math.abs(delta))}
        </span>
      )}
    </li>
  );
}
