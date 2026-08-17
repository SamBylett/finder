// Demo Potential score: how suitable a business is for producing a
// visually impressive speculative demo site. Deterministic and explainable,
// same shape as lib/scoring.ts's Opportunity Score — the two scores measure
// different things and must not be conflated. AI never assigns this number.

import type { Business } from "@/lib/types";
import type { DemoPotentialTier } from "./types";
import { resolveIndustryFamily } from "./industry";

export interface DemoPotentialBreakdownLine {
  label: string;
  points: number;
}

export interface DemoPotentialResult {
  score: number; // 0-100
  tier: DemoPotentialTier;
  breakdown: DemoPotentialBreakdownLine[];
}

const MAX_RAW = 100;

export function calculateDemoPotential(business: Business): DemoPotentialResult {
  const breakdown: DemoPotentialBreakdownLine[] = [];
  let raw = 0;

  // --- Positive signals --------------------------------------------------
  if (business.google_rating !== null && business.google_rating >= 4.5) {
    raw += 15;
    breakdown.push({ label: "Strong Google rating (4.5+)", points: 15 });
  } else if (business.google_rating !== null && business.google_rating >= 4.0) {
    raw += 8;
    breakdown.push({ label: "Good Google rating (4.0-4.49)", points: 8 });
  }

  if (business.google_review_count >= 100) {
    raw += 15;
    breakdown.push({ label: "100+ reviews (credible social proof)", points: 15 });
  } else if (business.google_review_count >= 30) {
    raw += 10;
    breakdown.push({ label: "30-99 reviews", points: 10 });
  } else if (business.google_review_count >= 10) {
    raw += 5;
    breakdown.push({ label: "10-29 reviews", points: 5 });
  }

  if (business.phone) {
    raw += 8;
    breakdown.push({ label: "Phone number available", points: 8 });
  }
  if (business.email) {
    raw += 7;
    breakdown.push({ label: "Email/contact route available", points: 7 });
  }

  const visualIndustries = new Set(["trades", "outdoor", "automotive"]);
  const industryFamily = resolveIndustryFamily(business.category, business.business_name);
  if (visualIndustries.has(industryFamily)) {
    raw += 15;
    breakdown.push({ label: "Visual industry (photographs well)", points: 15 });
  } else {
    raw += 5;
    breakdown.push({ label: "Local service business", points: 5 });
  }

  if (business.town_city) {
    raw += 5;
    breakdown.push({ label: "Clear service area", points: 5 });
  }

  // Strong reputation but weak website is the ideal demo candidate.
  const weakWebsite = business.website_status === "no_website" || business.website_status === "weak_website" ||
    business.website_status === "broken_website" || business.website_status === "social_only";
  const strongReputation = (business.google_rating ?? 0) >= 4.3 && business.google_review_count >= 15;
  if (weakWebsite && strongReputation) {
    raw += 20;
    breakdown.push({ label: "Strong reputation but weak/no website", points: 20 });
  }

  // --- Negative signals ----------------------------------------------------
  if (!business.phone && !business.email) {
    raw -= 20;
    breakdown.push({ label: "Almost no usable contact information", points: -20 });
  }
  if (business.google_rating !== null && business.google_rating < 3.5) {
    raw -= 20;
    breakdown.push({ label: "Poor Google rating", points: -20 });
  }
  if (business.website_status === "strong_website") {
    raw -= 25;
    breakdown.push({ label: "Already has an excellent website", points: -25 });
  }
  if (business.google_review_count < 3) {
    raw -= 10;
    breakdown.push({ label: "Very few reviews — unclear reputation", points: -10 });
  }

  const score = Math.max(0, Math.min(100, Math.round((raw / MAX_RAW) * 100)));

  return { score, tier: tierForDemoPotential(score), breakdown };
}

export function tierForDemoPotential(score: number): DemoPotentialTier {
  if (score >= 80) return "EXCELLENT DEMO";
  if (score >= 60) return "GOOD DEMO";
  if (score >= 40) return "POSSIBLE";
  return "LOW VALUE";
}
