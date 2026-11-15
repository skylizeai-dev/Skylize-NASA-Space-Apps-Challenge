import { GLOSSARY, OUTCOME_META } from "@/lib/format";
import type { Outcome } from "@/lib/schema";

// One shape per outcome, so the encoding survives greyscale and colour blindness.
// Drawn in a 12 x 12 box centred on (0, 0).
export function OutcomeShape({ outcome }: { outcome: Outcome }) {
  const color = OUTCOME_META[outcome].color;
  switch (outcome) {
    case "spread":
      return <path d="M0 -5.5 L5.5 4.5 L-5.5 4.5 Z" fill={color} />;
    case "steady":
      return <circle r="4.5" fill={color} />;
    case "extinguished":
      return (
        <path
          d="M-4 -4 L4 4 M4 -4 L-4 4"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    case "no-ignition":
      return <circle r="4" fill="none" stroke={color} strokeWidth="2" />;
    case "cool-flame":
      return <path d="M0 -5.5 L5.5 0 L0 5.5 L-5.5 0 Z" fill={color} />;
  }
}

export function OutcomeIcon({ outcome, size = 12 }: { outcome: Outcome; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-6 -6 12 12" aria-hidden="true" className="shrink-0">
      <OutcomeShape outcome={outcome} />
    </svg>
  );
}

export function OutcomeChip({ outcome }: { outcome: Outcome }) {
  const meta = OUTCOME_META[outcome];
  const tip = GLOSSARY[outcome];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
        tip ? "term no-underline" : ""
      }`}
      style={{ color: meta.color }}
      data-tip={tip}
      tabIndex={tip ? 0 : undefined}
    >
      <OutcomeIcon outcome={outcome} size={10} />
      {meta.label}
    </span>
  );
}
