// Core domain types for UK Local Opportunity Finder

export type WebsiteStatus =
  | "no_website"
  | "social_only"
  | "broken_website"
  | "weak_website"
  | "average_website"
  | "strong_website"
  | "not_analysed";

export type OpportunityTier = "HOT" | "OPPORTUNITY" | "LOW PRIORITY";

export interface DetectedIssue {
  code: string;
  label: string;
  severity: "low" | "medium" | "high";
}

export interface Business {
  id: string;
  business_name: string;
  category: string;
  address: string;
  town_city: string;
  postcode: string;
  phone: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  google_rating: number | null;
  google_review_count: number;
  latitude: number;
  longitude: number;
  email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  // Deterministic phone classification (see lib/phone.ts) — never inferred
  // beyond what the digits themselves prove. "unknown" is the safe default
  // for anything ambiguous rather than guessing mobile.
  phone_e164: string | null;
  phone_type: "mobile" | "landline" | "unknown" | null;
  website_status: WebsiteStatus;
  website_score: number | null; // 0-100, quality of the existing website (if any)
  opportunity_score: number; // 0-100, higher = better prospect
  opportunity_tier: OpportunityTier;
  // Separate from opportunity_score: how suitable this business is for a
  // visually impressive speculative demo site, not whether it's a good
  // commercial prospect. See lib/demo/potential.ts.
  demo_potential_score: number;
  demo_potential_tier: "EXCELLENT DEMO" | "GOOD DEMO" | "POSSIBLE" | "LOW VALUE";
  analysis_summary: string;
  detected_issues: DetectedIssue[];
  created_at: string;
}

// Params driving a search / discovery run
export interface SearchParams {
  keyword: string; // e.g. "roofers"
  location: string; // e.g. "Portsmouth"
  radiusMiles: number;
  minReviews: number;
  maxResults: number;
}

// Summary stats shown at top of dashboard
export interface ResultsSummary {
  totalAnalysed: number;
  hot: number;
  opportunity: number;
  lowPriority: number;
}

export interface SearchResponse {
  summary: ResultsSummary;
  results: Business[];
}
