import { useId } from "react";

// Why the problem exists, in one picture. On Earth buoyancy lifts hot gas and
// stretches a flame into a yellow teardrop. In microgravity there is no
// buoyancy: the flame is round, dimmer and blue.
// This is an illustration. It is not a simulation and not NASA data.
export default function FlameIllustration() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <figure className="flex shrink-0 flex-col items-center">
      <svg
        viewBox="0 0 168 84"
        width="84"
        height="42"
        role="img"
        aria-label="Illustration: a tall yellow teardrop flame on Earth beside a round blue flame in microgravity"
      >
        <defs>
          <radialGradient id={`${uid}-earth`} cx="50%" cy="72%" r="60%">
            <stop offset="0%" stopColor="var(--flame-earth-core)" />
            <stop offset="35%" stopColor="var(--flame-earth-mid)" />
            <stop offset="75%" stopColor="var(--flame-earth-edge)" />
            <stop offset="100%" stopColor="var(--flame-earth-edge)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-micro`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--flame-micro-inner)" stopOpacity="0" />
            <stop offset="45%" stopColor="var(--flame-micro-inner)" stopOpacity="0.55" />
            <stop offset="72%" stopColor="var(--flame-micro-ring)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--flame-micro-ring)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="flame-pulse" style={{ transformOrigin: "42px 62px" }}>
          <path
            d="M42 6 C50 26 62 38 62 52 C62 64 53 72 42 72 C31 72 22 64 22 52 C22 38 34 26 42 6 Z"
            fill={`url(#${uid}-earth)`}
          />
        </g>
        <rect x="40.5" y="70" width="3" height="10" rx="1" fill="var(--color-muted)" />

        <g className="flame-pulse flame-pulse-slow" style={{ transformOrigin: "126px 50px" }}>
          <circle cx="126" cy="50" r="24" fill={`url(#${uid}-micro)`} />
        </g>
        <rect x="124.5" y="48" width="3" height="32" rx="1" fill="var(--color-muted)" />
      </svg>
      <figcaption
        className="flex w-[150px] flex-col text-center text-xs leading-tight text-ink-2"
        title="Illustration, not a simulation or NASA data"
      >
        <span className="grid grid-cols-2">
          <span>Earth</span>
          <span>Microgravity</span>
        </span>
        <span className="text-muted">Illustration, not NASA data</span>
      </figcaption>
    </figure>
  );
}
