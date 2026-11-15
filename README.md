# FlameSight by Skylize

NASA Space Apps Challenge 2026 — **Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data**
Team: Skylize

FlameSight by Skylize turns NASA's microgravity combustion experiments into ranked, cited
fire-safety evidence for any spacecraft or habitat atmosphere. Pick an
atmosphere (oxygen %, pressure, airflow) and see which NASA findings are most
relevant, with every claim linked back to its source document.

## How it works

1. Pick a habitat atmosphere — a preset or custom sliders.
2. Source-checked findings from NASA microgravity combustion investigations are ranked by how
   closely their test conditions match, weighted by safety relevance and data
   completeness. The formula is shown in full at `/method` — nothing is a
   black box.
3. Each result is an evidence card: what burned, under what conditions, what
   happened, and a direct link to its source (NASA technical report, NASA
   investigation page or peer-reviewed paper).
4. A chart and a data-gaps panel show which oxygen/pressure combinations have
   little or no evidence in this dataset.
5. Safety implications for the two preset atmospheres are AI-written in advance
   (`data/implications.json`), cite finding ids, and are labeled in the UI.

## NASA data

28 findings from 7 NASA microgravity combustion investigations (the combustion
science investigations catalogued by NASA's Physical Sciences Informatics
program), taken from NASA technical reports (NTRS), NASA investigation pages
and peer-reviewed publications:

| Investigation | Platform | Findings | Main source |
|---|---|---|---|
| BASS-II, Burning and Suppression of Solids-II | ISS, MSG, 2014–2016 | 6 | [NTRS 20210011385](https://ntrs.nasa.gov/citations/20210011385) |
| Saffire I–VI, Spacecraft Fire Safety Demonstration | Uncrewed Cygnus, 2016–2023 | 10 | [NASA fact sheet](https://www.nasa.gov/wp-content/uploads/2025/07/spacecraft-fire-safety-demonstration-saffire.pdf), [NTRS 20240002981](https://ntrs.nasa.gov/citations/20240002981) |
| SoFIE-MIST, Solid Fuel Ignition and Extinction – Material Ignition and Suppression Test | ISS, CIR, 2023–2025 | 3 | [NASA Science](https://science.nasa.gov/biological-physical/investigations/sofie-mist) |
| FLEX, Flame Extinguishment Experiment | ISS, CIR, 2009–2012 | 3 | [doi:10.1007/s12217-014-9372-2](https://doi.org/10.1007/s12217-014-9372-2) |
| ACME-BRE, Burning Rate Emulator | ISS, CIR, 2019–2021 | 4 | [NASA Science](https://science.nasa.gov/biological-physical/investigations/bre/), [doi:10.1016/j.combustflame.2021.01.035](https://doi.org/10.1016/j.combustflame.2021.01.035) |
| CFI-G, Cool Flames Investigation with Gases | ISS, CIR, 2021 | 1 | [NASA](https://www.nasa.gov/mission_pages/station/research/news/Cool_Flames_First_for_ISS) |
| SLICE, Structure and Liftoff in Combustion Experiment | ISS, MSG, 2012 | 1 | [NTRS 20150002322](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20150002322.pdf) |

Every publication and the exact source location for each finding are in
`data/investigations.json` and `data/findings.json`, and on the `/method` page.

**Data integrity rules:**
- A missing value is shown as "not reported" — never guessed or interpolated.
- A finding is shown only when `source_checked: true`: every value was checked
  against the cited source document. This check was AI-assisted. Independent
  human review is tracked separately in `verified_by_human` and is not yet
  complete. See `docs/VERIFY.md`.

## AI use and disclosure

**This repository contains AI-generated code.** We used Claude (Anthropic) as a
coding assistant to scaffold and write parts of the Next.js app, the ranking and
coverage functions and the 3D cabin components; the team reviewed, tested and
deployed it. Claude also helped draft finding rows from NASA documents (each
value then checked against its cited source) and the investigation summaries.

**No AI-generated images.** Every visual (flame illustration, 3D cabin and
habitat, chart, icon) is drawn in code. Any AI-generated image added later must
carry a visible watermark. No NASA logos, insignia or mission patches are used,
and no people are shown.

In the running app:

- Investigation summaries and the preset safety implications are AI-generated
  and labeled "AI-generated from this dataset's NASA records" in the UI.
- An optional "Ask the data" Q&A box exists in code (`components/AskBox.tsx`,
  `app/api/ask/route.ts`) but is **off in the public build**. It turns on only
  when `NEXT_PUBLIC_ASK_ENABLED=1` and `LLM_API_KEY` are set. When on, it
  answers only from the JSON in `/data` and says "not in the dataset" otherwise.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel
- Hand-written SVG for the oxygen/pressure chart (no chart library)
- `motion` for the re-rank animation, `geist` for the typefaces, `three` for
  the 3D cabin view
- Static JSON in `/data`, imported at build time. No database
- One route handler, `/api/ask`, calling an LLM (key via `LLM_API_KEY` env var).
  The question box is shown only when `NEXT_PUBLIC_ASK_ENABLED=1`

```
/app
  page.tsx            dashboard (Suspense + skeleton)
  method/page.tsx     ranking formula, worked example, coverage rule, data list, limits
  api/ask/route.ts    Q&A endpoint
/components           Dashboard, Overview, TopBar, AtmosphereSelector, AnswerStrip, Implications,
                      EvidenceCard, EvidenceTable, VerifyDrawer, ConditionsChart, FlameIllustration,
                      GapsPanel, AskBox
/data                 investigations.json, findings.json, presets.json, implications.json
/lib                  rank.ts, coverage.ts, url.ts, format.ts, config.ts, schema.ts
```

## Visual design

One light theme with frosted-glass panels. Every colour is a token in
`app/globals.css`; text, accent and outcome colours are chosen to pass WCAG AA
on glass. Where `backdrop-filter` is unsupported, panels fall back to
near-opaque white.

## Export

The top bar has **Export CSV**.

- **CSV** (`lib/csv.ts`) downloads the ranked findings currently shown, with
  the score breakdown, the review flags and the source URL for every row. The
  filename carries the atmosphere, e.g. `flamesight-34pct-o2-56.5kpa.csv`.

## Coverage rule

A point on the oxygen x pressure plane is **tested** when 3 or more distinct
test conditions lie within +/-5 % O2 and +/-15 kPa of it, **thin** with 1 or 2,
**untested** with none. Findings from the same burn share one condition. The
same rule drives the verdict, the chart hatching and the gaps panel
(`lib/coverage.ts`).

## Step-by-step setup

A first visit opens a setup that builds the environment to test, in order:
habitat, oxygen, pressure, airflow, material, review.

1. **Habitat choice, full screen.** Two cards, ISS cabin and exploration
   habitat, each with its values and how much evidence exists for it.
2. **The 3D environment.** After a choice, the habitat opens in 3D as the main
   stage (a cut-open cabin module, or a surface base under a glass dome), with
   one question at a time in a panel beside it. Values apply live. Drag to look
   around, zoom the habitat, and select the sample, the airflow or the air to
   jump to its question.

"Show the evidence" opens the results. Shared links that already carry an
atmosphere (`?o2=...`) skip the setup, and "Build a new environment step by
step" reopens it. three.js loads only after a habitat is chosen, with a 2D
drawing as fallback without WebGL. See `docs/CABIN_3D_CONTRACT.md`.

## Overview and detail views

The dashboard opens on an overview: an evidence readout that compares the
ISS cabin and the exploration atmosphere side by side and shows the
highest-ranked finding, then one tile per output category (Coverage,
Evidence, Safety implications). A tile opens its detail view. The view state (atmosphere, open view, mode,
filters) lives in the URL, e.g. `?o2=34&p=56.5&flow=15&view=evidence`, so any
view can be shared and the browser Back button returns to the overview.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What this tool is not

Not a combustion simulator or predictive model. Not a certified safety tool or
a source of design limits. Not a replacement for NASA's source documents — a way
into them.

*FlameSight by Skylize was built for the NASA Space Apps Challenge 2026 and is
not affiliated with or endorsed by NASA.*
