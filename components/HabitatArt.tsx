// Flat drawings for the two habitat choices. The live 3D scene opens only
// after a choice, so the first screen stays light to load.

export function CabinArt() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <rect x="20" y="20" width="280" height="110" rx="55" fill="rgb(255 255 255 / 0.7)" stroke="var(--color-ink-2)" strokeWidth="1.5" />
      <rect x="12" y="55" width="12" height="40" rx="3" fill="var(--color-muted)" />
      <rect x="296" y="55" width="12" height="40" rx="3" fill="var(--color-muted)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={62 + i * 40} y="32" width="36" height="26" rx="2" fill="var(--color-ramp-1)" stroke="var(--color-line)" />
          <rect x={62 + i * 40} y="92" width="36" height="26" rx="2" fill="var(--color-ramp-1)" stroke="var(--color-line)" />
          <rect x={68 + i * 40} y="40" width="14" height="3" fill="var(--color-accent)" opacity="0.6" />
        </g>
      ))}
      <circle cx="160" cy="75" r="13" fill="none" stroke="var(--flame-micro-ring)" strokeWidth="5" opacity="0.75" />
      <rect x="155" y="70" width="10" height="10" rx="1.5" fill="#ffffff" stroke="var(--color-ink-2)" />
    </svg>
  );
}

export function DomeArt() {
  return (
    <svg viewBox="0 0 320 150" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="dome-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8a5f47" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e2b48f" stopOpacity="0.75" />
        </linearGradient>
        <clipPath id="dome-clip">
          <path d="M70 118 A90 90 0 0 1 250 118 Z" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width="320" height="150" rx="10" fill="url(#dome-sky)" />
      <path d="M0 122 Q60 108 120 120 T240 116 T320 120 V150 H0 Z" fill="#b8663c" />
      <path d="M0 132 Q80 122 170 132 T320 128 V150 H0 Z" fill="#a3542e" />
      {/* modules under the dome */}
      <g fill="#f1f3f5" stroke="#9aa1a8">
        <path d="M128 118 V98 A22 22 0 0 1 172 98 V118 Z" />
        <path d="M92 118 V104 A15 15 0 0 1 122 104 V118 Z" />
        <path d="M180 118 V102 A17 17 0 0 1 214 102 V118 Z" />
      </g>
      {/* dome */}
      <path d="M70 118 A90 90 0 0 1 250 118 Z" fill="rgb(255 255 255 / 0.22)" stroke="#d8dde2" strokeWidth="2" />
      <g clipPath="url(#dome-clip)" stroke="#d8dde2" strokeWidth="1" fill="none" opacity="0.9">
        {[-60, -30, 0, 30, 60].map((dx) => (
          <path key={dx} d={`M${160 + dx} 28 L${160 + dx * 1.35} 118`} />
        ))}
        <path d="M82 92 H238 M100 64 H220 M126 42 H194" />
      </g>
      <rect x="62" y="116" width="196" height="5" rx="2" fill="#9aa0a6" />
      {/* outer module and link */}
      <path d="M22 121 V110 A13 13 0 0 1 48 110 V121 Z" fill="#f1f3f5" stroke="#9aa1a8" />
      <rect x="48" y="112" width="16" height="6" fill="#dfe3e7" stroke="#9aa1a8" />
      <circle cx="196" cy="100" r="7" fill="none" stroke="var(--flame-micro-ring)" strokeWidth="3" opacity="0.85" />
    </svg>
  );
}
