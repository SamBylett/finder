import type { BusinessSearchProvider, BusinessSearchQuery, RawBusinessRecord } from "./types";
import { MOCK_BUSINESSES } from "./mock-data";
import { geocodeLocation, distanceMiles } from "@/lib/geo";

/**
 * Realistic sample-data implementation of BusinessSearchProvider. Filters the
 * static mock dataset by keyword (matched against category/business name),
 * distance from the geocoded search location, and minimum review count, then
 * caps the result count. A future real provider (Apify Google Maps scraper,
 * Google Places API, etc.) implements the same interface and can be swapped
 * in without touching any calling code.
 */
export class MockBusinessSearchProvider implements BusinessSearchProvider {
  async search(query: BusinessSearchQuery): Promise<RawBusinessRecord[]> {
    const center = geocodeLocation(query.location);
    const keyword = query.keyword.trim().toLowerCase();

    const matches = MOCK_BUSINESSES.filter((b) => {
      const keywordMatch =
        keyword.length === 0 ||
        b.category.toLowerCase().includes(keyword) ||
        b.business_name.toLowerCase().includes(keyword) ||
        keyword.includes(b.category.toLowerCase());

      const distance = distanceMiles(center, { lat: b.latitude, lng: b.longitude });
      const withinRadius = distance <= query.radiusMiles;

      const reviewsMatch = b.google_review_count >= query.minReviews;

      return keywordMatch && withinRadius && reviewsMatch;
    });

    // Simulate "closest/most relevant first" ordering from a real API before
    // the caller re-ranks by opportunity score.
    matches.sort((a, b) => {
      const da = distanceMiles(center, { lat: a.latitude, lng: a.longitude });
      const db = distanceMiles(center, { lat: b.latitude, lng: b.longitude });
      return da - db;
    });

    return matches.slice(0, query.maxResults);
  }
}
