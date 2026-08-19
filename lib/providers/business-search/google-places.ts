// Real BusinessSearchProvider backed by the Google Places API (New).
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
//
// Two calls per search:
//   1. Geocode `location` via Text Search (find the place, take its lat/lng).
//   2. Text Search for `keyword`, biased to a circle around that point, with
//      a fieldMask that returns rating/reviews/phone/website in one shot —
//      no separate Place Details call needed.

import type { BusinessSearchProvider, BusinessSearchQuery, RawBusinessRecord } from "./types";

const PLACES_BASE_URL = "https://places.googleapis.com/v1/places:searchText";
const MAX_RADIUS_METERS = 50_000; // Places API hard cap
const MILES_TO_METERS = 1609.34;
const MAX_PAGES = 3; // Places API returns up to 20 results per page; cap pagination to bound cost/latency

interface PlacesLatLng {
  latitude: number;
  longitude: number;
}

interface PlacesSearchTextResponse {
  places?: PlacesPlace[];
  nextPageToken?: string;
}

interface PlacesPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  location?: PlacesLatLng;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text: string };
}

export class GooglePlacesProvider implements BusinessSearchProvider {
  constructor(private readonly apiKey: string) {}

  async search(query: BusinessSearchQuery): Promise<RawBusinessRecord[]> {
    const center = await this.geocodeLocation(query.location);
    const radiusMeters = Math.min(query.radiusMiles * MILES_TO_METERS, MAX_RADIUS_METERS);

    const places: PlacesPlace[] = [];
    let pageToken: string | undefined;

    // Google's Places API (New) requires a paginated request to repeat the
    // ENTIRE original request body alongside pageToken — sending pageToken
    // alone (as this used to) drops textQuery and locationBias, which
    // Google rejects with "Empty text_query... Request parameters for
    // paging requests must match the initial SearchText request."
    const baseBody: Record<string, unknown> = {
      textQuery: query.keyword,
      locationBias: {
        circle: {
          center: { latitude: center.latitude, longitude: center.longitude },
          radius: radiusMeters,
        },
      },
      maxResultCount: 20,
    };

    for (let page = 0; page < MAX_PAGES; page++) {
      if (places.length >= query.maxResults) break;

      const body = pageToken ? { ...baseBody, pageToken } : baseBody;

      const data = await this.callPlaces(body, [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.primaryTypeDisplayName",
        "nextPageToken",
      ]);

      places.push(...(data.places ?? []));

      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    return places
      .filter((p) => (p.userRatingCount ?? 0) >= query.minReviews)
      .slice(0, query.maxResults)
      .map((p) => this.toRawBusinessRecord(p, query.keyword));
  }

  private async geocodeLocation(location: string): Promise<PlacesLatLng> {
    const data = await this.callPlaces({ textQuery: location, maxResultCount: 1 }, [
      "places.location",
      "places.formattedAddress",
    ]);

    const first = data.places?.[0];
    if (!first?.location) {
      throw new Error(`Could not resolve location "${location}" via Google Places`);
    }
    return first.location;
  }

  private async callPlaces(
    body: Record<string, unknown>,
    fieldMask: string[]
  ): Promise<PlacesSearchTextResponse> {
    const res = await fetch(PLACES_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask.join(","),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Places API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  private toRawBusinessRecord(place: PlacesPlace, fallbackCategory: string): RawBusinessRecord {
    const townCity = this.findAddressComponent(place, ["locality", "postal_town"]);
    const postcode = this.findAddressComponent(place, ["postal_code"]);

    const business: RawBusinessRecord = {
      id: place.id,
      business_name: place.displayName?.text ?? "Unknown business",
      category: place.primaryTypeDisplayName?.text ?? fallbackCategory,
      address: place.formattedAddress ?? "",
      town_city: townCity ?? "Unknown",
      postcode: postcode ?? "",
      phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
      website_url: place.websiteUri ?? null,
      google_maps_url: place.googleMapsUri ?? null,
      google_rating: place.rating ?? 0,
      google_review_count: place.userRatingCount ?? 0,
      latitude: place.location?.latitude ?? 0,
      longitude: place.location?.longitude ?? 0,
      // Places API does not return email or social links — left null here.
      // A later website-analysis pass can attempt to extract these from the site itself.
      email: null,
      facebook_url: null,
      instagram_url: null,
      linkedin_url: null,
    };

    return business;
  }

  private findAddressComponent(place: PlacesPlace, types: string[]): string | null {
    const match = place.addressComponents?.find((c) =>
      types.some((t) => c.types?.includes(t))
    );
    return match?.longText ?? null;
  }
}
