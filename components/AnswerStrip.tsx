import { NEAR, type Coverage, type CoverageStatus } from "@/lib/coverage";
import { OUTCOMES, OUTCOME_META, fmtNum, investigationLabel } from "@/lib/format";
import type { Atmosphere, ScoredFinding } from "@/lib/schema";
import { OutcomeIcon } from "./Outcome";

interface Props {
  atmosphere: Atmosphere;
  coverage: Coverage;
  top: ScoredFinding[];
  nearest: { oxygen_pct: number; pressure_kpa: number } | null;
  onJump: (oxygen_pct: number, pressure_kpa: number) => void;
}

export const STATUS_COPY: Record<CoverageStatus, { label: string; className: string }> = {
  tested: { label: "Tested", className: "border-accent bg-accent/10 text-accent" },
  thin: { label: "Thin", className: "hatch-light border-ink-2 text-ink" },
  untested: { label: "Untested", className: "hatch border-ink-2 text-ink" },
};

export default function AnswerStrip({ atmosphere, coverage, top, nearest, onJump }: Props) {
  const status = STATUS_COPY[coverage.status];
  const counts = OUTCOMES.map((outcome) => ({
    outcome,
    count: top.filter((f) => f.outcome === outcome).length,
    weight: top.filter((f) => f.outcome === outcome).reduce((sum, f) => sum + f.score, 0),
  })).filter((c) => c.count > 0);
  const totalWeight = counts.reduce((sum, c) => sum + c.weight, 0);
  const lead = [...counts].sort((a, b) => b.count - a.count)[0];

  return (
    <section
      aria-label="Answer"
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.className}`}
        >
          {status.label}
        </span>
        <p className="tnum text-sm text-ink-2">
          {fmtNum(atmosphere.oxygen_pct)} % O₂, {fmtNum(atmosphere.pressure_kpa)} kPa,{" "}
          {fmtNum(atmosphere.flow_cm_s)} cm/s
        </p>
      </div>

      {coverage.conditions === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xl leading-snug font-semibold">
            No source-checked findings near this atmosphere. That is the finding: it is
            untested.
          </p>
          {nearest && (
            <p className="text-sm text-ink-2">
              Nearest tested region:{" "}
              <button
                type="button"
                onClick={() => onJump(nearest.oxygen_pct, nearest.pressure_kpa)}
                className="tnum text-accent underline underline-offset-2"
              >
                {fmtNum(nearest.oxygen_pct)} % O₂, {fmtNum(nearest.pressure_kpa)} kPa
              </button>
              . The ranked list below shows the closest evidence that does exist.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-xl leading-snug font-semibold">
            {coverage.findings.length} source-checked{" "}
            {coverage.findings.length === 1 ? "finding" : "findings"} from{" "}
            {coverage.conditions} test {coverage.conditions === 1 ? "condition" : "conditions"}{" "}
            within close range.
          </p>
          <p className="text-sm text-ink-2">
            Close range is ±{NEAR.oxygen_pct} % O₂ and ±{NEAR.pressure_kpa} kPa. From{" "}
            {coverage.investigations.map(investigationLabel).join(", ")}.{" "}
            {coverage.status === "thin" &&
              "Fewer than 3 distinct test conditions, so treat this as thin evidence."}
          </p>
        </div>
      )}

      {top.length > 0 && lead && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm">
            In {lead.count} of the {top.length} top-ranked findings,{" "}
            {OUTCOME_META[lead.outcome].sentence}.
          </p>
          <div
            className="flex h-3 w-full gap-px overflow-hidden rounded-sm"
            role="img"
            aria-label={`Outcomes of the ${top.length} top-ranked findings, weighted by score: ${counts
              .map((c) => `${OUTCOME_META[c.outcome].label} ${c.count}`)
              .join(", ")}`}
          >
            {counts.map((c) => (
              <div
                key={c.outcome}
                style={{
                  width: `${(c.weight / totalWeight) * 100}%`,
                  background: OUTCOME_META[c.outcome].color,
                }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
            {counts.map((c) => (
              <li key={c.outcome} className="flex items-center gap-1.5">
                <OutcomeIcon outcome={c.outcome} size={10} />
                {OUTCOME_META[c.outcome].label}
                <span className="num text-ink">{c.count}</span>
              </li>
            ))}
            <li className="text-muted">Bar widths are weighted by score. Counts are raw.</li>
          </ul>
        </div>
      )}
    </section>
  );
}
