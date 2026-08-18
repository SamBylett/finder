// Assembles a DemoBusinessProfile purely from data we already have on the
// Business record (Google Places + website analysis). No invention: fields
// we don't have real data for are left UNKNOWN, never guessed.
//
// Building a profile is now three steps (see generate.ts):
//   1. buildBaseProfile()      — from the Business record only
//   2. applyEnrichment()       — merges lib/demo/enrichment.ts results in
//   3. finalizeRichness()      — computes DataRichnessScore once assets are known

import type { Business } from "@/lib/types";
import { fact } from "./types";
import type { DemoAsset, DemoBusinessProfile, LocationMode } from "./types";
import { archetypeMeta, resolveBusinessArchetype } from "./industry";
import type { EnrichmentResult } from "./enrichment";
import { calculateDataRichness } from "./richness";

// V2.3 location intelligence (spec #9-11). Deterministic, conservative: we
// only ever have ONE confirmed Google listing per business, so
// "multiple_locations" is never assigned yet — there's no data source that
// would let us confirm a second premises without inventing it. Premises-
// based archetypes (professional services, automotive/garage-type) get a
// styled address + directions treatment when we have a confirmed address;
// mobile/service-area trades do not, because a Google listing for a roofer
// or plumber is very often a home or registered address rather than a
// customer-facing premises, and exposing it as one would be inappropriate.
function resolveLocationMode(archetype: ReturnType<typeof resolveBusinessArchetype>, hasAddress: boolean): LocationMode {
  if (!hasAddress) return "location_hidden";
  const meta = archetypeMeta(archetype);
  const premisesBased = meta.professionalSections || meta.family === "automotive";
  return premisesBased ? "physical_location" : "service_area";
}

export function buildBaseProfile(business: Business): Omit<DemoBusinessProfile, "content_richness" | "data_richness_score"> {
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
    marketing_category: meta.marketingCategoryLabel,
    industry_family: meta.family,
    business_archetype: archetype,
    conversion_model: meta.conversionModel,
    location_mode: resolveLocationMode(archetype, Boolean(business.address)),
    latitude: business.latitude ?? null,
    longitude: business.longitude ?? null,
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
    confirmed_services: [],
    service_areas: [],
    business_description: fact.unknown(),
    trust_credentials: [],
    established_year: fact.unknown(),
    customer_types: [],
    website_weaknesses: business.detected_issues.map((i) => i.label),
    source_urls: [business.website_url, business.google_maps_url].filter((u): u is string => Boolean(u)),
  };
}

// Merges lib/demo/enrichment.ts output in. Only ever adds CONFIRMED facts
// that were actually found on the business's own site — never inference,
// never a fallback guess.
export function applyEnrichment(
  profile: Omit<DemoBusinessProfile, "content_richness" | "data_richness_score">,
  enrichment: EnrichmentResult
): Omit<DemoBusinessProfile, "content_richness" | "data_richness_score"> {
  const next = { ...profile };

  if (enrichment.services.length > 0) {
    next.confirmed_services = enrichment.services.map((s) => s.value);
    next.source_urls = [...new Set([...next.source_urls, ...enrichment.services.map((s) => s.sourceUrl)])];
  }

  if (enrichment.descriptionParagraphs.length > 0) {
    const best = enrichment.descriptionParagraphs[0];
    next.business_description = fact.confirmed(best.value, best.sourceUrl);
  }

  if (enrichment.trustSignals.length > 0) {
    next.trust_credentials = enrichment.trustSignals.map((s) => s.value);
  }

  if (enrichment.establishedYear) {
    next.established_year = fact.confirmed(enrichment.establishedYear.value, enrichment.establishedYear.sourceUrl);
  }

  if (enrichment.customerTypes.length > 0) {
    next.customer_types = enrichment.customerTypes.map((s) => s.value);
  }

  return next;
}

export function finalizeRichness(
  profile: Omit<DemoBusinessProfile, "content_richness" | "data_richness_score">,
  assets: DemoAsset[]
): DemoBusinessProfile {
  const { score, tier } = calculateDataRichness(profile, assets);
  return { ...profile, data_richness_score: score, content_richness: tier };
}
