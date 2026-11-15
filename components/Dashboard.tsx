"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MotionConfig, motion } from "motion/react";
import AnswerStrip from "./AnswerStrip";
import AskBox from "./AskBox";
import AtmosphereSelector from "./AtmosphereSelector";
import ConditionsChart from "./ConditionsChart";
import EvidenceCard from "./EvidenceCard";
import EvidenceTable, { downloadCsv } from "./EvidenceTable";
import GapsPanel from "./GapsPanel";
import Implications, { type Implication } from "./Implications";
import TopBar from "./TopBar";
import VerifyDrawer from "./VerifyDrawer";
import { buildCoverageGrid, coverageAt, nearestTested } from "@/lib/coverage";
import { fuelGroup } from "@/lib/format";
import { rankFindings } from "@/lib/rank";
import { parseView, serializeView, type ViewState } from "@/lib/url";
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
const ASK_ENABLED = process.env.NEXT_PUBLIC_ASK_ENABLED === "1";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewState>(() =>
    parseView(new URLSearchParams(searchParams.toString()), presets[0])
  );
  const [showAll, setShowAll] = useState(false);
  const [layout, setLayout] = useState<"cards" | "table">("cards");
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Mirror state into the URL. Debounced, because browsers throttle history writes.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.history.replaceState(null, "", `?${serializeView(view)}`);
      } catch {
        // The view still works; only the shareable link lags behind.
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [view]);

  const { atmosphere } = view;
  const setAtmosphere = useCallback(
    (next: Atmosphere) => setView((v) => ({ ...v, atmosphere: next })),
    []
  );
  const jump = useCallback(
    (oxygen_pct: number, pressure_kpa: number) =>
      setView((v) => ({ ...v, atmosphere: { ...v.atmosphere, oxygen_pct, pressure_kpa } })),
    []
  );

  const ranked = useMemo(() => rankFindings(atmosphere, findings), [atmosphere]);
  const coverage = useMemo(
    () => coverageAt(atmosphere.oxygen_pct, atmosphere.pressure_kpa, findings),
    [atmosphere.oxygen_pct, atmosphere.pressure_kpa]
  );
  const nearest = useMemo(
    () => nearestTested(atmosphere.oxygen_pct, atmosphere.pressure_kpa, cells),
    [atmosphere.oxygen_pct, atmosphere.pressure_kpa]
  );

  const filtered = useMemo(
    () =>
      ranked.filter(
        (f) =>
          !view.expert ||
          ((view.direction === "any" || f.flow_direction === view.direction) &&
            (view.fuel === "any" || fuelGroup(f) === view.fuel))
      ),
    [ranked, view.expert, view.direction, view.fuel]
  );
  const top = ranked.slice(0, TOP_N);
  const visible = showAll ? filtered : filtered.slice(0, TOP_N);
  const filtersOn = view.expert && (view.direction !== "any" || view.fuel !== "any");

  const activePreset =
    presets.find(
      (p) =>
        p.oxygen_pct === atmosphere.oxygen_pct &&
        p.pressure_kpa === atmosphere.pressure_kpa &&
        p.flow_cm_s === atmosphere.flow_cm_s
    )?.id ?? "custom";

  // From a chart mark or a citation chip: reveal the card, scroll to it, flash it.
  const reveal = useCallback((id: string) => {
    setLayout("cards");
    setShowAll(true);
    setHighlightId(id);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document
          .getElementById(`finding-${id}`)
          ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      })
    );
    setTimeout(() => setHighlightId((current) => (current === id ? null : current)), 2000);
  }, []);

  const verifyFinding = ranked.find((f) => f.id === verifyId) ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <TopBar expert={view.expert} onExpert={(expert) => setView((v) => ({ ...v, expert }))} />

      <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <div className="md:sticky md:top-[68px] md:self-start">
          <AtmosphereSelector
            presets={presets}
            view={view}
            activePresetId={activePreset}
            onAtmosphere={setAtmosphere}
            onFilters={(filters) => setView((v) => ({ ...v, ...filters }))}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <h1 className="max-w-[60ch] text-xl leading-snug font-semibold">
            What does NASA&apos;s microgravity fire evidence say about this atmosphere?
          </h1>

          <AnswerStrip
            atmosphere={atmosphere}
            coverage={coverage}
            top={top}
            nearest={nearest}
            onJump={jump}
          />

          <Implications items={implications[activePreset]} top={top} onCite={reveal} />

          <section aria-label="Ranked evidence" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="flex flex-col">
                <h2 className="text-base font-semibold">Ranked evidence</h2>
                <p className="text-xs text-ink-2">
                  {filtered.length} of {ranked.length} source-checked findings, closest test
                  conditions first.{" "}
                  {filtersOn && (
                    <button
                      type="button"
                      onClick={() => setView((v) => ({ ...v, direction: "any", fuel: "any" }))}
                      className="text-accent underline underline-offset-2"
                    >
                      Clear filters
                    </button>
                  )}
                </p>
              </div>
              {view.expert && (
                <div className="flex items-center gap-3 text-xs">
                  <div role="group" aria-label="Evidence layout" className="flex rounded-md border border-line p-0.5">
                    {(["cards", "table"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={layout === option}
                        onClick={() => setLayout(option)}
                        className={`rounded px-2.5 py-1 font-semibold capitalize ${
                          layout === option ? "bg-surface-2 text-accent" : "text-ink-2 hover:text-ink"
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

            {filtered.length === 0 ? (
              <p className="hatch rounded-lg border border-line p-6 text-sm">
                No findings match these filters. Clear the filters to see all {ranked.length}{" "}
                findings.
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
                        investigation={investigationById.get(finding.investigation_id)}
                        atmosphere={atmosphere}
                        highlighted={highlightId === finding.id}
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
                    {showAll ? `Show top ${TOP_N} only` : `Show all ${filtered.length} findings`}
                  </button>
                )}
              </>
            )}
          </section>

          {ASK_ENABLED && <AskBox />}
        </div>

        <div className="flex min-w-0 flex-col gap-6 md:col-span-2 md:grid md:grid-cols-2 xl:sticky xl:top-[68px] xl:col-span-1 xl:flex xl:self-start">
          <ConditionsChart atmosphere={atmosphere} findings={ranked} cells={cells} onSelect={reveal} />
          <GapsPanel coverage={coverage} cells={cells} nearest={nearest} onJump={jump} />
        </div>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto w-full max-w-[1440px] px-4 py-4 text-xs text-muted">
          Evidence tool. Not a source of design limits. Findings come from NASA microgravity
          combustion investigations and their publications; every card links to its source. Text
          marked AI-generated was written from those records. Built for the NASA Space Apps
          Challenge 2026 by team Skylize. Not affiliated with or endorsed by NASA.
        </p>
      </footer>

      <VerifyDrawer
        finding={verifyFinding}
        investigation={verifyFinding ? investigationById.get(verifyFinding.investigation_id) : undefined}
        onClose={() => setVerifyId(null)}
      />
    </MotionConfig>
  );
}
