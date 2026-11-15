import Link from "next/link";
import { useId, useMemo } from "react";
import {
  CELL,
  DOMAIN,
  coverageShare,
  type Coverage,
  type CoverageCell,
  type CoverageStatus,
} from "@/lib/coverage";
import { OUTCOME_META, fmtNum, investigationLabel } from "@/lib/format";
import type { Panel } from "@/lib/url";
import type { Atmosphere, Investigation, ScoredFinding } from "@/lib/schema";
import { OutcomeSummary, StatusPill, outcomeCounts } from "./AnswerStrip";
import { runs } from "./ConditionsChart";
import { validImplications, type Implication } from "./Implications";
import { OutcomeChip, OutcomeIcon } from "./Outcome";

// One atmosphere's evidence in brief: used side by side to compare atmospheres.
export interface Readout {
  id: string;
  label: string;
  atmosphere: Atmosphere;
  coverage: Coverage;
  top: ScoredFinding[];
}

interface Props {
  atmosphere: Atmosphere;
  readouts: Readout[];
  activeId: string;
  base: string;
  cells: CoverageCell[];
  ranked: ScoredFinding[];
  top: ScoredFinding[];
  implications: Implication[] | undefined;
  investigations: Map<string, Investigation>;
  onAtmosphere: (atmosphere: Atmosphere) => void;
  onOpen: (panel: Panel) => void;
  onReveal: (id: string) => void;
  onVerify: (id: string) => void;
}

// Every output category on one screen. The readout answers the question; each
// tile below states its part of the answer and opens its detail view.
export default function Overview({
  atmosphere,
  readouts,
  activeId,
  base,
  cells,
  ranked,
  top,
  implications,
  investigations,
  onAtmosphere,
  onOpen,
  onReveal,
  onVerify,
}: Props) {
  const share = coverageShare(cells);
  const { valid, cited } = validImplications(implications, top);
  const lead = ranked[0];

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label="Evidence readout"
        className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-surface p-4 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">How much evidence, side by side</h2>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            {readouts.map((readout) => (
              <ReadoutColumn
                key={readout.id}
                readout={readout}
                active={readout.id === activeId}
                onSelect={() => onAtmosphere(readout.atmosphere)}
              />
            ))}
          </div>
        </div>

        {lead && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">Highest-ranked finding</h2>
              <OutcomeChip outcome={lead.outcome} />
            </div>
            <p className="line-clamp-4 text-sm">{lead.finding}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <a
                href={investigations.get(lead.investigation_id)?.psi_url ?? lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                title={investigations.get(lead.investigation_id)?.name}
                className="font-semibold text-accent hover:underline"
              >
                {investigationLabel(lead.investigation_id)}
              </a>
              <button
                type="button"
                onClick={() => onReveal(lead.id)}
                className="num rounded border border-line bg-bg px-1.5 text-accent hover:bg-surface-2"
              >
                {lead.id}
              </button>
              <span className="num text-ink-2">score {lead.score.toFixed(2)}</span>
              <a
                href={lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Open source
              </a>
              <button
                type="button"
                onClick={() => onVerify(lead.id)}
                className="rounded border border-line bg-bg px-2.5 py-1 font-semibold text-ink hover:bg-surface-2"
              >
                Verify
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Tile
          title="Coverage"
          question="Where are the tests, and where are the gaps?"
          action="Open the test map"
          onOpen={() => onOpen("coverage")}
        >
          <div className="flex items-start gap-3">
            <MiniMap atmosphere={atmosphere} cells={cells} findings={ranked} />
            <ul className="tnum flex min-w-0 flex-col gap-1.5 text-xs text-ink-2">
              <ShareRow swatch="bg-ramp-1" label="Tested" value={share.tested} />
              <ShareRow swatch="hatch-light" label="Thin" value={share.thin} />
              <ShareRow swatch="hatch" label="Untested" value={share.untested} />
              <li className="text-muted">of the mapped oxygen and pressure plane</li>
            </ul>
          </div>
        </Tile>

        <Tile
          title="Evidence"
          question="What happened in the closest tests?"
          action={`Open all ${ranked.length} ranked findings`}
          onOpen={() => onOpen("evidence")}
        >
          <OutcomeSummary top={top} compact />
          <ol className="flex flex-col border-t border-line">
            {ranked.slice(0, 3).map((f, index) => (
              <li
                key={f.id}
                className="flex items-center gap-2 border-b border-line py-0.5 text-sm last:border-0"
              >
                <span className="num w-3 text-right text-xs text-muted">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{investigationLabel(f.investigation_id)}</span>{" "}
                  <span className="text-ink-2">{f.fuel}</span>
                </span>
                <span title={OUTCOME_META[f.outcome].label}>
                  <OutcomeIcon outcome={f.outcome} size={10} />
                </span>
                <span className="num text-xs text-ink-2">{f.score.toFixed(2)}</span>
              </li>
            ))}
          </ol>
        </Tile>

        <Tile
          title="Safety implications"
          question="What does that evidence imply?"
          action={cited.size >= 3 ? `Open ${valid.length} implications` : "Open implications"}
          onOpen={() => onOpen("implications")}
          ai
        >
          {!implications ? (
            <p className="text-sm text-ink-2">
              Written in advance for the two preset atmospheres. For a custom atmosphere, the
              ranked evidence is the answer.
            </p>
          ) : cited.size < 3 ? (
            <p className="text-sm text-ink-2">Insufficient evidence for implications.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {valid.slice(0, 2).map((item) => (
                  <li key={item.implication} className="line-clamp-2 text-sm font-semibold">
                    {item.implication}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ai">
                AI-generated from NASA PSI records. Based on {cited.size} source-checked findings.
              </p>
            </>
          )}
        </Tile>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs text-ink-2">
        <span>
          {ranked.length} source-checked findings from {investigations.size} NASA investigations,
          ranked by
        </span>
        <span className="num rounded border border-line bg-bg px-2 py-0.5 text-ink">
          score = closeness × relevance × completeness
        </span>
        <span>No AI takes part in the ranking, the coverage verdict or the map.</span>
        <Link href={`${base}/method`} className="font-semibold text-accent hover:underline">
          Open the method and sources
        </Link>
      </p>
    </div>
  );
}

function ReadoutColumn({
  readout,
  active,
  onSelect,
}: {
  readout: Readout;
  active: boolean;
  onSelect: () => void;
}) {
  const { coverage, top, atmosphere } = readout;
  const { lead } = outcomeCounts(top);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`flex flex-1 flex-col items-start gap-1.5 rounded-md border p-3 text-left ${
        active ? "border-accent bg-accent/5" : "border-line bg-bg hover:bg-surface-2"
      }`}
    >
      <span className={`text-sm font-semibold ${active ? "text-accent" : "text-ink"}`}>
        {readout.label}
      </span>
      <span className="tnum text-xs text-ink-2">
        {fmtNum(atmosphere.oxygen_pct)} % O₂, {fmtNum(atmosphere.pressure_kpa)} kPa
      </span>
      <StatusPill status={coverage.status} />
      <span className="text-xs text-ink">
        {coverage.conditions === 0
          ? "No findings within close range"
          : `${coverage.findings.length} ${
              coverage.findings.length === 1 ? "finding" : "findings"
            } from ${coverage.conditions} test ${
              coverage.conditions === 1 ? "condition" : "conditions"
            } within close range`}
      </span>
      {lead && (
        <span className="flex items-center gap-1.5 text-xs text-ink-2">
          <OutcomeIcon outcome={lead.outcome} size={10} />
          {OUTCOME_META[lead.outcome].label} in {lead.count} of {top.length} top-ranked
        </span>
      )}
    </button>
  );
}

function ShareRow({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`${swatch} h-3 w-4 shrink-0 rounded-sm border border-line`} />
      <span className="text-ink">{label}</span> {Math.round(value * 100)} %
    </li>
  );
}

function Tile({
  title,
  question,
  action,
  onOpen,
  ai = false,
  children,
}: {
  title: string;
  question: string;
  action: string;
  onOpen: () => void;
  ai?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className={`flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 ${
        ai ? "border-l-2 border-l-ai" : ""
      }`}
    >
      <header className="-mb-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-ink-2">{question}</p>
      </header>
      {children}
      <button
        type="button"
        onClick={onOpen}
        className="mt-auto w-fit rounded-md border border-line bg-bg px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
      >
        {action}
      </button>
    </article>
  );
}

const SIZE = 112;
const O = DOMAIN.oxygen_pct;
const P = DOMAIN.pressure_kpa;
const mx = (o: number) => ((o - O.min) / (O.max - O.min)) * SIZE;
const my = (p: number) => SIZE - ((p - P.min) / (P.max - P.min)) * SIZE;

// A thumbnail of the oxygen x pressure map: same shading and marks, no axes.
function MiniMap({
  atmosphere,
  cells,
  findings,
}: {
  atmosphere: Atmosphere;
  cells: CoverageCell[];
  findings: ScoredFinding[];
}) {
  const background = useMemo(() => runs(cells), [cells]);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const MINI_FILL: Record<CoverageStatus, string> = {
    tested: "var(--color-ramp-1)",
    thin: `url(#${uid}-hatch-light)`,
    untested: `url(#${uid}-hatch)`,
  };
  const cx = mx(atmosphere.oxygen_pct);
  const cy = my(atmosphere.pressure_kpa);
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      className="shrink-0 rounded border border-line"
      role="img"
      aria-label="Thumbnail of tested oxygen and pressure conditions with your atmosphere marked"
    >
      <defs>
        <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--chart-hatch-bg)" />
          <rect width="1.5" height="6" fill="var(--chart-hatch-line)" />
        </pattern>
        <pattern id={`${uid}-hatch-light`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="9" fill="var(--chart-hatch-bg)" />
          <rect width="1" height="9" fill="var(--chart-hatch-line)" />
        </pattern>
      </defs>
      {background.map((r) => (
        <rect
          key={`${r.o}:${r.p}`}
          x={mx(r.o)}
          y={my(r.p + CELL.pressure_kpa)}
          width={mx(r.o + r.width) - mx(r.o) + 0.5}
          height={my(r.p) - my(r.p + CELL.pressure_kpa) + 0.5}
          fill={MINI_FILL[r.status]}
        />
      ))}
      {findings
        .filter((f) => f.oxygen_pct !== null && f.pressure_kpa !== null)
        .map((f) => (
          <circle
            key={f.id}
            cx={mx(f.oxygen_pct as number)}
            cy={my(f.pressure_kpa as number)}
            r="2.5"
            fill={OUTCOME_META[f.outcome].color}
            stroke="var(--chart-mark-halo)"
            strokeWidth="0.75"
          />
        ))}
      <line x1={cx} x2={cx} y1="0" y2={SIZE} stroke="var(--color-accent)" strokeWidth="1" />
      <line x1="0" x2={SIZE} y1={cy} y2={cy} stroke="var(--color-accent)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="4" fill="var(--chart-mark-halo)" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  );
}
