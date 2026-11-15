"use client";

import { useState } from "react";
import { FLOW_LABEL, OUTCOME_META, fmtNum, investigationLabel } from "@/lib/format";
import type { ScoredFinding } from "@/lib/schema";
import { OutcomeIcon } from "./Outcome";

type SortKey = "score" | "oxygen_pct" | "pressure_kpa" | "flow_cm_s";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "score", label: "Score" },
  { key: "oxygen_pct", label: "O₂ %" },
  { key: "pressure_kpa", label: "kPa" },
  { key: "flow_cm_s", label: "cm/s" },
];

function csvCell(value: string | number | null): string {
  if (value === null) return "not reported";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(findings: ScoredFinding[]) {
  const header = [
    "rank", "id", "investigation", "fuel", "fuel_form", "oxygen_pct", "pressure_kpa",
    "flow_cm_s", "flow_direction", "outcome", "score", "closeness", "completeness",
    "finding", "source_url", "source_location",
  ];
  const rows = findings.map((f, i) =>
    [
      i + 1, f.id, f.investigation_id, f.fuel, f.fuel_form, f.oxygen_pct, f.pressure_kpa,
      f.flow_cm_s, f.flow_direction, f.outcome, f.score.toFixed(3), f.closeness.toFixed(3),
      f.completeness.toFixed(3), f.finding, f.source_url, f.source_quote_location,
    ]
      .map(csvCell)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "firesight-findings.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function EvidenceTable({
  findings,
  onVerify,
}: {
  findings: ScoredFinding[];
  onVerify: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "score", desc: true });

  // Rows with no value for the sorted column go last, whichever way the sort runs.
  const sorted = [...findings].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return sort.desc ? bv - av : av - bv;
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-line text-xs text-ink-2">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Finding</th>
            <th scope="col" className="px-3 py-2 font-semibold">Fuel</th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-3 py-2 text-right font-semibold"
                aria-sort={sort.key === col.key ? (sort.desc ? "descending" : "ascending") : "none"}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSort({ key: col.key, desc: sort.key === col.key ? !sort.desc : true })
                  }
                  className="hover:text-ink"
                >
                  {col.label} {sort.key === col.key ? (sort.desc ? "▾" : "▴") : ""}
                </button>
              </th>
            ))}
            <th scope="col" className="px-3 py-2 font-semibold">Direction</th>
            <th scope="col" className="px-3 py-2 font-semibold">Outcome</th>
            <th scope="col" className="px-3 py-2 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr key={f.id} className="border-b border-line last:border-0 hover:bg-surface-2">
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onVerify(f.id)}
                  className="num whitespace-nowrap text-accent hover:underline"
                  title={f.finding}
                >
                  {f.id}
                </button>
                <div className="text-xs text-muted">{investigationLabel(f.investigation_id)}</div>
              </td>
              <td className="max-w-40 px-3 py-2">{f.fuel}</td>
              <td className="num px-3 py-2 text-right">{f.score.toFixed(2)}</td>
              {(["oxygen_pct", "pressure_kpa", "flow_cm_s"] as const).map((key) => (
                <td key={key} className="num px-3 py-2 text-right whitespace-nowrap">
                  {f[key] === null ? (
                    <span className="text-muted">not reported</span>
                  ) : (
                    fmtNum(f[key] as number)
                  )}
                </td>
              ))}
              <td className="px-3 py-2">
                {f.flow_direction === "unknown" ? (
                  <span className="text-muted">not reported</span>
                ) : (
                  FLOW_LABEL[f.flow_direction]
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <OutcomeIcon outcome={f.outcome} size={10} />
                  {OUTCOME_META[f.outcome].label}
                </span>
              </td>
              <td className="px-3 py-2">
                <a
                  href={f.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
