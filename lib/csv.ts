// CSV export of the ranked evidence: every column the UI shows, plus the
// score breakdown and the source, so a row can be checked away from the app.
import type { ScoredFinding } from "./schema";

function cell(value: string | number | boolean | null): string {
  if (value === null) return "not reported";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const HEADER = [
  "rank",
  "id",
  "investigation",
  "fuel",
  "fuel_form",
  "oxygen_pct",
  "pressure_kpa",
  "flow_cm_s",
  "flow_direction",
  "outcome",
  "score",
  "closeness",
  "relevance",
  "completeness",
  "finding",
  "source_url",
  "source_location",
  "source_checked",
  "verified_by_human",
];

export function findingsToCsv(findings: ScoredFinding[]): string {
  const rows = findings.map((f, i) =>
    [
      i + 1,
      f.id,
      f.investigation_id,
      f.fuel,
      f.fuel_form,
      f.oxygen_pct,
      f.pressure_kpa,
      f.flow_cm_s,
      f.flow_direction === "unknown" ? null : f.flow_direction,
      f.outcome,
      f.score.toFixed(3),
      f.closeness.toFixed(3),
      (f.safety_relevance / 3).toFixed(3),
      f.completeness.toFixed(3),
      f.finding,
      f.source_url,
      f.source_quote_location,
      f.source_checked,
      f.verified_by_human,
    ]
      .map(cell)
      .join(",")
  );
  return [HEADER.join(","), ...rows].join("\n");
}

export function downloadCsv(findings: ScoredFinding[], filename = "flamesight-findings.csv") {
  const blob = new Blob([findingsToCsv(findings)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
