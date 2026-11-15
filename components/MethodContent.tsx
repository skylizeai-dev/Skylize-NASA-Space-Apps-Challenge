import Link from "next/link";
import TopBar from "@/components/TopBar";
import { NEAR, coverageAt } from "@/lib/coverage";
import { APP_NAME } from "@/lib/config";
import { fmtNum, investigationLabel } from "@/lib/format";
import { CONDITION_RANGES, scoreFinding } from "@/lib/rank";
import type { Finding, Investigation, Preset } from "@/lib/schema";

import findingsData from "@/data/findings.json";
import investigationsData from "@/data/investigations.json";
import presetsData from "@/data/presets.json";

const findings = (findingsData as Finding[]).filter((f) => f.source_checked);
const investigations = investigationsData as Investigation[];
const exploration = (presetsData as Preset[]).find(
  (p) => p.id === "exploration-atmosphere"
) as Preset;

// The worked example is computed from the live data, so it cannot drift from the app.
const example = findings.find((f) => f.id === "saffire-005") ?? findings[0];
const scored = scoreFinding(exploration, example);
const exampleCoverage = coverageAt(exploration.oxygen_pct, exploration.pressure_kpa, findings);
const cabin = (presetsData as Preset[]).find((p) => p.id === "iss-cabin") as Preset;
const cabinCoverage = coverageAt(cabin.oxygen_pct, cabin.pressure_kpa, findings);

function term(target: number, value: number | null, range: number, unit: string) {
  if (value === null) return "not reported, skipped";
  const closeness = 1 - Math.abs(target - value) / range;
  return `1 − |${fmtNum(target)} − ${fmtNum(value)}| / ${range} = ${closeness.toFixed(3)}  (${unit})`;
}

// Rendered at /method (dark) and /v4/method (light). `base` keeps links inside the same version.
export default function MethodContent({ base = "" }: { base?: string }) {
  const plotted = findings.filter((f) => f.oxygen_pct !== null && f.pressure_kpa !== null);

  return (
    <>
      <TopBar base={base} />
      <main className="mx-auto flex w-full max-w-[72ch] flex-1 flex-col gap-10 px-4 py-10">
        <div className="flex flex-col gap-3">
          <Link href={base || "/"} className="w-fit text-sm text-accent hover:underline">
            Back to the evidence
          </Link>
          <h1 className="text-[28px] leading-tight font-semibold">Method and data</h1>
          <p className="text-base text-ink-2">
            {APP_NAME} ranks findings with a fixed formula. The same atmosphere always gives the
            same order, and no language model takes part in the ranking.
          </p>
        </div>

        <Section title="How findings are ranked">
          <p>
            You choose an atmosphere: oxygen O, pressure P and airflow F. Each finding has its own
            test conditions o, p and f.
          </p>
          <pre className="num overflow-x-auto rounded-lg border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink">
{`closeness    = 1 − mean( |O−o| / ${CONDITION_RANGES.oxygen_pct},  |P−p| / ${CONDITION_RANGES.pressure_kpa},  |F−f| / ${CONDITION_RANGES.flow_cm_s} )
               conditions the source does not report are skipped
relevance    = safety relevance (1, 2 or 3) / 3
completeness = reported conditions / 3
score        = closeness × relevance × completeness`}
          </pre>
          <p>
            The divisors are the width of each axis: {CONDITION_RANGES.oxygen_pct} % O₂,{" "}
            {CONDITION_RANGES.pressure_kpa} kPa and {CONDITION_RANGES.flow_cm_s} cm/s. A finding
            that leaves out a condition is never dropped and never given a guessed value. It loses
            score through completeness and its card says &ldquo;not reported&rdquo;.
          </p>
          <p>
            This formula is our own design for this tool, not a published NASA method. It is simple
            on purpose so that every score can be checked by hand.
          </p>
        </Section>

        <Section title="Worked example">
          <p>
            Atmosphere: {exploration.label.toLowerCase()}, {fmtNum(exploration.oxygen_pct)} % O₂,{" "}
            {fmtNum(exploration.pressure_kpa)} kPa, {fmtNum(exploration.flow_cm_s)} cm/s. Finding:{" "}
            <span className="num text-ink">{example.id}</span>, {example.fuel}.
          </p>
          <pre className="num overflow-x-auto rounded-lg border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink">
{`oxygen       ${term(exploration.oxygen_pct, example.oxygen_pct, CONDITION_RANGES.oxygen_pct, "% O₂")}
pressure     ${term(exploration.pressure_kpa, example.pressure_kpa, CONDITION_RANGES.pressure_kpa, "kPa")}
airflow      ${term(exploration.flow_cm_s, example.flow_cm_s, CONDITION_RANGES.flow_cm_s, "cm/s")}

closeness    ${scored.closeness.toFixed(3)}
relevance    ${example.safety_relevance} / 3 = ${(example.safety_relevance / 3).toFixed(3)}
completeness ${Math.round(scored.completeness * 3)} / 3 = ${scored.completeness.toFixed(3)}
score        ${scored.score.toFixed(3)}`}
          </pre>
        </Section>

        <Section title="Safety relevance">
          <p>Each finding carries a relevance tag set when the dataset was built:</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>3: directly informs material flammability or extinguishment.</li>
            <li>2: informs detection or flame behaviour.</li>
            <li>1: fundamental combustion science.</li>
          </ul>
        </Section>

        <Section title="Tested, thin and untested">
          <p>
            A finding is in close range of a point when it reports both oxygen and pressure and
            lies within ±{NEAR.oxygen_pct} % O₂ and ±{NEAR.pressure_kpa} kPa of it. Findings taken
            from the same burn share one oxygen and pressure pair, so they count as one test
            condition.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Tested: 3 or more test conditions in close range.</li>
            <li>Thin: 1 or 2.</li>
            <li>Untested: none.</li>
          </ul>
          <p>
            The same rule gives the verdict for your atmosphere, the hatching on the chart and the
            gaps panel. For the ISS cabin preset it returns{" "}
            <strong className="font-semibold text-ink">{cabinCoverage.status}</strong>:{" "}
            {cabinCoverage.findings.length} findings from {cabinCoverage.conditions} test
            conditions. For the exploration preset it returns{" "}
            <strong className="font-semibold text-ink">{exampleCoverage.status}</strong>:{" "}
            {exampleCoverage.findings.length} findings from {exampleCoverage.conditions} test
            conditions. A gap is not evidence of safety. It means this dataset holds no
            source-checked finding there.
          </p>
        </Section>

        <Section title="Data rules">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>A missing value is shown as &ldquo;not reported&rdquo;. It is never guessed.</li>
            <li>
              A finding appears only after every value was compared with its cited source
              document. This check was AI-assisted. Independent human review of each row is
              tracked separately and is not yet complete; the Verify panel shows the status of
              each finding.
            </li>
            <li>A flow direction the source does not state is shown as not reported.</li>
            <li>Every card links to its source document and names where in it to look.</li>
          </ul>
        </Section>

        <Section title="How AI is used">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>
              AI helped extract values from NASA documents into the dataset and wrote the
              investigation summaries and the safety implications for the two preset atmospheres.
            </li>
            <li>
              AI-written text is marked with a violet border and the label &ldquo;AI-generated
              from NASA PSI records&rdquo;.
            </li>
            <li>
              Each implication cites finding ids. One that cites a finding outside the ranked
              evidence on screen is not shown. With fewer than 3 cited findings the panel says
              &ldquo;Insufficient evidence&rdquo;.
            </li>
            <li>
              The ranking, the coverage verdict, the chart and the gaps use no AI. With every
              language model switched off they are unchanged.
            </li>
          </ul>
        </Section>

        <Section title="Limits">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li>Not a combustion simulator or a predictive model.</li>
            <li>Not a certified safety tool or a source of design limits.</li>
            <li>Not a replacement for NASA&apos;s PSI repository. It is a way into it.</li>
            <li>
              The dataset is small: {findings.length} findings from {investigations.length}{" "}
              investigations, of which {plotted.length} report both oxygen and pressure.
            </li>
          </ul>
        </Section>

        <section id="data" className="flex scroll-mt-20 flex-col gap-3">
          <h2 className="text-xl font-semibold">Data: NASA investigations used</h2>
          <ul className="flex flex-col gap-3">
            {investigations.map((inv) => (
              <li key={inv.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={inv.psi_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-accent hover:underline"
                  >
                    {inv.name}
                  </a>
                  <span className="num text-xs text-ink-2">
                    {findings.filter((f) => f.investigation_id === inv.id).length === 1
                      ? "1 finding"
                      : `${findings.filter((f) => f.investigation_id === inv.id).length} findings`}
                  </span>
                </div>
                <p className="text-xs text-ink-2">
                  {investigationLabel(inv.id)}, {inv.platform}, {inv.facility}, {inv.years}
                </p>
                <p className="mt-2 text-sm text-ink-2">{inv.objective}</p>
                {inv.publications.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 text-xs">
                    {inv.publications.map((pub) => (
                      <li key={pub.url}>
                        <a
                          href={pub.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {pub.title}
                        </a>{" "}
                        <span className="num text-muted">{pub.year}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-sm text-ink-2">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
