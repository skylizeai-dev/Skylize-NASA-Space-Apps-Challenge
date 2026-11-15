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
import { OutcomeSummary, StatusPill, coverageHeadline } from "./AnswerStrip";
import { runs } from "./ConditionsChart";
import { validImplications, type Implication } from "./Implications";
import { OutcomeChip } from "./Outcome";

// One atmosphere's evidence in brief: used to compare atmospheres.
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

// Read top to bottom: the answer for this atmosphere, then the same answer for
// the other atmosphere, then the two ways to go deeper. Only the answer carries
// weight; everything else stays quiet until the reader asks for it.
export default function Overview({
  atmosphere,
  readouts,
  activeId,
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
  const current = coverageFor(readouts, activeId, atmosphere);
  const others = readouts.filter((r) => r.id !== activeId);

  return (
    <div className="flex flex-col gap-3">
      {/* 1. The answer. The one loud thing on the screen. */}
      <section
        aria-label="Answer"
        className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-5 py-3"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusPill status={current.status} />
            <h2 className="max-w-[60ch] text-xl leading-snug font-semibold">
              {coverageHeadline(current)}
            </h2>
          </div>
        </div>

        <OutcomeSummary top={top} />

        {lead && (
          <div className="flex flex-col gap-0.5 border-t border-line pt-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-ink-2">Highest-ranked</span>
              <a
                href={
                  investigations.get(lead.investigation_id)?.psi_url ??
                  lead.source_url
                }
                target="_blank"
                rel="noopener noreferrer"
                title={investigations.get(lead.investigation_id)?.name}
                className="font-semibold text-accent hover:underline"
              >
                {investigationLabel(lead.investigation_id)}
              </a>
              <OutcomeChip outcome={lead.outcome} />
              <button
                type="button"
                onClick={() => onReveal(lead.id)}
                className="num rounded border border-line bg-bg px-1.5 text-accent hover:bg-surface-2"
              >
                {lead.id}
              </button>
              <span className="num text-ink-2">
                score {lead.score.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => onVerify(lead.id)}
                className="rounded border border-line bg-bg px-2 py-0.5 font-semibold text-ink hover:bg-surface-2"
              >
                Verify
              </button>
            </div>
            <p className="line-clamp-2 max-w-[95ch] text-sm">{lead.finding}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onOpen("evidence")}
            className="rounded-md bg-action px-4 py-2 text-sm font-semibold text-white"
          >
            Open all {ranked.length} ranked findings
          </button>
        </div>
      </section>

      {/* 2. The same question, answered for the other atmosphere. */}
      {others.length > 0 && (
        <section
          aria-label="Other atmospheres"
          className="flex flex-wrap items-center gap-x-3 gap-y-2"
        >
          <h2 className="text-xs text-ink-2">Compare with</h2>
          {others.map((other) => (
            <button
              key={other.id}
              type="button"
              onClick={() => onAtmosphere(other.atmosphere)}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-line bg-surface px-3 py-1 text-left text-sm hover:border-accent"
            >
              <span className="font-semibold">{other.label}</span>
              <span className="tnum text-xs text-ink-2">
                {fmtNum(other.atmosphere.oxygen_pct)} % O₂,{" "}
                {fmtNum(other.atmosphere.pressure_kpa)} kPa
              </span>
              <StatusPill status={other.coverage.status} small />
              <span className="text-xs text-ink-2">
                {other.coverage.findings.length}{" "}
                {other.coverage.findings.length === 1 ? "finding" : "findings"}
              </span>
            </button>
          ))}
          <p className="ml-auto text-xs text-muted">
            {ranked.length} source-checked findings from {investigations.size}{" "}
            NASA investigations. No AI in the ranking or the map.{" "}
            <Link href="/method" className="text-accent hover:underline">
              Method and sources
            </Link>
          </p>
        </section>
      )}

      {/* 3. Two ways to go deeper. Quiet, equal, one line of substance each. */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <DeeperRow
          title="Coverage"
          action="Open the test map"
          onOpen={() => onOpen("coverage")}
          aside={
            <MiniMap atmosphere={atmosphere} cells={cells} findings={ranked} />
          }
        >
          <p className="tnum text-sm text-ink-2">
            <span className="text-ink">
              Tested {Math.round(share.tested * 100)} %
            </span>
            , thin {Math.round(share.thin * 100)} %, untested{" "}
            {Math.round(share.untested * 100)} % of the mapped plane.
          </p>
        </DeeperRow>

        <DeeperRow
          title="Safety implications"
          action={
            cited.size >= 3
              ? `Open ${valid.length} implications`
              : "Open implications"
          }
          onOpen={() => onOpen("implications")}
          ai
        >
          {!implications ? (
            <p className="text-sm text-ink-2">
              Written in advance for the two preset atmospheres. For a custom
              atmosphere, the ranked evidence is the answer.
            </p>
          ) : cited.size < 3 ? (
            <p className="text-sm text-ink-2">
              Insufficient evidence for implications.
            </p>
          ) : (
            <>
              <p className="line-clamp-2 text-sm">{valid[0]?.implication}</p>
              <p className="text-xs text-ai">
                AI-generated from {cited.size} source-checked NASA PSI findings.
              </p>
            </>
          )}
        </DeeperRow>
      </div>
    </div>
  );
}

// The coverage of whichever atmosphere is selected.
function coverageFor(
  readouts: Readout[],
  activeId: string,
  atmosphere: Atmosphere,
): Coverage {
  const match =
    readouts.find((r) => r.id === activeId) ??
    readouts.find(
      (r) =>
        r.atmosphere.oxygen_pct === atmosphere.oxygen_pct &&
        r.atmosphere.pressure_kpa === atmosphere.pressure_kpa,
    );
  return (match ?? readouts[readouts.length - 1]).coverage;
}

function DeeperRow({
  title,
  action,
  onOpen,
  ai = false,
  aside,
  children,
}: {
  title: string;
  action: string;
  onOpen: () => void;
  ai?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={`flex gap-3 rounded-lg border border-line bg-surface px-4 py-2 ${
        ai ? "border-l-2 border-l-ai" : ""
      }`}
    >
      {aside}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onOpen}
            className="text-sm font-semibold text-accent hover:underline"
          >
            {action}
          </button>
        </div>
        {children}
      </div>
    </section>
  );
}

const SIZE = 60;
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
  const fill: Record<CoverageStatus, string> = {
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
      className="shrink-0 self-start rounded border border-line"
      role="img"
      aria-label="Thumbnail of tested oxygen and pressure conditions with your atmosphere marked"
    >
      <defs>
        <pattern
          id={`${uid}-hatch`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="var(--chart-hatch-bg)" />
          <rect width="1.5" height="6" fill="var(--chart-hatch-line)" />
        </pattern>
        <pattern
          id={`${uid}-hatch-light`}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
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
          fill={fill[r.status]}
        />
      ))}
      {findings
        .filter((f) => f.oxygen_pct !== null && f.pressure_kpa !== null)
        .map((f) => (
          <circle
            key={f.id}
            cx={mx(f.oxygen_pct as number)}
            cy={my(f.pressure_kpa as number)}
            r="2.2"
            fill={OUTCOME_META[f.outcome].color}
            stroke="var(--chart-mark-halo)"
            strokeWidth="0.75"
          />
        ))}
      <line
        x1={cx}
        x2={cx}
        y1="0"
        y2={SIZE}
        stroke="var(--color-accent)"
        strokeWidth="1"
      />
      <line
        x1="0"
        x2={SIZE}
        y1={cy}
        y2={cy}
        stroke="var(--color-accent)"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy={cy}
        r="3.5"
        fill="var(--chart-mark-halo)"
        stroke="var(--color-accent)"
        strokeWidth="2"
      />
    </svg>
  );
}
