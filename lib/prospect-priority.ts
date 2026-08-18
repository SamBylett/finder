// Prospect Priority — a derived RANKING for sorting, not a replacement for
// Opportunity Score / Demo Potential / Data Richness / Outreach Readiness,
// which stay visible and distinct. OutreachReadiness is deliberately a
// dampening MULTIPLIER here, never an additive term — per spec, a bad
// business with an email must not outrank an excellent business with a
// slightly weaker contact route. It can only reduce priority for hard-to-
// reach prospects, never inflate a weak one above a strong one.

import type { Business } from "./types";
import { computeOutreachReadiness, type OutreachTier } from "./outreach";

const OUTREACH_MULTIPLIER: Record<OutreachTier, number> = {
  HIGH: 1.0,
  GOOD: 0.92,
  LIMITED: 0.78,
  POOR: 0.55,
};

export interface ProspectPriorityBreakdownLine {
  label: string;
  value: number;
}

export interface ProspectPriority {
  score: number; // 0-100
  breakdown: ProspectPriorityBreakdownLine[];
}

// dataRichnessScore is only known once a Lovable brief has been built for
// this business (it's computed by the demo profile pipeline, not at search
// time) — until then it falls back to demo_potential_score again, which
// keeps the formula meaningful (effectively 50/50 opportunity/demo-potential)
// without inventing a number. Passed in explicitly rather than looked up
// here so this stays a pure, cheap, computed-on-read function like every
// other score in this codebase.
export function calculateProspectPriority(business: Business, dataRichnessScore?: number): ProspectPriority {
  const outreach = computeOutreachReadiness(business);
  const richness = dataRichnessScore ?? business.demo_potential_score;

  const commercial =
    0.5 * business.opportunity_score +
    0.3 * business.demo_potential_score +
    0.2 * richness;

  const multiplier = OUTREACH_MULTIPLIER[outreach.tier];
  const score = Math.round(Math.max(0, Math.min(100, commercial)) * multiplier);

  return {
    score,
    breakdown: [
      { label: "Opportunity Score (50%)", value: business.opportunity_score },
      { label: "Demo Potential (30%)", value: business.demo_potential_score },
      { label: dataRichnessScore !== undefined ? "Data Richness (20%)" : "Data Richness (20%, approximated)", value: richness },
      { label: `Outreach multiplier (${outreach.tier})`, value: multiplier },
    ],
  };
}
