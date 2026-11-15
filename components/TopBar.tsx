"use client";

import Link from "next/link";
import { useState } from "react";
import { APP_NAME } from "@/lib/config";

interface Props {
  expert?: boolean;
  onExpert?: (expert: boolean) => void;
}

// The mark is a microgravity flame: round and blue, because without buoyancy
// there is no teardrop and little soot.
export function FlameMark() {
  return (
    <span
      aria-hidden="true"
      className="block h-5 w-5 rounded-full"
      style={{
        background:
          "radial-gradient(circle at 50% 55%, #E6EAF2 0 12%, #4CC9F0 38%, #2A6F8F 62%, transparent 72%)",
      }}
    />
  );
}

export default function TopBar({ expert, onExpert }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", window.location.href);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold">
          <FlameMark />
          {APP_NAME}
        </Link>
        <p className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">
          Evidence tool, not a safety certification
        </p>
        <nav className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {onExpert && (
            <div
              role="group"
              aria-label="Detail level"
              className="flex rounded-md border border-line p-0.5 text-xs"
            >
              {[false, true].map((mode) => (
                <button
                  key={String(mode)}
                  type="button"
                  aria-pressed={expert === mode}
                  onClick={() => onExpert(mode)}
                  className={`rounded px-2.5 py-1 font-semibold ${
                    expert === mode ? "bg-surface-2 text-accent" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {mode ? "Expert" : "Basic"}
                </button>
              ))}
            </div>
          )}
          {onExpert && (
            <button type="button" onClick={copyLink} className="text-ink-2 hover:text-ink">
              <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
            </button>
          )}
          <Link href="/method" className="text-ink-2 hover:text-ink">
            Method
          </Link>
          <Link href="/method#data" className="text-ink-2 hover:text-ink">
            Data
          </Link>
        </nav>
      </div>
    </header>
  );
}
