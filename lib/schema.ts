// Types for FlameSight data — mirrors plan.md section 4.
// A finding's numeric condition fields are `number | null`: null beats a guess.

export type SafetyRelevance = 1 | 2 | 3;

// "unknown" when the source does not state the direction — never guessed.
export type FlowDirection = "opposed" | "concurrent" | "quiescent" | "unknown";

export type Outcome =
  | "spread"
  | "steady"
  | "extinguished"
  | "no-ignition"
  | "cool-flame";

export interface Publication {
  title: string;
  year: number;
  url: string;
}

export interface Investigation {
  id: string;
  name: string;
  category: string;
  platform: string;
  facility: string;
  years: string;
  objective: string;
  ai_summary: string;
  psi_url: string;
  publications: Publication[];
}

export interface Finding {
  id: string;
  investigation_id: string;
  fuel: string;
  fuel_form: string;
  oxygen_pct: number | null;
  pressure_kpa: number | null;
  flow_cm_s: number | null;
  flow_direction: FlowDirection;
  outcome: Outcome;
  finding: string;
  safety_relevance: SafetyRelevance;
  source_url: string;
  source_quote_location: string;
  // Every value was checked against the cited source (AI-assisted). This gates display.
  source_checked: boolean;
  // Independent human review. Kept separate so the UI never overstates the review level.
  verified_by_human: boolean;
}

export interface Atmosphere {
  oxygen_pct: number;
  pressure_kpa: number;
  flow_cm_s: number;
}

export interface Preset extends Atmosphere {
  id: string;
  label: string;
  description: string;
}

export interface ScoredFinding extends Finding {
  score: number;
  closeness: number;
  completeness: number;
}
