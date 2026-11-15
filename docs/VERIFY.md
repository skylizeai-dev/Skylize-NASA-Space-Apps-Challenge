# Dataset verification log

Two separate flags per row in `data/findings.json`:

- `source_checked` — every value was checked against the cited source document
  (AI-assisted). **This gates what the dashboard shows.** All 28 rows: `true`.
- `verified_by_human` — independent human review. All rows: `false` (not yet done).
  The UI and README say this openly; nothing claims human verification.

## Source check results (15 Nov 2026)

| Rows | Source | Result |
|---|---|---|
| saffire-002, 003, 005, 006, 007 | Saffire ICES-2024 slides 11, 13, 20 | All pressures, oxygen levels, flows, lengths match the test matrix exactly. All five samples burned (slide 20 burn durations; slide 13 flame images). Burn duration and heat release added. |
| saffire-009, 010 (new) | Saffire ICES-2024 slides 20–21 | Added: CO/CO2 above crew limits during PMMA fires; smoke detected only at 981 s, after most toxic gas release. |
| bass-ii-003 | NTRS 20150000894 | Numbers match (10 x 2.2 cm, 1 atm, 18.7%, 5 → 2.2 cm/s, quenched). **Flow direction not stated → changed from "concurrent" (inferred) to "unknown".** |
| saffire-004 | Saffire ICES-2021 slides (via search index; PDF would not load) | Slide says V-2 had low flow 35 s then flow off 70 s. **Removed the 5 cm/s value** (belonged to a different statement). Finding reworded to NASA's stated conclusion. |
| slice-001 | NTRS 20150002322 | **Removed** the soot clause and 17 cm/s coflow (they came from different papers). Kept only the abstract's claims. Relevance lowered to 1. |
| bass-ii-001, 002, 004, 005, 006 | Sci. Reports 2018; ICES-2016; ICES-2019; NTRS 20160000593 | Match abstract/slide text. |
| saffire-001, 008 | NTRS 20180005168; ICES-2021 slides | Match. |
| sofie-mist-001..003 | UC Berkeley Engineering article (Dec 2024) | Match the article and figure captions. Weaker source type (university news). |
| flex-001..003 | Microgravity Sci. Technol. 2014; ISS Program Science release | Match. |
| acme-bre-001..004 | UMD dissertation and thesis abstracts | Match. Flow direction "quiescent" = no forced flow in the chamber. |
| cfi-g-001 | UMD release | Match. |

## For a human reviewer (optional, if time allows)

Open each `source_url`, check the row, set `verified_by_human: true`.
Fastest high-value pass: the Saffire ICES-2024 PDF covers 7 rows in one table.

## Dropped on purpose

SPICE and SoFIE-GEL: no usable condition numbers found. Better left out than padded.

## Known gap (use it on the slides)

The 34% O2 / 56.5 kPa exploration atmosphere has no direct flight test. Closest:
Saffire VI (28.8–31.0% O2, 54–55 kPa) and BRE (steady flames at 34% O2).
