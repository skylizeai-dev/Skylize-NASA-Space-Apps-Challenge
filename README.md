# FlameSight

NASA Space Apps Challenge 2026 — **Flame in Freefall: SI-Powered Fire Safety Insights from Microgravity Combustion Data**
Team: Skylize

FlameSight turns NASA's microgravity combustion experiments into ranked, cited
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
4. A data-gaps grid shows which oxygen/pressure combinations have little or no
   public NASA evidence.

## NASA data

Source: [NASA Physical Sciences Informatics (PSI) repository](https://psi.nasa.gov/),
combustion science investigations (BASS/BASS-II, SoFIE, FLEX/FLEX-2, ACME,
SLICE, SPICE, CFI, SAME/SAME-R). See `data/investigations.json` for the
specific investigations used and their PSI links.

**Data integrity rules:**
- A missing value is shown as "not reported" — never guessed or interpolated.
- A finding ships only once `verified_by_human: true` — a person checked it
  against the linked NASA source.

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
- Recharts for the oxygen/pressure scatter chart
- Static JSON in `/data`, imported at build time — no database
- One route handler, `/api/ask`, calling an LLM (key via `LLM_API_KEY` env var)

```
/app
  page.tsx            dashboard
  method/page.tsx     how ranking and AI work, and the tool's limits
  api/ask/route.ts    Q&A endpoint
/components           AtmosphereSelector, EvidenceCard, ConditionsChart, GapsGrid, AskBox
/data                 investigations.json, findings.json, presets.json
/lib                  rank.ts, gaps.ts, schema.ts
```

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
