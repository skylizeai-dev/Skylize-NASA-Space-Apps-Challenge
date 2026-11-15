import { buildGapsGrid } from "@/lib/gaps";
import type { Finding } from "@/lib/schema";

interface Props {
  findings: Finding[];
}

const STATUS_STYLE: Record<string, string> = {
  gap: "bg-red-100 dark:bg-red-950",
  thin: "bg-amber-100 dark:bg-amber-950",
  covered: "bg-green-100 dark:bg-green-950",
};

export default function GapsGrid({ findings }: Props) {
  const cells = buildGapsGrid(findings);
  const oxygenBuckets = Array.from(new Set(cells.map((c) => c.oxygenBucket))).sort(
    (a, b) => a - b
  );
  const pressureBuckets = Array.from(new Set(cells.map((c) => c.pressureBucket))).sort(
    (a, b) => a - b
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">
        Evidence coverage — oxygen × pressure
      </h3>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${pressureBuckets.length}, 1fr)` }}
      >
        <div />
        {pressureBuckets.map((p) => (
          <div key={p} className="text-center text-[10px] text-zinc-400">
            {p} kPa
          </div>
        ))}
        {oxygenBuckets.map((o) => (
          <>
            <div key={`label-${o}`} className="pr-2 text-right text-[10px] text-zinc-400">
              {o}% O2
            </div>
            {pressureBuckets.map((p) => {
              const cell = cells.find(
                (c) => c.oxygenBucket === o && c.pressureBucket === p
              );
              return (
                <div
                  key={`${o}-${p}`}
                  title={`${cell?.count ?? 0} verified finding(s)`}
                  className={`aspect-square rounded ${
                    STATUS_STYLE[cell?.status ?? "gap"]
                  }`}
                />
              );
            })}
          </>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-950" /> gap (0)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-100 dark:bg-amber-950" /> thin (1–2)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-green-100 dark:bg-green-950" /> covered (3+)
        </span>
      </div>
    </div>
  );
}
