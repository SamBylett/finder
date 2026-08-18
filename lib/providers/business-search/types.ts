// BusinessSearchProvider abstraction. Real implementations (Apify Google Maps
// scraper, Google Places API, etc.) can be swapped in later without touching
// any calling code — everything downstream only depends on this interface.

import type { Business } from "@/lib/types";

export interface BusinessSearchQuery {
  keyword: string; // e.g. "roofers"
  location: string; // e.g. "Portsmouth"
  radiusMiles: number;
  minReviews: number;
  maxResults: number;
}

// Raw business record as returned by a discovery source, before website
// analysis/scoring has been applied. Intentionally a subset of Business.
export type RawBusinessRecord = Pick<
  Business,
  | "id"
  | "business_name"
  | "category"
  | "address"
  | "town_city"
  | "postcode"
  | "phone"
  | "website_url"
  | "google_maps_url"
  | "google_rating"
  | "google_review_count"
  | "latitude"
  | "longitude"
  | "email"
  | "facebook_url"
  | "instagram_url"
  | "linkedin_url"
>;

export interface BusinessSearchProvider {
  search(query: BusinessSearchQuery): Promise<RawBusinessRecord[]>;
}
