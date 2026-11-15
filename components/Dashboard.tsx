"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import { CoverageVerdict, OutcomeSummary } from "./AnswerStrip";
import AskBox from "./AskBox";
import AtmosphereSelector from "./AtmosphereSelector";
import ConditionsChart from "./ConditionsChart";
import EvidenceCard from "./EvidenceCard";
import EvidenceTable, { downloadCsv } from "./EvidenceTable";
import FlameIllustration from "./FlameIllustration";
import GapsPanel from "./GapsPanel";
import Implications, { type Implication } from "./Implications";
import Overview, { type Readout } from "./Overview";
import SetupWizard from "./SetupWizard";
import TopBar from "./TopBar";
import VerifyDrawer from "./VerifyDrawer";
import { buildCoverageGrid, coverageAt, nearestTested } from "@/lib/coverage";
import {
  FUEL_GROUP_LABEL,
  fuelGroup,
  investigationLabel,
  type FuelGroup,
} from "@/lib/format";
import { rankFindings } from "@/lib/rank";
import {
  RESULT_TABS,
  parsePanel,
  parseView,
  serializeView,
  type Panel,
  type ViewState,
} from "@/lib/url";
import type { Atmosphere, Finding, Investigation, Preset } from "@/lib/schema";

import findingsData from "@/data/findings.json";
import implicationsData from "@/data/implications.json";
import investigationsData from "@/data/investigations.json";
import presetsData from "@/data/presets.json";

const findings = findingsData as Finding[];
const investigations = investigationsData as Investigation[];
const presets = (presetsData as Preset[]).filter((p) => p.id !== "custom");
const implications = implicationsData as Record<string, Implication[]>;
const investigationById = new Map(investigations.map((i) => [i.id, i]));
// Coverage depends only on the dataset, so the grid is built once.
const cells = buildCoverageGrid(findings);

const TOP_N = 8;
// The two reference atmospheres are always compared, whatever is selected.
const presetReadouts: Readout[] = presets.map((preset) => ({
  id: preset.id,
  label: preset.label,
  atmosphere: {
    oxygen_pct: preset.oxygen_pct,
    pressure_kpa: preset.pressure_kpa,
    flow_cm_s: preset.flow_cm_s,
  },
  coverage: coverageAt(preset.oxygen_pct, preset.pressure_kpa, findings),
  top: rankFindings(preset, findings).slice(0, TOP_N),
}));
const SOURCE_NAMES = investigations.map((i) => investigationLabel(i.id));
const ASK_ENABLED = process.env.NEXT_PUBLIC_ASK_ENABLED === "1";
const FUELS = Object.keys(FUEL_GROUP_LABEL) as FuelGroup[];

const PANEL_LABEL: Record<Panel, string> = {
  setup: "Set up",
  overview: "Overview",
  coverage: "Coverage",
  evidence: "Evidence",
  implications: "Safety implications",
};

export default function Dashboard() {
  const searchParams = useSearchParams();
  // The open panel is read straight from the URL, so the browser Back button
  // returns from a detail view to the overview. A first visit, with no
  // atmosphere in the URL, starts with the step-by-step setup. Shared links
  // that carry an atmosphere open straight on the results.
  const urlParams = new URLSearchParams(searchParams.toString());
  const firstVisit = !urlParams.has("o2") && !urlParams.has("view");
  const panel: Panel = firstVisit ? "setup" : parsePanel(urlParams);
  const [view, setView] = useState<ViewState>(() =>
    parseView(new URLSearchParams(searchParams.toString()), presets[0]),
  );
  const [showAll, setShowAll] = useState(false);
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  // Mirror state into the URL. Debounced, because browsers throttle history writes.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.history.replaceState(null, "", `?${serializeView(view, panel)}`);
      } catch {
        // The view still works; only the shareable link lags behind.
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [view, panel]);

  const open = useCallback(
    (next: Panel) => {
      window.history.pushState(null, "", `?${serializeView(view, next)}`);
      window.scrollTo({ top: 0 });
    },
    [view],
  );

  const { atmosphere } = view;
  const setAtmosphere = useCallback(
    (next: Atmosphere) => setView((v) => ({ ...v, atmosphere: next })),
    [],
  );
  const jump = useCallback(
    (oxygen_pct: number, pressure_kpa: number) =>
      setView((v) => ({
        ...v,
        atmosphere: { ...v.atmosphere, oxygen_pct, pressure_kpa },
      })),
    [],
  );

  const ranked = useMemo(
    () => rankFindings(atmosphere, findings),
    [atmosphere],
  );
  const coverage = useMemo(
    () => coverageAt(atmosphere.oxygen_pct, atmosphere.pressure_kpa, findings),
    [atmosphere.oxygen_pct, atmosphere.pressure_kpa],
  );
  const nearest = useMemo(
    () => nearestTested(atmosphere.oxygen_pct, atmosphere.pressure_kpa, cells),
    [atmosphere.oxygen_pct, atmosphere.pressure_kpa],
  );

  const fuelCounts = useMemo(() => {
    const counts = new Map<FuelGroup, number>();
    for (const f of ranked)
      counts.set(fuelGroup(f), (counts.get(fuelGroup(f)) ?? 0) + 1);
    return counts;
  }, [ranked]);
  const filtered = useMemo(
    () =>
      ranked.filter(
        (f) =>
          (view.fuel === "any" || fuelGroup(f) === view.fuel) &&
          (!view.burning || f.outcome === "spread" || f.outcome === "steady") &&
          (!view.expert ||
            view.direction === "any" ||
            f.flow_direction === view.direction),
      ),
    [ranked, view.expert, view.direction, view.fuel, view.burning],
  );
  const burningCount = ranked.filter(
    (f) => f.outcome === "spread" || f.outcome === "steady",
  ).length;
  const top = ranked.slice(0, TOP_N);
  const visible = showAll ? filtered : filtered.slice(0, TOP_N);
  const filtersOn =
    view.fuel !== "any" ||
    view.burning ||
    (view.expert && view.direction !== "any");

  const activePreset =
    presets.find(
      (p) =>
        p.oxygen_pct === atmosphere.oxygen_pct &&
        p.pressure_kpa === atmosphere.pressure_kpa &&
        p.flow_cm_s === atmosphere.flow_cm_s,
    )?.id ?? "custom";

  // From a chart mark or a citation chip: open the evidence view with that card
  // unfiltered, then scroll to it and flash it once it is on screen.
  const reveal = useCallback(
    (id: string) => {
      const next = {
        ...view,
        direction: "any" as const,
        fuel: "any" as const,
        burning: false,
      };
      setView(next);
      setLayout("cards");
      setShowAll(true);
      setRevealId(id);
      window.history.pushState(null, "", `?${serializeView(next, "evidence")}`);
    },
    [view],
  );
  useEffect(() => {
    if (!revealId || panel !== "evidence") return;
    const frame = requestAnimationFrame(() => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // A hidden copy of another route may hold the same id, so take the visible card.
      Array.from(
        document.querySelectorAll<HTMLElement>(`[id="finding-${revealId}"]`),
      )
        .find((el) => el.offsetParent !== null)
        ?.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "center",
        });
    });
    const timer = setTimeout(() => setRevealId(null), 2200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [revealId, panel]);

  const readouts: Readout[] =
    activePreset === "custom"
      ? [
          ...presetReadouts,
          { id: "custom", label: "Your atmosphere", atmosphere, coverage, top },
        ]
      : presetReadouts;

  const verifyFinding = ranked.find((f) => f.id === verifyId) ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <TopBar
        expert={view.expert}
        onExpert={(expert) => setView((v) => ({ ...v, expert }))}
      />

      {panel === "setup" ? (
        <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 pt-3 pb-4">
          <SetupWizard
            presets={presets}
            atmosphere={atmosphere}
            material={view.fuel}
            findings={findings}
            fuelCounts={fuelCounts}
            coverage={coverage}
            onAtmosphere={setAtmosphere}
            onMaterial={(fuel) => setView((v) => ({ ...v, fuel }))}
            onFinish={() => open("overview")}
          />
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-4 px-4 pt-3 pb-4 md:grid-cols-[288px_minmax(0,1fr)] xl:grid-cols-[304px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2 md:sticky md:top-[60px] md:self-start">
            <button
              type="button"
              onClick={() => open("setup")}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-left text-sm font-semibold text-accent hover:bg-surface-2"
            >
              Build a new environment step by step
            </button>
            <AtmosphereSelector
              presets={presets}
              view={view}
              activePresetId={activePreset}
              onAtmosphere={setAtmosphere}
              onFilters={(filters) => setView((v) => ({ ...v, ...filters }))}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col-reverse items-start justify-between gap-x-6 gap-y-2 sm:flex-row">
              <div className="flex max-w-[84ch] flex-col gap-1">
                <h1 className="text-lg leading-snug font-semibold">
                  Moon and Mars habitats are expected to run richer oxygen at
                  lower pressure. How much NASA fire evidence exists for that?
                </h1>
                {panel === "overview" && (
                  <p className="text-xs text-ink-2">
                    Pick an atmosphere. See NASA&apos;s microgravity combustion
                    findings ranked by how closely they were tested to it, each
                    linked to its source. Evidence from{" "}
                    {SOURCE_NAMES.slice(0, -1).join(", ")} and{" "}
                    {SOURCE_NAMES[SOURCE_NAMES.length - 1]}.
                  </p>
                )}
              </div>
              {panel === "overview" && <FlameIllustration />}
            </div>

            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line">
              <nav aria-label="Outputs" className="flex flex-wrap gap-1">
                {RESULT_TABS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-current={panel === option ? "page" : undefined}
                    onClick={() => open(option)}
                    className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-semibold ${
                      panel === option
                        ? "border-accent text-accent"
                        : "border-transparent text-ink-2 hover:text-ink"
                    }`}
                  >
                    {PANEL_LABEL[option]}
                  </button>
                ))}
              </nav>
              <p
                className="flex items-center gap-2 pb-2 text-xs text-ink-2"
                title="No AI takes part in the ranking, the coverage verdict or the map."
              >
                <span className="num rounded border border-line bg-bg px-1.5 py-0.5 text-ink">
                  score = closeness × relevance × completeness
                </span>
                <Link
                  href="/method"
                  className="font-semibold text-accent hover:underline"
                >
                  How it is ranked
                </Link>
              </p>
            </div>

            {panel === "overview" && (
              <Overview
                atmosphere={atmosphere}
                readouts={readouts}
                activeId={activePreset}
                cells={cells}
                ranked={ranked}
                top={top}
                implications={implications[activePreset]}
                investigations={investigationById}
                onAtmosphere={setAtmosphere}
                onOpen={open}
                onReveal={reveal}
                onVerify={setVerifyId}
              />
            )}

            {panel === "coverage" && (
              <div className="flex flex-col gap-3">
                <CoverageVerdict
                  atmosphere={atmosphere}
                  coverage={coverage}
                  nearest={nearest}
                  onJump={jump}
                />
                <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                  <ConditionsChart
                    atmosphere={atmosphere}
                    findings={ranked}
                    cells={cells}
                    onSelect={reveal}
                  />
                  <GapsPanel
                    coverage={coverage}
                    cells={cells}
                    nearest={nearest}
                    onJump={jump}
                  />
                </div>
              </div>
            )}

            {panel === "implications" && (
              <Implications
                items={implications[activePreset]}
                top={top}
                onCite={reveal}
              />
            )}

            {panel === "evidence" && (
              <section
                aria-label="Ranked evidence"
                className="flex flex-col gap-4"
              >
                <div className="rounded-lg border border-line bg-surface p-4">
                  <OutcomeSummary top={top} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div
                    role="group"
                    aria-label="Filter findings"
                    className="flex flex-wrap gap-1.5"
                  >
                    <FuelChip
                      label="All fuels"
                      count={ranked.length}
                      active={view.fuel === "any"}
                      onClick={() => setView((v) => ({ ...v, fuel: "any" }))}
                    />
                    {FUELS.filter((fuel) => fuelCounts.has(fuel)).map(
                      (fuel) => (
                        <FuelChip
                          key={fuel}
                          label={FUEL_GROUP_LABEL[fuel]}
                          count={fuelCounts.get(fuel) ?? 0}
                          active={view.fuel === fuel}
                          onClick={() => setView((v) => ({ ...v, fuel }))}
                        />
                      ),
                    )}
                    <FuelChip
                      label="Only spread or sustained burning"
                      count={burningCount}
                      active={view.burning}
                      onClick={() =>
                        setView((v) => ({ ...v, burning: !v.burning }))
                      }
                    />
                  </div>
                  {view.expert && (
                    <div className="flex items-center gap-3 text-xs">
                      <div
                        role="group"
                        aria-label="Evidence layout"
                        className="flex rounded-md border border-line p-0.5"
                      >
                        {(["cards", "table"] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={layout === option}
                            onClick={() => setLayout(option)}
                            className={`rounded px-2.5 py-1 font-semibold capitalize ${
                              layout === option
                                ? "bg-surface-2 text-accent"
                                : "text-ink-2 hover:text-ink"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadCsv(filtered)}
                        className="text-accent hover:underline"
                      >
                        Download CSV
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-ink-2">
                  {filtered.length} of {ranked.length} source-checked findings,
                  closest test conditions first.{" "}
                  {filtersOn && (
                    <button
                      type="button"
                      onClick={() =>
                        setView((v) => ({
                          ...v,
                          direction: "any",
                          fuel: "any",
                          burning: false,
                        }))
                      }
                      className="text-accent underline underline-offset-2"
                    >
                      Clear filters
                    </button>
                  )}
                </p>

                {filtered.length === 0 ? (
                  <p className="hatch rounded-lg border border-line p-6 text-sm">
                    No findings match these filters. Clear the filters to see
                    all {ranked.length} findings.
                  </p>
                ) : view.expert && layout === "table" ? (
                  <EvidenceTable findings={filtered} onVerify={setVerifyId} />
                ) : (
                  <>
                    <ol className="flex flex-col gap-3">
                      {visible.map((finding, index) => (
                        <motion.li
                          key={finding.id}
                          layout="position"
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <EvidenceCard
                            rank={index + 1}
                            finding={finding}
                            investigation={investigationById.get(
                              finding.investigation_id,
                            )}
                            atmosphere={atmosphere}
                            highlighted={revealId === finding.id}
                            onVerify={setVerifyId}
                          />
                        </motion.li>
                      ))}
                    </ol>
                    {filtered.length > TOP_N && (
                      <button
                        type="button"
                        onClick={() => setShowAll(!showAll)}
                        className="self-start rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
                      >
                        {showAll
                          ? `Show top ${TOP_N} only`
                          : `Show all ${filtered.length} findings`}
                      </button>
                    )}
                  </>
                )}

                {ASK_ENABLED && <AskBox />}
              </section>
            )}
          </div>
        </main>
      )}

      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-[1440px] px-4 py-3 text-xs text-muted">
          Evidence tool. Not a source of design limits. Findings come from NASA
          microgravity combustion investigations and their publications; every
          card links to its source. Text marked AI-generated was written from
          those records. Built for the NASA Space Apps Challenge 2026 by team
          Skylize. Not affiliated with or endorsed by NASA.
        </p>
      </footer>

      <VerifyDrawer
        finding={verifyFinding}
        investigation={
          verifyFinding
            ? investigationById.get(verifyFinding.investigation_id)
            : undefined
        }
        onClose={() => setVerifyId(null)}
      />
    </MotionConfig>
  );
}

function FuelChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-line bg-surface text-ink-2 hover:text-ink"
      }`}
    >
      {label} <span className="num font-normal">{count}</span>
    </button>
  );
}
