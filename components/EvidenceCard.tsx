import type { Investigation, ScoredFinding } from "@/lib/schema";

interface Props {
  finding: ScoredFinding;
  investigation?: Investigation;
}

function fmt(value: number | null, unit: string) {
  return value === null ? "not reported" : `${value} ${unit}`;
}

export default function EvidenceCard({ finding, investigation }: Props) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {finding.fuel} — {finding.fuel_form}
        </h3>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-300">
          score {finding.score.toFixed(2)}
        </span>
      </div>

      <p className="text-sm text-zinc-700 dark:text-zinc-300">{finding.finding}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500 sm:grid-cols-4">
        <div>
          <dt className="font-medium">O2</dt>
          <dd>{fmt(finding.oxygen_pct, "%")}</dd>
        </div>
        <div>
          <dt className="font-medium">Pressure</dt>
          <dd>{fmt(finding.pressure_kpa, "kPa")}</dd>
        </div>
        <div>
          <dt className="font-medium">Flow</dt>
          <dd>{fmt(finding.flow_cm_s, "cm/s")} ({finding.flow_direction})</dd>
        </div>
        <div>
          <dt className="font-medium">Outcome</dt>
          <dd>{finding.outcome}</dd>
        </div>
      </dl>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <span>{investigation?.name ?? finding.investigation_id}</span>
        <a
          href={finding.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-orange-700 hover:underline dark:text-orange-400"
        >
          View NASA PSI source →
        </a>
      </div>
    </article>
  );
}
