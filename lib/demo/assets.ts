// Asset sourcing for a demo. Preference order per spec:
//   1. business-owned images we already have (none captured in V1)
//   2. existing website images (not scraped in V1 — no reliable extraction yet)
//   3. Google Places photos (business-submitted or Street View, contextually
//      real photos of the actual business) when available
//   4. placeholder, clearly marked as such
//
// Deliberately does NOT scrape Facebook/Instagram (spec: "not in a brittle
// way") and never borrows imagery from unrelated businesses.

import type { DemoAsset, IndustryFamily } from "./types";

const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";
const MAX_PHOTOS = 6;

interface PlacesPhoto {
  name: string; // e.g. "places/ChIJ.../photos/AeR..."
  widthPx?: number;
  heightPx?: number;
}

// Placeholder images are static, industry-themed gradients — never real
// photos of a different business. Rendered client-side by DemoAssetImage,
// this just marks which type to render.
const PLACEHOLDER_LABELS: Record<IndustryFamily, string> = {
  trades: "trades",
  outdoor: "outdoor",
  professional: "professional",
  automotive: "automotive",
  generic_local_service: "generic",
};

export async function fetchGooglePlacesPhotoRefs(placeId: string, apiKey: string): Promise<PlacesPhoto[]> {
  try {
    const res = await fetch(`${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { photos?: PlacesPhoto[] };
    return (data.photos ?? []).slice(0, MAX_PHOTOS);
  } catch {
    return [];
  }
}

// Builds our own proxy URL (never expose the Google API key to the browser).
// See app/api/places-photo/route.ts.
export function placesPhotoProxyUrl(photoName: string, maxWidthPx = 1200): string {
  return `/api/places-photo?name=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidthPx}`;
}

export function buildAssetsFromPlacesPhotos(
  photos: PlacesPhoto[],
  demoId: string,
  businessId: string
): DemoAsset[] {
  return photos.map((photo, i) => ({
    id: `${demoId}-asset-${i}`,
    demo_id: demoId,
    business_id: businessId,
    type: i === 0 ? "hero" : "gallery",
    url: placesPhotoProxyUrl(photo.name),
    source_url: null,
    source_provider: "google_places",
    business_owned: true, // Places photos are contributed by the business or verified as this location
    placeholder: false,
    width: photo.widthPx ?? null,
    height: photo.heightPx ?? null,
    selected: true,
    sort_order: i,
  }));
}

export function buildPlaceholderAssets(
  demoId: string,
  businessId: string,
  industryFamily: IndustryFamily
): DemoAsset[] {
  const label = PLACEHOLDER_LABELS[industryFamily];
  const types: DemoAsset["type"][] = ["hero", "gallery", "gallery"];
  return types.map((type, i) => ({
    id: `${demoId}-placeholder-${i}`,
    demo_id: demoId,
    business_id: businessId,
    type,
    url: `placeholder:${label}:${i}`,
    source_url: null,
    source_provider: null,
    business_owned: false,
    placeholder: true,
    width: null,
    height: null,
    selected: true,
    sort_order: i,
  }));
}
