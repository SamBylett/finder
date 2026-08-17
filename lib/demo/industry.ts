// Category/keyword -> industry family mapping, kept as one config object
// rather than scattered conditionals elsewhere in the codebase. Extend this
// list rather than adding new branching logic at call sites.

import type { IndustryFamily } from "./types";

const FAMILY_KEYWORDS: Record<Exclude<IndustryFamily, "generic_local_service">, string[]> = {
  trades: [
    "roof", "plumb", "electric", "builder", "construction", "plaster",
    "decorat", "paint", "heating", "boiler", "gas engineer", "window",
    "glaz", "carpent", "joiner", "handyman", "loft", "extension", "kitchen fitter",
  ],
  outdoor: [
    "landscap", "garden", "fenc", "driveway", "paving", "tree surgeon",
    "arboris", "lawn", "turf", "patio", "groundwork",
  ],
  professional: [
    "account", "consult", "solicitor", "lawyer", "legal", "financial advis",
    "bookkeep", "surveyor", "architect", "mortgage advis",
  ],
  automotive: [
    "garage", "detailing", "valet", "tyre", "mot centre", "mot test",
    "car repair", "auto repair", "mechanic", "bodyshop", "body shop",
  ],
};

// Given a Google Places category / primary type display name and the search
// keyword used to find the business, resolve a best-guess industry family.
// Falls back to generic_local_service rather than forcing a wrong match.
export function resolveIndustryFamily(...texts: (string | null | undefined)[]): IndustryFamily {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return "generic_local_service";

  for (const family of Object.keys(FAMILY_KEYWORDS) as (keyof typeof FAMILY_KEYWORDS)[]) {
    if (FAMILY_KEYWORDS[family].some((kw) => haystack.includes(kw))) {
      return family;
    }
  }
  return "generic_local_service";
}

export const INDUSTRY_FAMILY_LABELS: Record<IndustryFamily, string> = {
  trades: "Trades",
  outdoor: "Outdoor & Landscaping",
  professional: "Professional Services",
  automotive: "Automotive",
  generic_local_service: "Local Service",
};
