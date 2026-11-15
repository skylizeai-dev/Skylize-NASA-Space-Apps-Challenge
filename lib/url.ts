// View state lives in the URL so any view can be shared and reopened.
import { DOMAIN } from "./coverage";
import type { FuelGroup } from "./format";
import type { Atmosphere, FlowDirection } from "./schema";

export interface ViewState {
  atmosphere: Atmosphere;
  expert: boolean;
  direction: FlowDirection | "any";
  fuel: FuelGroup | "any";
}

const DIRECTIONS = ["opposed", "concurrent", "quiescent", "unknown"];
const FUELS = ["plastic", "fabric", "liquid", "gas", "other"];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(
  params: URLSearchParams,
  key: string,
  fallback: number,
  range: { min: number; max: number }
): number {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp(value, range.min, range.max) : fallback;
}

export function parseView(params: URLSearchParams, fallback: Atmosphere): ViewState {
  const direction = params.get("dir") ?? "";
  const fuel = params.get("fuel") ?? "";
  return {
    atmosphere: {
      oxygen_pct: readNumber(params, "o2", fallback.oxygen_pct, DOMAIN.oxygen_pct),
      pressure_kpa: readNumber(params, "p", fallback.pressure_kpa, DOMAIN.pressure_kpa),
      flow_cm_s: readNumber(params, "flow", fallback.flow_cm_s, DOMAIN.flow_cm_s),
    },
    expert: params.get("mode") === "expert",
    direction: DIRECTIONS.includes(direction) ? (direction as FlowDirection) : "any",
    fuel: FUELS.includes(fuel) ? (fuel as FuelGroup) : "any",
  };
}

export function serializeView(view: ViewState): string {
  const params = new URLSearchParams();
  params.set("o2", String(view.atmosphere.oxygen_pct));
  params.set("p", String(view.atmosphere.pressure_kpa));
  params.set("flow", String(view.atmosphere.flow_cm_s));
  if (view.expert) params.set("mode", "expert");
  if (view.expert && view.direction !== "any") params.set("dir", view.direction);
  if (view.expert && view.fuel !== "any") params.set("fuel", view.fuel);
  return params.toString();
}
