"use client";

import type { Atmosphere, Preset } from "@/lib/schema";

interface Props {
  presets: Preset[];
  value: Atmosphere;
  activePresetId: string;
  onChange: (atmosphere: Atmosphere, presetId: string) => void;
}

export default function AtmosphereSelector({
  presets,
  value,
  activePresetId,
  onChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() =>
              onChange(
                {
                  oxygen_pct: preset.oxygen_pct,
                  pressure_kpa: preset.pressure_kpa,
                  flow_cm_s: preset.flow_cm_s,
                },
                preset.id
              )
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activePresetId === preset.id
                ? "bg-orange-600 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SliderField
          label="Oxygen"
          unit="%"
          min={0}
          max={70}
          step={1}
          value={value.oxygen_pct}
          onChange={(oxygen_pct) => onChange({ ...value, oxygen_pct }, "custom")}
        />
        <SliderField
          label="Pressure"
          unit="kPa"
          min={0}
          max={101}
          step={1}
          value={value.pressure_kpa}
          onChange={(pressure_kpa) => onChange({ ...value, pressure_kpa }, "custom")}
        />
        <SliderField
          label="Airflow"
          unit="cm/s"
          min={0}
          max={50}
          step={1}
          value={value.flow_cm_s}
          onChange={(flow_cm_s) => onChange({ ...value, flow_cm_s }, "custom")}
        />
      </div>
    </div>
  );
}

function SliderField({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-200">
        {label}: {value} {unit}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-orange-600"
      />
    </label>
  );
}
