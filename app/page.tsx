"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AtmosphereSelector from "@/components/AtmosphereSelector";
import EvidenceCard from "@/components/EvidenceCard";
import ConditionsChart from "@/components/ConditionsChart";
import GapsGrid from "@/components/GapsGrid";
import AskBox from "@/components/AskBox";
import { rankFindings } from "@/lib/rank";
import type { Atmosphere, Finding, Investigation } from "@/lib/schema";

import investigationsData from "@/data/investigations.json";
import findingsData from "@/data/findings.json";
import presetsData from "@/data/presets.json";

const investigations = investigationsData as Investigation[];
const findings = findingsData as Finding[];

export default function Home() {
  const [atmosphere, setAtmosphere] = useState<Atmosphere>({
    oxygen_pct: presetsData[0].oxygen_pct,
    pressure_kpa: presetsData[0].pressure_kpa,
    flow_cm_s: presetsData[0].flow_cm_s,
  });
  const [activePresetId, setActivePresetId] = useState(presetsData[0].id);

  const ranked = useMemo(() => rankFindings(atmosphere, findings), [atmosphere]);
  const investigationById = useMemo(
    () => new Map(investigations.map((i) => [i.id, i])),
    []
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold tracking-wide text-orange-800 dark:bg-orange-950 dark:text-orange-300">
          NASA Space Apps Challenge 2026 — Flame in Freefall
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          FlameSight
        </h1>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Pick a habitat atmosphere. See NASA&apos;s microgravity combustion evidence
          ranked by relevance, every claim linked to its source.
        </p>
        <Link
          href="/method"
          className="w-fit text-sm font-medium text-orange-700 hover:underline dark:text-orange-400"
        >
          How the ranking works →
        </Link>
      </header>

      <AtmosphereSelector
        presets={presetsData}
        value={atmosphere}
        activePresetId={activePresetId}
        onChange={(next, presetId) => {
          setAtmosphere(next);
          setActivePresetId(presetId);
        }}
      />

      <ConditionsChart atmosphere={atmosphere} findings={ranked} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Ranked evidence
        </h2>
        {ranked.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No verified findings loaded yet — dataset build is in progress.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ranked.slice(0, 8).map((finding) => (
              <EvidenceCard
                key={finding.id}
                finding={finding}
                investigation={investigationById.get(finding.investigation_id)}
              />
            ))}
          </div>
        )}
      </section>

      <GapsGrid findings={findings} />

      <AskBox />

      <footer className="mt-4 border-t border-zinc-200 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
        Data: NASA Physical Sciences Informatics (PSI) repository, combustion
        science investigations. AI-generated summaries and the Q&A box are
        clearly labeled and answer only from the dataset shown. See{" "}
        <Link href="/method" className="underline">
          /method
        </Link>{" "}
        for the ranking formula and limits.
      </footer>
    </main>
  );
}
