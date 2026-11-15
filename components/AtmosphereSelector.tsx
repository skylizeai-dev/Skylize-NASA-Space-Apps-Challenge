"use client";

import { useId, useState } from "react";
import { DOMAIN } from "@/lib/coverage";
import { FLOW_LABEL, KPA_TO_PSI, fmtNum } from "@/lib/format";
import { clamp, type ViewState } from "@/lib/url";
import type { Atmosphere, FlowDirection, Preset } from "@/lib/schema";

interface Props {
  presets: Preset[];
  view: ViewState;
  activePresetId: string;
  onAtmosphere: (atmosphere: Atmosphere) => void;
  onFilters: (filters: Pick<ViewState, "direction" | "fuel">) => void;
}

const DIRECTIONS: FlowDirection[] = ["opposed", "concurrent", "quiescent", "unknown"];

export default function AtmosphereSelector({
  presets,
  view,
  activePresetId,
  onAtmosphere,
  onFilters,
}: Props) {
  const [psi, setPsi] = useState(false);
  const { atmosphere } = view;

  return (
    <section
      aria-label="Atmosphere"
      className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Atmosphere</h2>
        <div className="flex flex-col gap-2">
          {presets.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onAtmosphere({
                    oxygen_pct: preset.oxygen_pct,
                    pressure_kpa: preset.pressure_kpa,
                    flow_cm_s: preset.flow_cm_s,
                  })
                }
                title={preset.description}
                className={`flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-line bg-bg hover:bg-surface-2"
                }`}
              >
                <span className={`font-semibold ${active ? "text-accent" : "text-ink"}`}>
                  {preset.label}
                </span>
                <span className="tnum text-xs text-ink-2">
                  {fmtNum(preset.oxygen_pct)} % O₂, {fmtNum(preset.pressure_kpa)} kPa
                </span>
              </button>
            );
          })}
          <p
            className={`rounded-md border border-dashed px-3 py-2 text-xs ${
              activePresetId === "custom"
                ? "border-accent text-accent"
                : "border-line text-muted"
            }`}
          >
            {activePresetId === "custom"
              ? "Custom atmosphere. Evidence re-ranks as you move a slider."
              : "Move a slider to set a custom atmosphere."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Field
          label="Oxygen"
          unit="% O₂"
          range={DOMAIN.oxygen_pct}
          step={0.5}
          value={atmosphere.oxygen_pct}
          hint="Limited to 10 to 40 %. The lowest oxygen level tested in this dataset is 15 %, and planned exploration atmospheres sit near 34 %."
          onChange={(oxygen_pct) => onAtmosphere({ ...atmosphere, oxygen_pct })}
        />
        <Field
          label="Pressure"
          unit={psi ? "psi" : "kPa"}
          range={DOMAIN.pressure_kpa}
          step={0.5}
          scale={psi ? KPA_TO_PSI : 1}
          value={atmosphere.pressure_kpa}
          hint="Limited to 30 to 110 kPa. Sea level is about 101 kPa. The flight tests in this dataset span 54 to 101 kPa."
          onChange={(pressure_kpa) => onAtmosphere({ ...atmosphere, pressure_kpa })}
          action={
            <button
              type="button"
              onClick={() => setPsi(!psi)}
              className="rounded border border-line px-1.5 text-xs text-ink-2 hover:text-ink"
            >
              Show {psi ? "kPa" : "psi"}
            </button>
          }
        />
        <Field
          label="Airflow"
          unit="cm/s"
          range={DOMAIN.flow_cm_s}
          step={1}
          value={atmosphere.flow_cm_s}
          hint="Limited to 0 to 50 cm/s. 0 means still air. Reported flows in this dataset run from 0 to 20 cm/s."
          onChange={(flow_cm_s) => onAtmosphere({ ...atmosphere, flow_cm_s })}
        />
      </div>

      {view.expert && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-sm font-semibold">Filter evidence</h3>
          <Select
            label="Flow direction"
            value={view.direction}
            options={DIRECTIONS.map((d) => [d, FLOW_LABEL[d]])}
            onChange={(direction) =>
              onFilters({ direction: direction as FlowDirection | "any", fuel: view.fuel })
            }
          />
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  unit,
  range,
  step,
  value,
  scale = 1,
  hint,
  action,
  onChange,
}: {
  label: string;
  unit: string;
  range: { min: number; max: number };
  step: number;
  value: number;
  scale?: number;
  hint: string;
  action?: React.ReactNode;
  onChange: (value: number) => void;
}) {
  const id = `${useId()}-${label.toLowerCase()}`;
  const shown = Number((value * scale).toFixed(scale === 1 ? 1 : 2));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-semibold">
          <span className="term" data-tip={hint} tabIndex={0}>
            {label}
          </span>
        </label>
        <div className="flex items-center gap-2">
          {action}
          <input
            type="number"
            aria-label={`${label} in ${unit}`}
            value={shown}
            step={Number((step * scale).toFixed(3))}
            min={Number((range.min * scale).toFixed(2))}
            max={Number((range.max * scale).toFixed(2))}
            onChange={(e) => {
              const next = Number(e.target.value) / scale;
              if (e.target.value !== "" && Number.isFinite(next)) {
                onChange(clamp(Number(next.toFixed(1)), range.min, range.max));
              }
            }}
            className="num w-16 rounded border border-line bg-bg px-2 py-1 text-right text-sm text-ink"
          />
          <span className="w-9 text-xs text-ink-2">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="num flex justify-between text-xs text-muted">
        <span>{fmtNum(Number((range.min * scale).toFixed(1)))}</span>
        <span>{fmtNum(Number((range.max * scale).toFixed(1)))}</span>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-ink-2">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-40 rounded border border-line bg-bg px-2 py-1 text-ink"
      >
        <option value="any">Any</option>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text.charAt(0).toUpperCase() + text.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
