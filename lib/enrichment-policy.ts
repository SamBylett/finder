// V2.5 — deterministic gate for FindyMail enrichment. Contact-data
// enrichment costs real credits, so it only ever runs for prospects worth
// the spend: explicit per-business "Enrich Contact" clicks and the batch
// "Enrich Top N" action are both gated through this, never automatic
// during search/discovery.
//
// Tightened per explicit instruction: only HOT leads (opportunity_tier),
// and only when a contact route is actually missing — never spend credits
// re-confirming a business we can already email or call.

import type { Business } from "./types";

export interface EnrichmentEligibility {
  eligible: boolean;
  reason: string;
}

export function isEnrichmentEligible(business: Business): EnrichmentEligibility {
  if (business.opportunity_tier !== "HOT") {
    return { eligible: false, reason: "Not a HOT lead" };
  }

  const hasEmail = Boolean(business.email);
  const hasPhone = Boolean(business.phone);

  if (hasEmail && hasPhone) {
    return { eligible: false, reason: "Already has both an email and a phone number" };
  }

  const missing = [!hasEmail && "email", !hasPhone && "phone number"].filter(Boolean).join(" and ");
  return { eligible: true, reason: `HOT lead missing ${missing}` };
}
