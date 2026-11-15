import type { ScoredFinding } from "@/lib/schema";

export interface Implication {
  implication: string;
  evidence: string;
  ids: string[];
}

interface Props {
  // Precomputed for a preset; undefined for a custom atmosphere.
  items: Implication[] | undefined;
  top: ScoredFinding[];
  onCite: (id: string) => void;
}

// AI-written text always carries the same signal: violet left border plus label.
export default function Implications({ items, top, onCite }: Props) {
  // Guardrail: a bullet survives only if every id it cites is in the ranked evidence on screen.
  const topIds = new Set(top.map((f) => f.id));
  const valid = (items ?? []).filter(
    (item) => item.ids.length > 0 && item.ids.every((id) => topIds.has(id))
  );
  const cited = new Set(valid.flatMap((item) => item.ids));

  return (
    <section
      aria-label="Safety implications"
      className="flex flex-col gap-3 rounded-lg border border-l-2 border-line border-l-ai bg-surface p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Safety implications</h2>
        {cited.size >= 3 && (
          <p className="text-xs text-ai">
            AI-generated from NASA PSI records. Based on {cited.size} source-checked findings.
          </p>
        )}
      </div>

      {!items ? (
        <p className="text-sm text-ink-2">
          Implications are written in advance for the two preset atmospheres. For a custom
          atmosphere, read the ranked evidence below: it is the same evidence an implication
          would be written from.
        </p>
      ) : cited.size < 3 ? (
        <p className="text-sm text-ink-2">Insufficient evidence for implications.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {valid.map((item) => (
            <li key={item.implication} className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">{item.implication}</p>
              <p className="text-ink-2">
                {item.evidence}{" "}
                {item.ids.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onCite(id)}
                    className="num mr-1 rounded border border-line bg-bg px-1.5 text-xs text-accent hover:bg-surface-2"
                  >
                    {id}
                  </button>
                ))}
                <span className="text-xs text-muted">
                  {item.ids.length} supporting {item.ids.length === 1 ? "record" : "records"}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
