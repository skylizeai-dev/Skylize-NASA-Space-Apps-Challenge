# Dataset verification sheet

Every row in `data/findings.json` ships with `verified_by_human: false`.
The dashboard only ranks rows with `verified_by_human: true` (see `lib/rank.ts`),
so **nothing appears on the live site until a human signs off.**

How to verify a row: open `source_url`, go to `source_quote_location`, and check that
the numbers and the one-sentence finding match. Then set `verified_by_human` to `true`.
If a number is wrong, fix it or set it to `null`. Never guess.

## Priority 1: plottable rows (they drive the chart and the gaps grid)

| id | Check |
|---|---|
| bass-ii-003 | 18.7% O2, 1 atm, flow 5 → 2.2 cm/s, quenched. **Flow direction "concurrent" is inferred** from the companion BASS fabric paper; confirm on the slide. |
| saffire-002 | Test matrix IV-1: 22.0%, 100.0 kPa, 20 cm/s. Confirm the sample actually spread. |
| saffire-003 | Test matrix V-2: 26.2%, 70.7 kPa, 20 cm/s. |
| saffire-005 | Test matrix VI-2: 31.0%, 54.1 kPa, 20 cm/s. **Key row for the exploration-atmosphere insight.** |
| saffire-006 | VI-3: 30.3%, 54.6 kPa; flow cut to 5 cm/s at 1120 s, off at 1420 s. |
| saffire-007 | VI-4: 28.8%, 55.2 kPa. **Outcome "spread" not confirmed**: check that the one-sided PMMA ignited and spread. |
| saffire-004 | Outcome "steady" is an interpretation of "extinguishment cannot be assumed to occur rapidly" at 5 cm/s. Confirm or change to "spread". |
| sofie-mist-002 | Figure caption: 12.7 mm rod, 19.8%, 60 kPa. |
| sofie-mist-003 | Figure caption: 9.5 mm rod, 17.8%, 100 kPa. |

## Priority 2: partial-condition rows

| id | Check |
|---|---|
| bass-ii-001 | 17% (µg) vs 18% (1 g), flows 0.4–8 cm/s. Pressure left null (ISS cabin, but not stated in the abstract). |
| bass-ii-002 | 15–21% O2, 0.5–5 cm/s, µg faster than 1 g. |
| bass-ii-004 | Fan off → flames always quenched. |
| bass-ii-005 | Lower O2 limit in µg (qualitative). |
| bass-ii-006 | 0.1 mm sample: radiative quench at low flow, blow-off at high flow. |
| saffire-001 | 1.8 mm/s average spread, 1200 ± 300 W, 420 s burn. |
| saffire-008 | Oxygen "shadow" of the upstream flame. |
| sofie-mist-001 | O2 limit ~15% (µg) vs ~18% (1 g). Source is a university news article; a NASA/NTRS paper would be stronger if you find one. |
| flex-001 | LOI heptane 0.15, methanol 0.12. Outcome "no-ignition" stands for "below this limit". |
| flex-002 | ~3 mm droplets, cool flame ~600 °C, none under 2.4 mm. Source is a press release; the Springer paper backs it. |
| flex-003 | Extinction diameter trends vs O2. |
| acme-bre-001..003 | 21% → all out within 40 s; steady at 26.5% and 34%. **Flow direction "quiescent" is assumed** (no forced flow in the chamber); pressure null (tests ran 0.56–1 bar). |
| acme-bre-004 | XO2³·Re^-0.5 scaling, pressure-independent. |
| cfi-g-001 | Residual burner heat re-ignited fuel as a cool flame. |
| slice-001 | O2 21% from "methane/air"; coflow 17 cm/s taken from one slide case. |

## Dropped on purpose

SPICE and SoFIE-GEL: no usable condition numbers found in the time available. Better left
out than padded.

## Known gap (use it on the slides)

The 34% O2 / 56.5 kPa exploration atmosphere has no direct flight test. The closest are
Saffire VI (28.8–31.0% O2, 54–55 kPa) and BRE (steady flames at 34% O2, pressure varied).
NASA's own SoFIE slides note that very few materials have been rated even in 1 g at
34% O2 and 8.2 psia.
