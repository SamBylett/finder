// WebsiteAnalyzer abstraction. A real implementation could use fetch + cheerio,
// Firecrawl, Playwright, etc. Callers only depend on this interface.

import type { WebsiteStatus } from "@/lib/types";

// Objective, programmatically-checkable signals (regex/DOM heuristics in a real impl).
export interface ObjectiveWebsiteChecks {
  loadsSuccessfully: boolean;
  https: boolean;
  mobileResponsive: boolean;
  hasObviousPhoneNumber: boolean;
  hasClickToCallLink: boolean;
  hasClearPrimaryCTA: boolean;
  hasContactForm: boolean;
  hasQuoteOrEstimateForm: boolean;
  hasOnlineBooking: boolean;
  hasLiveChat: boolean;
  hasTestimonialsOrReviews: boolean;
  hasRecentProjectGallery: boolean;
  hasServicesListed: boolean;
  hasServiceAreasStated: boolean;
  hasSocialLinks: boolean;
  outdatedCopyrightYear: boolean;
  hasObviousBrokenLinks: boolean;
  weakOrDatedDesignIndicators: boolean;
}

// Placeholder for a future AI-assisted subjective assessment. Stubbed only —
// no real AI API is called in V1. A real implementation might send a
// screenshot or page text to an LLM and return a qualitative read.
export interface SubjectiveWebsiteAssessment {
  available: boolean; // false in V1 stub — no AI call performed
  overallImpression: string | null;
  designQualityNotes: string | null;
}

// Contact details found on the page itself (mailto: links, social hrefs).
// Search providers like Google Places often don't return these — this fills
// the gap for free using the same page fetch already done for analysis.
export interface ExtractedContactInfo {
  email: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
}

export interface WebsiteAnalysisResult {
  url: string;
  status: WebsiteStatus;
  score: number; // 0-100 quality score for the website itself
  objective: ObjectiveWebsiteChecks;
  subjective: SubjectiveWebsiteAssessment;
  summary: string;
  contact: ExtractedContactInfo;
}

export interface WebsiteAnalyzer {
  /**
   * Analyse a business website. Implementations should never throw for a
   * merely-unreachable site; they should return a result with
   * status = "broken_website" instead.
   */
  analyze(url: string): Promise<WebsiteAnalysisResult>;
}
