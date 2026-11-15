// Shared display vocabulary: names, outcome labels, units, glossary.
import type { Finding, FlowDirection, Outcome } from "./schema";

export const APP_NAME = "FireSight";

export const OUTCOMES: Outcome[] = [
  "spread",
  "steady",
  "extinguished",
  "no-ignition",
  "cool-flame",
];

// Colour is never the only signal: each outcome also has a shape and a label.
export const OUTCOME_META: Record<
  Outcome,
  { label: string; color: string; sentence: string }
> = {
  spread: { label: "Spread", color: "#FF6B5B", sentence: "the flame spread" },
  steady: { label: "Steady", color: "#FFB547", sentence: "the flame burned steadily" },
  extinguished: {
    label: "Extinguished",
    color: "#5DD39E",
    sentence: "the flame went out",
  },
  "no-ignition": {
    label: "No ignition",
    color: "#A3B1C6",
    sentence: "the fuel did not ignite",
  },
  "cool-flame": {
    label: "Cool flame",
    color: "#B69CFF",
    sentence: "a cool flame formed",
  },
};

const INVESTIGATION_LABEL: Record<string, string> = {
  "sofie-mist": "SoFIE-MIST",
  saffire: "Saffire",
};

export function investigationLabel(id: string): string {
  return INVESTIGATION_LABEL[id] ?? id.toUpperCase();
}

export const KPA_TO_PSI = 0.1450377;

export function fmtNum(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

export const FLOW_LABEL: Record<FlowDirection, string> = {
  opposed: "opposed",
  concurrent: "concurrent",
  quiescent: "quiescent",
  unknown: "direction not reported",
};

export const GLOSSARY: Record<string, string> = {
  PMMA: "Polymethyl methacrylate (acrylic). A standard reference plastic in fire research.",
  SIBAL:
    "A cotton and fiberglass blend fabric used as a reference fuel in NASA flame-spread tests.",
  opposed: "Opposed flow: air moves against the direction the flame spreads.",
  concurrent: "Concurrent flow: air moves in the same direction the flame spreads.",
  quiescent: "Quiescent: no forced airflow around the flame.",
  "cool-flame":
    "A low-temperature flame, nearly invisible, that can keep burning after the visible flame goes out.",
  closeness:
    "How near the test conditions were to your atmosphere, from 0 to 1. Averaged over the conditions the source reports.",
  relevance:
    "How directly the finding bears on fire safety: 1.00 for material flammability or extinguishment, 0.67 for detection or flame behaviour, 0.33 for fundamental science.",
  completeness:
    "The share of the three conditions (oxygen, pressure, airflow) that the source reports.",
};

export type FuelGroup = "plastic" | "fabric" | "liquid" | "gas" | "other";

export const FUEL_GROUP_LABEL: Record<FuelGroup, string> = {
  plastic: "Plastic (PMMA)",
  fabric: "Fabric",
  liquid: "Liquid droplets",
  gas: "Gas burner",
  other: "Other solids",
};

export function fuelGroup(finding: Finding): FuelGroup {
  const fuel = finding.fuel.toLowerCase();
  const hasPlastic = fuel.includes("pmma");
  const hasFabric = /cotton|fabric|sibal/.test(fuel);
  if (hasPlastic && !hasFabric) return "plastic";
  if (hasFabric && !hasPlastic) return "fabric";
  if (/heptane|methanol/.test(fuel)) return "liquid";
  if (/ethylene|methane|butane/.test(fuel)) return "gas";
  return "other";
}
