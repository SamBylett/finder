// DataRichnessScore — deterministic 0-100, separate from Opportunity Score
// and Demo Potential Score. Measures how much real material we have to
// build a website FROM, not whether the business is a good sales prospect.
// SiteDirector uses the resulting tier/density to decide site length —
// never to justify generating filler for a sparse business.

import type { ContentDensity, ContentRichness, DemoBusinessProfile } from "./types";
import type { DemoAsset } from "./types";

export interface DataRichnessResult {
  score: number;
  tier: ContentRichness;
  density: ContentDensity;
}

export function calculateDataRichness(
  profile: Omit<DemoBusinessProfile, "content_richness" | "data_richness_score">,
  assets: DemoAsset[]
): DataRichnessResult {
  let score = 0;

  if (profile.confirmed_services.length >= 4) score += 15;
  else if (profile.confirmed_services.length >= 1) score += 8;

  if (profile.business_description.status !== "UNKNOWN") score += 10;

  const realImages = assets.filter((a) => !a.placeholder).length;
  if (realImages >= 4) score += 15;
  else if (realImages >= 1) score += 8;

  if (profile.google_review_count.status !== "UNKNOWN") {
    const count = profile.google_review_count.value ?? 0;
    if (count >= 20) score += 10;
    else if (count >= 5) score += 5;
  }

  if (profile.trust_credentials.length > 0) score += 10;
  if (profile.established_year.status !== "UNKNOWN") score += 5;
  if (profile.customer_types.length > 0) score += 8;
  if (profile.service_areas.length > 1) score += 7;

  if (profile.phone.status !== "UNKNOWN") score += 5;
  if (profile.email.status !== "UNKNOWN") score += 5;
  if (profile.website_url.status !== "UNKNOWN") score += 5;

  if (profile.website_weaknesses.length === 0) score += 2;

  score = Math.max(0, Math.min(100, score));

  const tier: ContentRichness = score >= 80 ? "RICH" : score >= 60 ? "GOOD" : score >= 40 ? "LIMITED" : "SPARSE";
  const density: ContentDensity = tier === "RICH" ? "rich" : tier === "SPARSE" ? "minimal" : "standard";

  return { score, tier, density };
}
