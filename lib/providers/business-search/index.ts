import type { BusinessSearchProvider } from "./types";
import { MockBusinessSearchProvider } from "./mock";
import { GooglePlacesProvider } from "./google-places";

export type { BusinessSearchProvider, BusinessSearchQuery, RawBusinessRecord } from "./types";

/**
 * Provider factory. Uses the real Google Places provider when
 * GOOGLE_PLACES_API_KEY is set; otherwise falls back to the mock provider so
 * the app keeps working with zero external API keys.
 */
export function getBusinessSearchProvider(): BusinessSearchProvider {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (apiKey) {
    return new GooglePlacesProvider(apiKey);
  }
  return new MockBusinessSearchProvider();
}
