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
- `motion` for the re-rank animation, `geist` for the typefaces
- Static JSON in `/data`, imported at build time. No database
- One route handler, `/api/ask`, calling an LLM (key via `LLM_API_KEY` env var).
  The question box is shown only when `NEXT_PUBLIC_ASK_ENABLED=1`

```
/app
  page.tsx            dashboard (Suspense + skeleton)
  method/page.tsx     ranking formula, worked example, coverage rule, data list, limits
  api/ask/route.ts    Q&A endpoint
/components           Dashboard, TopBar, AtmosphereSelector, AnswerStrip, Implications,
                      EvidenceCard, EvidenceTable, VerifyDrawer, ConditionsChart,
                      GapsPanel, AskBox
/data                 investigations.json, findings.json, presets.json, implications.json
/lib                  rank.ts, coverage.ts, url.ts, format.ts, schema.ts
```

## Coverage rule

A point on the oxygen x pressure plane is **tested** when 3 or more distinct
test conditions lie within +/-5 % O2 and +/-15 kPa of it, **thin** with 1 or 2,
**untested** with none. Findings from the same burn share one condition. The
same rule drives the verdict, the chart hatching and the gaps panel
(`lib/coverage.ts`).

The view state (atmosphere, mode, filters) lives in the URL, e.g.
`?o2=34&p=56.5&flow=15`, so any view can be shared.

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
