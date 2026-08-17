// Assembles a DemoBusinessProfile purely from data we already have on the
// Business record (Google Places + website analysis). No invention: fields
// we don't have real data for are left UNKNOWN, never guessed.

import type { Business } from "@/lib/types";
import { fact } from "./types";
import type { DemoBusinessProfile } from "./types";
import { resolveIndustryFamily } from "./industry";

export function buildDemoBusinessProfile(business: Business): DemoBusinessProfile {
  // Google's primary type can be generic/wrong (e.g. "General Contractor" for
  // an actual landscaper) — checking the business name too catches cases the
  // category alone misses, without ever inventing a category that wasn't there.
  const industryFamily = resolveIndustryFamily(business.category, business.business_name);

  return {
    business_id: business.id,
    business_name: fact.confirmed(business.business_name, "google_places"),
    category: fact.confirmed(business.category, "google_places"),
    industry_family: industryFamily,
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
    // "never invent services" rule intact. Can be populated later if the
    // analyzer starts extracting a services list.
    confirmed_services: [],
    service_areas: [],
    business_description: fact.unknown(),
    website_weaknesses: business.detected_issues.map((i) => i.label),
    source_urls: [business.website_url, business.google_maps_url].filter((u): u is string => Boolean(u)),
  };
}
