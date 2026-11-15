"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { DOMAIN, coverageAt, plottable, type Coverage } from "@/lib/coverage";
import { FUEL_GROUP_LABEL, fmtNum, type FuelGroup } from "@/lib/format";
import { clamp } from "@/lib/url";
import type { Atmosphere, Finding, Preset } from "@/lib/schema";
import { StatusPill, coverageHeadline } from "./AnswerStrip";
import CabinScene, { type Environment, type SetupStep } from "./CabinScene";
import { CabinArt, DomeArt } from "./HabitatArt";

interface Props {
  presets: Preset[];
  atmosphere: Atmosphere;
  material: FuelGroup | "any";
  findings: Finding[];
  fuelCounts: Map<FuelGroup, number>;
  coverage: Coverage;
  onAtmosphere: (atmosphere: Atmosphere) => void;
  onMaterial: (material: FuelGroup | "any") => void;
  onFinish: () => void;
}

const STEPS: { id: SetupStep; title: string; question: string }[] = [
  { id: "habitat", title: "Habitat", question: "Where would the fire start?" },
  { id: "oxygen", title: "Oxygen", question: "How much oxygen is in the cabin air?" },
  { id: "pressure", title: "Pressure", question: "What is the cabin pressure?" },
  { id: "airflow", title: "Airflow", question: "How fast does the air move around the fire?" },
  { id: "material", title: "Material", question: "What is burning?" },
  { id: "review", title: "Review", question: "Is this the environment you want to test?" },
];

const FUELS = Object.keys(FUEL_GROUP_LABEL) as FuelGroup[];

const EXPLORATION = "exploration-atmosphere";
const HABITAT_COPY: Record<string, { body: string; enter: string }> = {
  "iss-cabin": {
    body: "A space station module in orbit. The air is close to air at sea level.",
    enter: "Enter the ISS cabin",
  },
  [EXPLORATION]: {
    body: "A surface base for the Moon or Mars, with richer oxygen at lower pressure than the space station.",
    enter: "Enter the exploration habitat",
  },
};

// The user builds the environment to test one question at a time, in order.
// Step 1 is a full-screen choice of habitat. After that the 3D environment is
// the main stage and each question sits beside it. Values apply live.
export default function SetupWizard({
  presets,
  atmosphere,
  material,
  findings,
  fuelCounts,
  coverage,
  onAtmosphere,
  onMaterial,
  onFinish,
}: Props) {
  const [index, setIndex] = useState(0);
  const [habitat, setHabitat] = useState<string>(() => matchPreset(presets, atmosphere));
  const [direction, setDirection] = useState(1);
  const step = STEPS[index];
  const environment: Environment = habitat === EXPLORATION ? "habitat" : "cabin";

  // Reference marks come from the dataset itself, so every number shown is traceable.
  const ranges = useMemo(() => {
    const placed = plottable(findings);
    const oxygen = findings.flatMap((f) => (f.source_checked && f.oxygen_pct !== null ? [f.oxygen_pct] : []));
    const flows = findings.flatMap((f) => (f.source_checked && f.flow_cm_s !== null ? [f.flow_cm_s] : []));
    const pressures = placed.map((f) => f.pressure_kpa as number);
    return {
      oxygen: [Math.min(...oxygen), Math.max(...oxygen)],
      pressure: [Math.min(...pressures), Math.max(...pressures)],
      flow: [Math.min(...flows), Math.max(...flows)],
    };
  }, [findings]);

  const iss = presets.find((p) => p.id === "iss-cabin");
  const exploration = presets.find((p) => p.id === EXPLORATION);

  function go(next: number) {
    setDirection(next > index ? 1 : -1);
    setIndex(clamp(next, 0, STEPS.length - 1));
  }

  function enterHabitat(id: string) {
    setHabitat(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      onAtmosphere({
        oxygen_pct: preset.oxygen_pct,
        pressure_kpa: preset.pressure_kpa,
        flow_cm_s: preset.flow_cm_s,
      });
    }
    go(1);
  }

  /* ---------------- Step 1: full-screen habitat choice ---------------- */
  if (step.id === "habitat") {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-84px)] w-full max-w-[1200px] flex-col justify-center gap-4">
        <header className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-ink-2">Step 1 of {STEPS.length}</p>
          <h1 className="text-[28px] leading-tight font-semibold">Where would the fire start?</h1>
          <p className="max-w-[72ch] text-sm text-ink-2">
            Choose a habitat to step inside. Next you set its oxygen, pressure, airflow and the
            burning material, then see how much NASA microgravity fire evidence exists for it.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {presets.map((preset) => {
            const copy = HABITAT_COPY[preset.id];
            const cov = coverageAt(preset.oxygen_pct, preset.pressure_kpa, findings);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => enterHabitat(preset.id)}
                className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-accent"
              >
                <span
                  className="block w-full overflow-hidden rounded-md border border-line bg-bg"
                  style={{ height: "clamp(120px, calc(100dvh - 500px), 300px)" }}
                >
                  {preset.id === EXPLORATION ? <DomeArt /> : <CabinArt />}
                </span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-xl font-semibold">{preset.label}</span>
                  <span className="tnum text-sm text-ink-2">
                    {fmtNum(preset.oxygen_pct)} % O₂, {fmtNum(preset.pressure_kpa)} kPa
                  </span>
                </span>
                <span className="text-sm text-ink-2">{copy?.body ?? preset.description}</span>
                <span className="flex items-center gap-2 text-xs text-ink">
                  <StatusPill status={cov.status} small />
                  {coverageHeadline(cov)}
                </span>
                <span className="mt-auto w-fit rounded-md border border-accent bg-accent px-4 py-1.5 text-sm font-semibold text-white">
                  {copy?.enter ?? "Enter this habitat"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setHabitat("custom");
              go(1);
            }}
            className="text-accent underline underline-offset-2"
          >
            Set every value yourself
          </button>
          <button type="button" onClick={onFinish} className="text-accent underline underline-offset-2">
            Skip setup and go to the evidence
          </button>
        </p>
      </div>
    );
  }

  /* ---------------- Steps 2 to 6: question beside the 3D stage ---------------- */
  return (
    <div className="grid grid-cols-1 gap-3 lg:h-[calc(100dvh-84px)] lg:min-h-[520px] lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]">
      <section
        aria-label={`Step ${index + 1} of ${STEPS.length}: ${step.title}`}
        className="flex flex-col gap-3 overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-surface px-4 py-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h1 className="text-sm font-semibold">{habitatLabel(presets, habitat, atmosphere)}</h1>
          <button
            type="button"
            onClick={() => go(0)}
            className="text-xs text-accent underline underline-offset-2"
          >
            Change habitat
          </button>
        </div>

        <ol className="flex flex-wrap gap-1" aria-label="Setup steps">
          {STEPS.map((s, i) => {
            const state = i === index ? "current" : i < index ? "done" : "todo";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  disabled={i > index}
                  aria-current={state === "current" ? "step" : undefined}
                  className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    state === "current"
                      ? "border-accent bg-accent/10 text-accent"
                      : state === "done"
                        ? "border-line bg-bg text-ink hover:bg-surface-2"
                        : "border-line bg-bg text-muted"
                  }`}
                >
                  <span className="num">{i + 1}</span>
                  {s.title}
                </button>
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            initial={{ opacity: 0, x: 14 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 * direction }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-1 flex-col gap-4"
          >
            <header className="flex flex-col gap-0.5">
              <p className="text-xs text-ink-2">
                Step {index + 1} of {STEPS.length}
              </p>
              <h2 className="text-xl leading-snug font-semibold">{step.question}</h2>
            </header>

            {step.id === "oxygen" && (
              <BigSlider
                label="Oxygen"
                unit="% O₂"
                range={DOMAIN.oxygen_pct}
                step={0.5}
                value={atmosphere.oxygen_pct}
                onChange={(oxygen_pct) => onAtmosphere({ ...atmosphere, oxygen_pct })}
                marks={[
                  iss && { value: iss.oxygen_pct, label: "ISS cabin" },
                  exploration && { value: exploration.oxygen_pct, label: "Exploration" },
                ]}
                note={`Findings in this dataset were tested between ${fmtNum(ranges.oxygen[0])} and ${fmtNum(ranges.oxygen[1])} % O₂.`}
              />
            )}

            {step.id === "pressure" && (
              <BigSlider
                label="Pressure"
                unit="kPa"
                range={DOMAIN.pressure_kpa}
                step={0.5}
                value={atmosphere.pressure_kpa}
                onChange={(pressure_kpa) => onAtmosphere({ ...atmosphere, pressure_kpa })}
                marks={[
                  iss && { value: iss.pressure_kpa, label: "ISS cabin" },
                  exploration && { value: exploration.pressure_kpa, label: "Exploration" },
                ]}
                note={`Air at sea level is about 101 kPa. Flight tests in this dataset that report pressure ran between ${fmtNum(ranges.pressure[0])} and ${fmtNum(ranges.pressure[1])} kPa.`}
              />
            )}

            {step.id === "airflow" && (
              <BigSlider
                label="Airflow"
                unit="cm/s"
                range={DOMAIN.flow_cm_s}
                step={1}
                value={atmosphere.flow_cm_s}
                onChange={(flow_cm_s) => onAtmosphere({ ...atmosphere, flow_cm_s })}
                marks={[{ value: 0, label: "Still air" }]}
                note={`Without gravity, hot gas does not rise, so ventilation is what feeds a fire fresh oxygen. Reported flows in this dataset run from ${fmtNum(ranges.flow[0])} to ${fmtNum(ranges.flow[1])} cm/s.`}
              />
            )}

            {step.id === "material" && (
              <div role="radiogroup" aria-label="Material" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Choice
                  selected={material === "any"}
                  onSelect={() => onMaterial("any")}
                  title="Any material"
                  meta={`${Array.from(fuelCounts.values()).reduce((a, b) => a + b, 0)} findings`}
                />
                {FUELS.filter((fuel) => fuelCounts.has(fuel)).map((fuel) => (
                  <Choice
                    key={fuel}
                    selected={material === fuel}
                    onSelect={() => onMaterial(fuel)}
                    title={FUEL_GROUP_LABEL[fuel]}
                    meta={`${fuelCounts.get(fuel)} findings`}
                  />
                ))}
              </div>
            )}

            {step.id === "review" && (
              <div className="flex flex-col gap-3">
                <dl className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 gap-y-2 text-sm">
                  <ReviewRow
                    label="Habitat"
                    value={habitatLabel(presets, habitat, atmosphere)}
                    onEdit={() => go(0)}
                  />
                  <ReviewRow label="Oxygen" value={`${fmtNum(atmosphere.oxygen_pct)} % O₂`} onEdit={() => go(1)} />
                  <ReviewRow label="Pressure" value={`${fmtNum(atmosphere.pressure_kpa)} kPa`} onEdit={() => go(2)} />
                  <ReviewRow label="Airflow" value={`${fmtNum(atmosphere.flow_cm_s)} cm/s`} onEdit={() => go(3)} />
                  <ReviewRow
                    label="Material"
                    value={material === "any" ? "Any material" : FUEL_GROUP_LABEL[material]}
                    onEdit={() => go(4)}
                  />
                </dl>
                {material !== "any" && (
                  <p className="text-xs text-ink-2">
                    The evidence list will show {FUEL_GROUP_LABEL[material].toLowerCase()} findings
                    only. You can clear that filter at any time.
                  </p>
                )}
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="rounded-md border border-line bg-bg px-3 py-1.5 text-sm font-semibold"
              >
                Back
              </button>
              {step.id === "review" ? (
                <button
                  type="button"
                  onClick={onFinish}
                  className="rounded-md bg-action px-4 py-2 text-sm font-semibold text-white"
                >
                  Show the evidence
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="rounded-md border border-accent bg-accent px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Next: {STEPS[index + 1].title}
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={onFinish}
          className="self-start text-xs text-accent underline underline-offset-2"
        >
          Skip setup and go to the evidence
        </button>
      </section>

      <aside
        aria-label="Your environment"
        className="order-first flex min-h-0 flex-col gap-2 rounded-lg border border-line bg-surface p-2 lg:order-none"
      >
        <div className="relative h-[46vh] min-h-[240px] overflow-hidden rounded-md lg:h-auto lg:flex-1">
          <CabinScene
            key={environment}
            environment={environment}
            atmosphere={atmosphere}
            material={material}
            step={step.id}
            onPick={(target) => go(STEPS.findIndex((s) => s.id === target))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 pb-1">
          <div className="tnum flex flex-wrap gap-1.5">
            <Readout label="Oxygen" value={`${fmtNum(atmosphere.oxygen_pct)} %`} active={step.id === "oxygen"} onSelect={() => go(1)} />
            <Readout label="Pressure" value={`${fmtNum(atmosphere.pressure_kpa)} kPa`} active={step.id === "pressure"} onSelect={() => go(2)} />
            <Readout label="Airflow" value={`${fmtNum(atmosphere.flow_cm_s)} cm/s`} active={step.id === "airflow"} onSelect={() => go(3)} />
            <Readout
              label="Material"
              value={material === "any" ? "Any" : FUEL_GROUP_LABEL[material].replace(/ \(.*\)/, "")}
              active={step.id === "material"}
              onSelect={() => go(4)}
            />
          </div>
          <div className="flex min-w-[240px] flex-1 items-center gap-2" aria-live="polite">
            <StatusPill status={coverage.status} small />
            <p className="text-xs text-ink">
              <span className="font-semibold">Evidence near these conditions: </span>
              {coverageHeadline(coverage)}
            </p>
          </div>
          <p className="w-full text-xs text-muted">
            Drag to look around{environment === "habitat" ? ", scroll or use + and − to zoom" : ""}.
            Select the sample, the airflow or the air to change it.
          </p>
        </div>
      </aside>
    </div>
  );
}

function matchPreset(presets: Preset[], atmosphere: Atmosphere): string {
  return (
    presets.find(
      (p) =>
        p.oxygen_pct === atmosphere.oxygen_pct &&
        p.pressure_kpa === atmosphere.pressure_kpa &&
        p.flow_cm_s === atmosphere.flow_cm_s
    )?.id ?? "custom"
  );
}

function habitatLabel(presets: Preset[], id: string, atmosphere: Atmosphere): string {
  const preset = presets.find((p) => p.id === id);
  if (!preset) return "Custom environment";
  return matchPreset(presets, atmosphere) === id ? preset.label : `${preset.label}, adjusted`;
}

function Choice({
  selected,
  onSelect,
  title,
  meta,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-col items-start rounded-md border px-3 py-2 text-left ${
        selected ? "border-accent bg-accent/10" : "border-line bg-bg hover:bg-surface-2"
      }`}
    >
      <span className={`font-semibold ${selected ? "text-accent" : "text-ink"}`}>{title}</span>
      {meta && <span className="tnum text-xs text-ink-2">{meta}</span>}
    </button>
  );
}

type Mark = { value: number; label: string } | undefined | false;

function BigSlider({
  label,
  unit,
  range,
  step,
  value,
  marks,
  note,
  onChange,
}: {
  label: string;
  unit: string;
  range: { min: number; max: number };
  step: number;
  value: number;
  marks: Mark[];
  note: string;
  onChange: (value: number) => void;
}) {
  const at = (v: number) => `${((v - range.min) / (range.max - range.min)) * 100}%`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <input
          type="number"
          aria-label={`${label} in ${unit}`}
          value={value}
          step={step}
          min={range.min}
          max={range.max}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(next)) {
              onChange(clamp(Number(next.toFixed(1)), range.min, range.max));
            }
          }}
          className="num w-28 rounded-md border border-line bg-bg px-3 py-1.5 text-2xl font-semibold text-ink"
        />
        <span className="text-base text-ink-2">{unit}</span>
      </div>
      <div className="relative pb-6">
        <input
          type="range"
          aria-label={label}
          min={range.min}
          max={range.max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {marks
          .filter((m): m is { value: number; label: string } => Boolean(m))
          .map((mark) => (
            <button
              key={mark.label}
              type="button"
              onClick={() => onChange(mark.value)}
              className={`absolute top-6 text-xs whitespace-nowrap text-ink-2 hover:text-accent ${
                mark.value <= range.min ? "" : mark.value >= range.max ? "-translate-x-full" : "-translate-x-1/2"
              }`}
              style={{ left: at(mark.value) }}
              title={`Set to ${fmtNum(mark.value)} ${unit}`}
            >
              <span
                aria-hidden="true"
                className={`mb-0.5 block h-1.5 w-px bg-ink-2 ${mark.value <= range.min ? "" : "mx-auto"}`}
              />
              {mark.label} {fmtNum(mark.value)}
            </button>
          ))}
        <div className="num mt-1 flex justify-between text-xs text-muted">
          <span className={marks.some((m) => m && m.value <= range.min) ? "invisible" : ""}>{range.min}</span>
          <span>{range.max}</span>
        </div>
      </div>
      <p className="max-w-[60ch] text-sm text-ink-2">{note}</p>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className="tnum font-semibold">{value}</dd>
      <dd>
        <button type="button" onClick={onEdit} className="text-xs text-accent hover:underline">
          Edit
        </button>
      </dd>
    </>
  );
}

function Readout({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${label}: ${value}. Change it.`}
      className={`flex min-w-[84px] flex-col items-start rounded-md border px-2.5 py-1 text-left ${
        active ? "border-accent bg-accent/10" : "border-line bg-bg hover:bg-surface-2"
      }`}
    >
      <span className="text-xs text-ink-2">{label}</span>
      <span className={`text-sm font-semibold ${active ? "text-accent" : "text-ink"}`}>{value}</span>
    </button>
  );
}
