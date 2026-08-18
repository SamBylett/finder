// Orchestrates: discover businesses -> determine website presence -> analyse
// website (if any) -> score -> rank. Runs entirely in-memory per request.
// No Supabase call is required for V1 — see lib/store.ts for the optional
// persistence fallback.

import type { Business, SearchParams, SearchResponse, WebsiteStatus } from "@/lib/types";
import { getBusinessSearchProvider } from "@/lib/providers/business-search";
import { getWebsiteAnalyzer } from "@/lib/website-analyzer";
import { scoreBusiness, type ScoreBreakdownLine } from "@/lib/scoring";
import { mapWithConcurrency } from "@/lib/concurrency";
import { calculateDemoPotential } from "@/lib/demo/potential";
import { normalizeAndClassifyUkPhone } from "@/lib/phone";

// How many website analyses run at once. Bounded rather than fully unbounded
// so a large maxResults doesn't fire e.g. 100 simultaneous outbound fetches —
// past a point that adds contention/throttling and makes the batch slower,
// not faster. Override via WEBSITE_ANALYSIS_CONCURRENCY if needed.
const WEBSITE_ANALYSIS_CONCURRENCY = Number(process.env.WEBSITE_ANALYSIS_CONCURRENCY) || 8;

export interface PipelineResult extends SearchResponse {
  breakdowns: Record<string, ScoreBreakdownLine[]>;
}

export async function runOpportunitySearch(params: SearchParams): Promise<PipelineResult> {
  const provider = getBusinessSearchProvider();
  const analyzer = getWebsiteAnalyzer();

  const rawBusinesses = await provider.search({
    keyword: params.keyword,
    location: params.location,
    radiusMiles: params.radiusMiles,
    minReviews: params.minReviews,
    maxResults: params.maxResults,
  });

  const breakdowns: Record<string, ScoreBreakdownLine[]> = {};

  const results: Business[] = await mapWithConcurrency(
    rawBusinesses,
    WEBSITE_ANALYSIS_CONCURRENCY,
    async (rawInput) => {
      let raw = rawInput;
      let websiteStatus: WebsiteStatus;
      let websiteScore: number | null = null;
      let analysisSummary: string;
      let objectiveChecks;

      if (raw.website_url) {
        const analysis = await analyzer.analyze(raw.website_url);
        websiteStatus = analysis.status;
        websiteScore = analysis.score;
        analysisSummary = analysis.subjective.available
          ? `${analysis.summary} AI impression: ${analysis.subjective.overallImpression} ${analysis.subjective.designQualityNotes}`
          : analysis.summary;
        objectiveChecks = analysis.objective;

        // Google Places (and other providers) often don't return email/social
        // links — fill any gaps with what we found on the site itself.
        raw = {
          ...raw,
          email: raw.email ?? analysis.contact.email,
          facebook_url: raw.facebook_url ?? analysis.contact.facebookUrl,
          instagram_url: raw.instagram_url ?? analysis.contact.instagramUrl,
          linkedin_url: raw.linkedin_url ?? analysis.contact.linkedinUrl,
        };
      } else if (raw.facebook_url || raw.instagram_url) {
        websiteStatus = "social_only";
        analysisSummary =
          "No website found. Business is only discoverable via social media (Facebook/Instagram).";
      } else {
        websiteStatus = "no_website";
        analysisSummary = "No website or social media presence found.";
      }

      const scoring = scoreBusiness({
        websiteStatus,
        googleRating: raw.google_rating,
        googleReviewCount: raw.google_review_count,
        objectiveChecks,
      });

      const { phone_e164, phone_type } = normalizeAndClassifyUkPhone(raw.phone);

      const businessBeforeDemoPotential: Business = {
        ...raw,
        phone_e164,
        phone_type,
        website_status: websiteStatus,
        website_score: websiteScore,
        opportunity_score: scoring.opportunityScore,
        opportunity_tier: scoring.opportunityTier,
        analysis_summary: analysisSummary,
        detected_issues: scoring.detectedIssues,
        created_at: new Date().toISOString(),
        demo_potential_score: 0,
        demo_potential_tier: "LOW VALUE",
      };

      // Cheap, deterministic — safe to compute for every result, unlike the
      // AI-driven demo generation stages which only ever run on explicit
      // "Build Demo" action.
      const demoPotential = calculateDemoPotential(businessBeforeDemoPotential);

      const business: Business = {
        ...businessBeforeDemoPotential,
        demo_potential_score: demoPotential.score,
        demo_potential_tier: demoPotential.tier,
      };

      breakdowns[business.id] = scoring.breakdown;

      return business;
    }
  );

  results.sort((a, b) => b.opportunity_score - a.opportunity_score);

  const summary = {
    totalAnalysed: results.length,
    hot: results.filter((r) => r.opportunity_tier === "HOT").length,
    opportunity: results.filter((r) => r.opportunity_tier === "OPPORTUNITY").length,
    lowPriority: results.filter((r) => r.opportunity_tier === "LOW PRIORITY").length,
  };

  return { summary, results, breakdowns };
}
