"use client";

import { useEffect, useRef } from "react";
import { FLOW_LABEL, fmtNum } from "@/lib/format";
import type { Investigation, ScoredFinding } from "@/lib/schema";
import { OutcomeChip } from "./Outcome";

interface Props {
  finding: ScoredFinding | null;
  investigation?: Investigation;
  onClose: () => void;
}

// Third layer of disclosure: where each number came from and how it was checked.
export default function VerifyDrawer({ finding, investigation, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (finding && !dialog.open) dialog.showModal();
    if (!finding && dialog.open) dialog.close();
  }, [finding]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label="Verify this finding"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {finding && (
        <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="num text-xs text-ink-2">{finding.id}</p>
              <h2 className="text-xl leading-snug font-semibold">Verify this finding</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-line px-2.5 py-1 text-sm text-ink-2 hover:text-ink"
            >
              Close
            </button>
          </div>

          <p className="text-sm">{finding.finding}</p>

          <dl className="tnum grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <Row label="Fuel" value={`${finding.fuel}, ${finding.fuel_form}`} />
            <Row label="Oxygen" value={finding.oxygen_pct} unit="% O₂" />
            <Row label="Pressure" value={finding.pressure_kpa} unit="kPa" />
            <Row label="Airflow" value={finding.flow_cm_s} unit="cm/s" />
            <Row
              label="Direction"
              value={finding.flow_direction === "unknown" ? null : FLOW_LABEL[finding.flow_direction]}
            />
            <dt className="text-ink-2">Outcome</dt>
            <dd>
              <OutcomeChip outcome={finding.outcome} />
            </dd>
          </dl>

          <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
            <h3 className="text-sm font-semibold">Where to check it</h3>
            <p className="text-sm text-ink-2">
              Look in:{" "}
              <span className="text-ink">{finding.source_quote_location}</span>
            </p>
            <a
              href={finding.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit rounded bg-action px-3 py-1.5 text-sm font-semibold text-bg"
            >
              Open the source document
            </a>
            <p className="text-xs break-all text-muted">{finding.source_url}</p>
          </section>

          <section className="flex flex-col gap-2 text-sm">
            <h3 className="font-semibold">Review status</h3>
            <p className="flex items-start gap-2 text-ink-2">
              <span className="mt-0.5 text-extinguished" aria-hidden="true">
                ✓
              </span>
              <span>
                <span className="text-ink">Source-checked.</span> Every value was compared with
                the cited document. This check was AI-assisted.
              </span>
            </p>
            <p className="flex items-start gap-2 text-ink-2">
              <span className="mt-0.5" aria-hidden="true">
                {finding.verified_by_human ? "✓" : "○"}
              </span>
              <span>
                <span className="text-ink">
                  {finding.verified_by_human
                    ? "Independently reviewed by a person."
                    : "Independent human review: not yet done."}
                </span>
              </span>
            </p>
          </section>

          {investigation && (
            <section className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <h3 className="font-semibold">{investigation.name}</h3>
              <p className="text-xs text-ink-2">
                {investigation.platform}, {investigation.facility}, {investigation.years}
              </p>
              <p className="text-ink-2">{investigation.objective}</p>
              <div className="border-l-2 border-ai pl-3">
                <p className="text-xs text-ai">AI-generated from this dataset&apos;s NASA records</p>
                <p className="text-ink-2">{investigation.ai_summary}</p>
              </div>
              <a
                href={investigation.psi_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit text-accent hover:underline"
              >
                Open the investigation record
              </a>
              {investigation.publications.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {investigation.publications.map((pub) => (
                    <li key={pub.url} className="text-xs">
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {pub.title}
                      </a>{" "}
                      <span className="num text-muted">{pub.year}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </dialog>
  );
}

function Row({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string | null;
  unit?: string;
}) {
  return (
    <>
      <dt className="text-ink-2">{label}</dt>
      {value === null ? (
        <dd className="text-muted">not reported</dd>
      ) : (
        <dd>
          {typeof value === "number" ? fmtNum(value) : value} {unit}
        </dd>
      )}
    </>
  );
}
