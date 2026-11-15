import Link from "next/link";
import { useMemo } from "react";
import {
  CELL,
  DOMAIN,
  coverageShare,
  type Coverage,
  type CoverageCell,
  type CoverageStatus,
} from "@/lib/coverage";
import { OUTCOME_META, investigationLabel } from "@/lib/format";
import type { Panel } from "@/lib/url";
import type { Atmosphere, ScoredFinding } from "@/lib/schema";
import { OutcomeSummary, StatusPill, coverageHeadline } from "./AnswerStrip";
import { runs } from "./ConditionsChart";
import { validImplications, type Implication } from "./Implications";
import { OutcomeIcon } from "./Outcome";

interface Props {
  atmosphere: Atmosphere;
  coverage: Coverage;
  cells: CoverageCell[];
  ranked: ScoredFinding[];
  top: ScoredFinding[];
  implications: Implication[] | undefined;
  investigationCount: number;
  onOpen: (panel: Panel) => void;
}

// Every output category on one screen. Each tile states its answer and opens its detail view.
export default function Overview({
  atmosphere,
  coverage,
  cells,
  ranked,
  top,
  implications,
  investigationCount,
  onOpen,
}: Props) {
  const share = coverageShare(cells);
  const { valid, cited } = validImplications(implications, top);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Tile title="Coverage" question="Has this atmosphere been tested?" action="Open the test map" onOpen={() => onOpen("coverage")}>
        <div className="flex items-start gap-4">
          <MiniMap atmosphere={atmosphere} cells={cells} findings={ranked} />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <StatusPill status={coverage.status} />
            <p className="text-base leading-snug font-semibold">{coverageHeadline(coverage)}</p>
            <p className="tnum text-xs text-ink-2">
              Across the mapped plane: tested {Math.round(share.tested * 100)} %, thin{" "}
              {Math.round(share.thin * 100)} %, untested {Math.round(share.untested * 100)} %.
            </p>
          </div>
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
              className="flex items-center gap-2 border-b border-line py-1.5 text-sm last:border-0"
            >
              <span className="num w-4 text-right text-xs text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{investigationLabel(f.investigation_id)}</span>{" "}
                <span className="text-ink-2">{f.fuel}</span>
              </span>
              <span className="flex items-center gap-1 text-xs" style={{ color: OUTCOME_META[f.outcome].color }}>
                <OutcomeIcon outcome={f.outcome} size={10} />
                {OUTCOME_META[f.outcome].label}
              </span>
              <span className="num text-xs text-ink-2">{f.score.toFixed(2)}</span>
            </li>
          ))}
        </ol>
      </Tile>

      <Tile
        title="Safety implications"
        question="What does that evidence imply?"
        action={cited.size >= 3 ? `Open ${valid.length} implications with their evidence` : "Open implications"}
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
              {valid.slice(0, 3).map((item) => (
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

      <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <TileHeader title="Method and data" question="Can I check all of this?" />
        <p className="text-base leading-snug font-semibold">
          {ranked.length} source-checked findings from {investigationCount} NASA investigations,
          ranked by a fixed formula.
        </p>
        <p className="num rounded border border-line bg-bg px-2 py-1.5 text-xs text-ink-2">
          score = closeness × relevance × completeness
        </p>
        <p className="text-xs text-ink-2">
          No AI takes part in the ranking, the coverage verdict or the map. Every finding links to
          its source document.
        </p>
        <Link
          href="/method"
          className="mt-auto w-fit rounded-md border border-line bg-bg px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
        >
          Open the method and sources
        </Link>
      </article>
    </div>
  );
}

function TileHeader({ title, question }: { title: string; question: string }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-xs text-ink-2">{question}</p>
    </header>
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
      <TileHeader title={title} question={question} />
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

const SIZE = 132;
const O = DOMAIN.oxygen_pct;
const P = DOMAIN.pressure_kpa;
const mx = (o: number) => ((o - O.min) / (O.max - O.min)) * SIZE;
const my = (p: number) => SIZE - ((p - P.min) / (P.max - P.min)) * SIZE;
const MINI_FILL: Record<CoverageStatus, string> = {
  tested: "#1B3A4B",
  thin: "url(#mini-hatch-light)",
  untested: "url(#mini-hatch)",
};

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
        <pattern id="mini-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#1A2233" />
          <rect width="1.5" height="6" fill="#3A4763" />
        </pattern>
        <pattern id="mini-hatch-light" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="9" fill="#1A2233" />
          <rect width="1" height="9" fill="#3A4763" />
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
            stroke="#0B0F17"
            strokeWidth="0.75"
          />
        ))}
      <line x1={cx} x2={cx} y1="0" y2={SIZE} stroke="#4CC9F0" strokeWidth="1" />
      <line x1="0" x2={SIZE} y1={cy} y2={cy} stroke="#4CC9F0" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="4" fill="#0B0F17" stroke="#4CC9F0" strokeWidth="2" />
    </svg>
  );
}
