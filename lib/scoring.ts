// Pure, deterministic scoring engine. No I/O, no randomness — easy to unit
// test and tune later.

import type { DetectedIssue, OpportunityTier, WebsiteStatus } from "@/lib/types";
import type { ObjectiveWebsiteChecks } from "@/lib/website-analyzer/types";

// V2.4: contact-channel presence (email/phone/facebook/instagram) is
// deliberately NOT part of this input. Opportunity Score answers "how
// strong is the commercial website opportunity" — contactability is a
// separate question, answered by OutreachReadiness (see lib/outreach.ts).
// A business isn't a weaker opportunity because we can't reach it; it's
// just less useful to prioritise for outreach, which OutreachReadiness
// already covers on its own.
export interface ScoringInput {
  websiteStatus: WebsiteStatus;
  googleRating: number | null;
  googleReviewCount: number;
  // Present only when a website was actually analysed.
  objectiveChecks?: ObjectiveWebsiteChecks;
}

export interface ScoreBreakdownLine {
  label: string;
  points: number;
}

export interface ScoringResult {
  opportunityScore: number; // 0-100, normalised
  opportunityTier: OpportunityTier;
  breakdown: ScoreBreakdownLine[];
  detectedIssues: DetectedIssue[];
}

const MAX_RAW_SCORE = 100; // sum of all possible positive points below

export function scoreBusiness(input: ScoringInput): ScoringResult {
  const breakdown: ScoreBreakdownLine[] = [];
  const issues: DetectedIssue[] = [];
  let raw = 0;

  // --- Website weakness -----------------------------------------------
  switch (input.websiteStatus) {
    case "no_website":
      raw += 30;
      breakdown.push({ label: "No website found", points: 30 });
      issues.push({ code: "no_website", label: "No website found", severity: "high" });
      break;
    case "social_only":
      raw += 25;
      breakdown.push({ label: "Social media only (no website)", points: 25 });
      issues.push({ code: "social_only", label: "Relies on social media only, no website", severity: "high" });
      break;
    case "broken_website":
      raw += 25;
      breakdown.push({ label: "Website broken / not loading", points: 25 });
      issues.push({ code: "broken_website", label: "Website appears broken or unreachable", severity: "high" });
      break;
    case "weak_website":
      raw += 20;
      breakdown.push({ label: "Weak / dated website", points: 20 });
      issues.push({ code: "weak_website", label: "Website is weak or outdated", severity: "medium" });
      break;
    default:
      break;
  }

  if (input.objectiveChecks) {
    const c = input.objectiveChecks;
    if (!c.hasClearPrimaryCTA) {
      raw += 10;
      breakdown.push({ label: "No clear call-to-action", points: 10 });
      issues.push({ code: "no_cta", label: "No clear primary call-to-action", severity: "medium" });
    }
    if (!c.hasContactForm && !c.hasQuoteOrEstimateForm) {
      raw += 10;
      breakdown.push({ label: "No quote/contact form", points: 10 });
      issues.push({ code: "no_form", label: "No quote or contact form", severity: "medium" });
    }
    if (!c.hasOnlineBooking) {
      raw += 5;
      breakdown.push({ label: "No online booking", points: 5 });
      issues.push({ code: "no_booking", label: "No online booking", severity: "low" });
    }
    if (!c.hasLiveChat) {
      raw += 5;
      breakdown.push({ label: "No live chat", points: 5 });
      issues.push({ code: "no_live_chat", label: "No live chat", severity: "low" });
    }
    if (c.outdatedCopyrightYear) {
      issues.push({ code: "outdated_copyright", label: "Outdated copyright year", severity: "low" });
    }
    if (c.hasObviousBrokenLinks) {
      issues.push({ code: "broken_links", label: "Obvious broken links detected", severity: "medium" });
    }
    if (!c.mobileResponsive) {
      issues.push({ code: "not_mobile_responsive", label: "Not mobile-responsive", severity: "medium" });
    }
    if (!c.https) {
      issues.push({ code: "no_https", label: "No HTTPS/SSL", severity: "medium" });
    }
  }

  // --- Business quality --------------------------------------------------
  if (input.googleReviewCount >= 100) {
    raw += 20;
    breakdown.push({ label: "100+ Google reviews", points: 20 });
  } else if (input.googleReviewCount >= 50) {
    raw += 15;
    breakdown.push({ label: "50-99 Google reviews", points: 15 });
  } else if (input.googleReviewCount >= 20) {
    raw += 10;
    breakdown.push({ label: "20-49 Google reviews", points: 10 });
  }

  if (input.googleRating !== null) {
    if (input.googleRating >= 4.5) {
      raw += 10;
      breakdown.push({ label: "Google rating 4.5+", points: 10 });
    } else if (input.googleRating >= 4.0) {
      raw += 5;
      breakdown.push({ label: "Google rating 4.0-4.49", points: 5 });
    }
  }

  const opportunityScore = Math.max(0, Math.min(100, Math.round((raw / MAX_RAW_SCORE) * 100)));

  return {
    opportunityScore,
    opportunityTier: tierForScore(opportunityScore),
    breakdown,
    detectedIssues: issues,
  };
}

export function tierForScore(score: number): OpportunityTier {
  if (score >= 75) return "HOT";
  if (score >= 50) return "OPPORTUNITY";
  return "LOW PRIORITY";
}
