# FireSight

NASA Space Apps Challenge 2026 — **Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data**
Team: Skylize

FireSight turns NASA's microgravity combustion experiments into ranked, cited
fire-safety evidence for any spacecraft or habitat atmosphere. Pick an
atmosphere (oxygen %, pressure, airflow) and see which NASA findings are most
relevant, with every claim linked back to its source record.

## How it works

1. Pick a habitat atmosphere — a preset or custom sliders.
2. Verified findings from NASA PSI combustion investigations are ranked by how
   closely their test conditions match, weighted by safety relevance and data
   completeness. The formula is shown in full at `/method` — nothing is a
   black box.
3. Each result is an evidence card: what burned, under what conditions, what
   happened, and a direct link to the NASA PSI record.
4. A chart and a data-gaps panel show which oxygen/pressure combinations have
   little or no evidence in this dataset.
5. Safety implications for the two preset atmospheres are AI-written in advance
   (`data/implications.json`), cite finding ids, and are labeled in the UI.

## NASA data

Source: [NASA Physical Sciences Informatics (PSI) repository](https://psi.nasa.gov/),
combustion science investigations (BASS/BASS-II, SoFIE, FLEX/FLEX-2, ACME,
SLICE, SPICE, CFI, SAME/SAME-R). See `data/investigations.json` for the
specific investigations used and their PSI links.

**Data integrity rules:**
- A missing value is shown as "not reported" — never guessed or interpolated.
- A finding is shown only when `source_checked: true`: every value was checked
  against the cited source document. This check was AI-assisted. Independent
  human review is tracked separately in `verified_by_human` and is not yet
  complete. See `docs/VERIFY.md`.

## AI use and disclosure

This project was built with AI assistance (Claude), including code scaffolding
and drafting of investigation summaries, which a human reviewed before
publishing. In the running app:

- Investigation summaries and the "Ask the data" Q&A feature are AI-generated
  and labeled as such in the UI.
- The AI layer answers only from the verified findings/investigations JSON in
  `/data` — it does not draw on outside knowledge, and says "not in the
  dataset" when the records don't cover a question. See `app/api/ask/route.ts`.
- If the live Q&A API is unavailable, the UI falls back to a plain message
  pointing back to the ranked evidence cards, rather than failing silently.

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

The top bar has **Export CSV** and **Export PDF**.

- **CSV** (`lib/csv.ts`) downloads the ranked findings currently shown, with
  the score breakdown, the review flags and the source URL for every row. The
  filename carries the atmosphere, e.g. `firesight-34pct-o2-56.5kpa.csv`.
- **PDF** renders `components/PrintReport.tsx` and opens the browser's print
  dialog, where "Save as PDF" writes the file. The report is built for paper:
  coverage verdict, safety implications with their finding ids, every ranked
  finding with its conditions, score breakdown and full source URL, the
  method, and the NASA investigations used. The screen app is hidden in print
  (`@media print` in `app/globals.css`).

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
a source of design limits. Not a replacement for the PSI repository — a way
into it.
