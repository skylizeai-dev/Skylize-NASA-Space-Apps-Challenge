import { NEAR, type Coverage, type CoverageStatus } from "@/lib/coverage";
import { OUTCOMES, OUTCOME_META, fmtNum, investigationLabel } from "@/lib/format";
import type { Atmosphere, ScoredFinding } from "@/lib/schema";
import { OutcomeIcon } from "./Outcome";

export const STATUS_COPY: Record<CoverageStatus, { label: string; className: string }> = {
  tested: { label: "Tested", className: "border-accent bg-accent/10 text-accent" },
  thin: { label: "Thin", className: "hatch-light border-ink-2 text-ink" },
  untested: { label: "Untested", className: "hatch border-ink-2 text-ink" },
};

export function StatusPill({ status }: { status: CoverageStatus }) {
  const copy = STATUS_COPY[status];
  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${copy.className}`}>
      {copy.label}
    </span>
  );
}

export function coverageHeadline(coverage: Coverage): string {
  if (coverage.conditions === 0) {
    return "No source-checked findings near this atmosphere. That is the finding: it is untested.";
  }
  const findings = coverage.findings.length === 1 ? "finding" : "findings";
  const conditions = coverage.conditions === 1 ? "condition" : "conditions";
  return `${coverage.findings.length} source-checked ${findings} from ${coverage.conditions} test ${conditions} within close range.`;
}

interface VerdictProps {
  atmosphere: Atmosphere;
  coverage: Coverage;
  nearest: { oxygen_pct: number; pressure_kpa: number } | null;
  onJump: (oxygen_pct: number, pressure_kpa: number) => void;
}

// How much evidence sits near the selected atmosphere.
export function CoverageVerdict({ atmosphere, coverage, nearest, onJump }: VerdictProps) {
  return (
    <section
      aria-label="Coverage verdict"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={coverage.status} />
        <p className="tnum text-sm text-ink-2">
          {fmtNum(atmosphere.oxygen_pct)} % O₂, {fmtNum(atmosphere.pressure_kpa)} kPa,{" "}
          {fmtNum(atmosphere.flow_cm_s)} cm/s
        </p>
      </div>
      <p className="text-xl leading-snug font-semibold">{coverageHeadline(coverage)}</p>
      {coverage.conditions === 0 ? (
        nearest && (
          <p className="text-sm text-ink-2">
            Nearest tested region:{" "}
            <button
              type="button"
              onClick={() => onJump(nearest.oxygen_pct, nearest.pressure_kpa)}
              className="tnum text-accent underline underline-offset-2"
            >
              {fmtNum(nearest.oxygen_pct)} % O₂, {fmtNum(nearest.pressure_kpa)} kPa
            </button>
            . The evidence view still ranks the closest findings that do exist.
          </p>
        )
      ) : (
        <p className="text-sm text-ink-2">
          Close range is ±{NEAR.oxygen_pct} % O₂ and ±{NEAR.pressure_kpa} kPa. From{" "}
          {coverage.investigations.map(investigationLabel).join(", ")}.{" "}
          {coverage.status === "thin" &&
            "Fewer than 3 distinct test conditions, so treat this as thin evidence."}
        </p>
      )}
    </section>
  );
}

export function outcomeCounts(top: ScoredFinding[]) {
  const counts = OUTCOMES.map((outcome) => {
    const matching = top.filter((f) => f.outcome === outcome);
    return {
      outcome,
      count: matching.length,
      weight: matching.reduce((sum, f) => sum + f.score, 0),
    };
  }).filter((c) => c.count > 0);
  const lead = [...counts].sort((a, b) => b.count - a.count)[0];
  return { counts, lead, totalWeight: counts.reduce((sum, c) => sum + c.weight, 0) };
}

export function outcomeHeadline(top: ScoredFinding[]): string {
  const { lead } = outcomeCounts(top);
  if (!lead) return "No findings to summarise.";
  return `In ${lead.count} of the ${top.length} top-ranked findings, ${OUTCOME_META[lead.outcome].sentence}.`;
}

// What happened in the top-ranked tests. Disagreement stays visible: widths are
// weighted by score and the raw counts sit beside them.
export function OutcomeSummary({ top, compact = false }: { top: ScoredFinding[]; compact?: boolean }) {
  const { counts, totalWeight } = outcomeCounts(top);
  if (counts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className={compact ? "text-base leading-snug font-semibold" : "text-sm"}>
        {outcomeHeadline(top)}
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
        {!compact && (
          <li className="text-muted">Bar widths are weighted by score. Counts are raw.</li>
        )}
      </ul>
    </div>
  );
}
