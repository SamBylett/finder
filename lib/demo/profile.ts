// Assembles a DemoBusinessProfile purely from data we already have on the
// Business record (Google Places + website analysis). No invention: fields
// we don't have real data for are left UNKNOWN, never guessed.

import type { Business } from "@/lib/types";
import { fact } from "./types";
import type { ContentRichness, DemoBusinessProfile } from "./types";
import { archetypeMeta, resolveBusinessArchetype } from "./industry";

export function buildDemoBusinessProfile(business: Business): DemoBusinessProfile {
  // Google's primary type can be generic/wrong (e.g. "General Contractor" for
  // an actual landscaper) — checking the business name too catches cases the
  // category alone misses, without ever inventing a category that wasn't there.
  const archetype = resolveBusinessArchetype(business.category, business.business_name);
  const meta = archetypeMeta(archetype);

  const sourceCategoryFact = fact.confirmed(business.category, "google_places");

  return {
    business_id: business.id,
    business_name: fact.confirmed(business.business_name, "google_places"),
    source_category: sourceCategoryFact,
    category: sourceCategoryFact,
    // Deterministic, NOT AI-generated — a customer-facing label derived from
    // the resolved archetype, never Google's raw (often generic/misleading)
    // category text. See lib/demo/industry.ts ARCHETYPES.
    marketing_category: meta.marketingCategoryLabel,
    industry_family: meta.family,
    business_archetype: archetype,
    conversion_model: meta.conversionModel,
    content_richness: computeContentRichness(business),
    address: fact.confirmed(business.address, "google_places"),
    town_city: fact.confirmed(business.town_city, "google_places"),
    postcode: business.postcode ? fact.confirmed(business.postcode, "google_places") : fact.unknown(),
    phone: business.phone ? fact.confirmed(business.phone, "google_places") : fact.unknown(),
    email: business.email
      ? fact.confirmed(business.email, business.website_url ? "website" : "google_places")
      : fact.unknown(),
    website_url: business.website_url ? fact.confirmed(business.website_url, "google_places") : fact.unknown(),
    google_maps_url: business.google_maps_url
      ? fact.confirmed(business.google_maps_url, "google_places")
      : fact.unknown(),
    google_rating: business.google_rating !== null ? fact.confirmed(business.google_rating, "google_places") : fact.unknown(),
    google_review_count: fact.confirmed(business.google_review_count, "google_places"),
    facebook_url: business.facebook_url ? fact.confirmed(business.facebook_url, "website") : fact.unknown(),
    instagram_url: business.instagram_url ? fact.confirmed(business.instagram_url, "website") : fact.unknown(),
    // We don't scrape a structured services list in V1's website analyzer —
    // leaving this empty (rather than guessing from the category) keeps the
    // "never invent services" rule intact. Known limitation: until the
    // analyzer extracts a real services list, copy generation falls back to
    // conservative category-derived descriptions (see strategy.ts/copy.ts).
    confirmed_services: [],
    service_areas: [],
    business_description: fact.unknown(),
    website_weaknesses: business.detected_issues.map((i) => i.label),
    source_urls: [business.website_url, business.google_maps_url].filter((u): u is string => Boolean(u)),
  };
}

// How much real material there is to work with — drives whether sections
// that need substance get shown at full size, compact, or omitted entirely
// (a shorter credible site beats a longer padded one).
function computeContentRichness(business: Business): ContentRichness {
  let score = 0;
  if (business.phone) score += 1;
  if (business.email) score += 1;
  if (business.website_url) score += 1;
  if (business.google_review_count >= 20) score += 2;
  else if (business.google_review_count >= 5) score += 1;

  if (score >= 4) return "rich";
  if (score >= 2) return "moderate";
  return "sparse";
}
