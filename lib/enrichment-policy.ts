// V2.5 — deterministic gate for FindyMail enrichment. Contact-data
// enrichment costs real credits, so it only ever runs for prospects worth
// the spend: explicit per-business "Enrich Contact" clicks and the batch
// "Enrich Top N" action are both gated through this, never automatic
// during search/discovery.

import type { Business } from "./types";

const ENRICHMENT_SCORE_THRESHOLD = Number(process.env.ENRICHMENT_SCORE_THRESHOLD) || 65;

export interface EnrichmentEligibility {
  eligible: boolean;
  reason: string;
}

export function isEnrichmentEligible(business: Business): EnrichmentEligibility {
  if (business.opportunity_score < ENRICHMENT_SCORE_THRESHOLD) {
    return { eligible: false, reason: `Opportunity Score below ${ENRICHMENT_SCORE_THRESHOLD}` };
  }
  if (business.website_status === "strong_website") {
    return { eligible: false, reason: "Already has a strong website — low commercial value as a prospect" };
  }
  if (business.google_review_count < 3) {
    return { eligible: false, reason: "Too few reviews to judge business quality" };
  }
  if (business.email && business.phone_type === "mobile") {
    return { eligible: false, reason: "Already has email and mobile — no enrichment needed" };
  }
  return {
    eligible: true,
    reason: `Opportunity Score ${business.opportunity_score} (>= ${ENRICHMENT_SCORE_THRESHOLD}), weak/no website, ${business.google_review_count} real reviews`,
  };
}
