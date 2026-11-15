// Ranking formula — plan.md section 5. Shown to the user in /method, not a black box.
import type { Atmosphere, Finding, ScoredFinding } from "./schema";

// Plausible ranges for the three condition axes, used to normalize distance.
// NASA habitat/ISS atmospheres sit roughly within these bounds.
export const CONDITION_RANGES = {
  oxygen_pct: 70, // e.g. 0–70% O2 covers ISS (~21%) through elevated exploration atmospheres
  pressure_kpa: 101, // vacuum (0) through sea-level-equivalent (~101 kPa)
  flow_cm_s: 50, // quiescent (0) through strong forced flow
} as const;

function axisCloseness(
  target: number,
  value: number | null,
  range: number
): number | null {
  if (value === null) return null;
  return 1 - Math.abs(target - value) / range;
}

export function scoreFinding(
  atmosphere: Atmosphere,
  finding: Finding
): ScoredFinding {
  const axisScores = [
    axisCloseness(atmosphere.oxygen_pct, finding.oxygen_pct, CONDITION_RANGES.oxygen_pct),
    axisCloseness(atmosphere.pressure_kpa, finding.pressure_kpa, CONDITION_RANGES.pressure_kpa),
    axisCloseness(atmosphere.flow_cm_s, finding.flow_cm_s, CONDITION_RANGES.flow_cm_s),
  ];

  const presentAxisScores = axisScores.filter((s): s is number => s !== null);
  const closeness =
    presentAxisScores.length === 0
      ? 0
      : presentAxisScores.reduce((a, b) => a + b, 0) / presentAxisScores.length;

  const completeness = presentAxisScores.length / 3;
  const score = closeness * (finding.safety_relevance / 3) * completeness;

  return { ...finding, score, closeness, completeness };
}

export function rankFindings(
  atmosphere: Atmosphere,
  findings: Finding[]
): ScoredFinding[] {
  return findings
    .filter((f) => f.verified_by_human)
    .map((f) => scoreFinding(atmosphere, f))
    .sort((a, b) => b.score - a.score);
}
