// Small local geo helpers for the mock provider. No external geocoding API —
// just a lookup table of common UK towns plus haversine distance.

export interface TownCoord {
  name: string;
  lat: number;
  lng: number;
}

export const KNOWN_TOWNS: TownCoord[] = [
  { name: "Portsmouth", lat: 50.8198, lng: -1.088 },
  { name: "Southampton", lat: 50.9097, lng: -1.4044 },
  { name: "Fareham", lat: 50.8524, lng: -1.1782 },
  { name: "Gosport", lat: 50.7963, lng: -1.1265 },
  { name: "Havant", lat: 50.8514, lng: -0.9847 },
  { name: "Winchester", lat: 51.0632, lng: -1.308 },
  { name: "Chichester", lat: 50.8365, lng: -0.7792 },
  { name: "Waterlooville", lat: 50.8797, lng: -1.028 },
  { name: "Bristol", lat: 51.4545, lng: -2.5879 },
  { name: "Manchester", lat: 53.4808, lng: -2.2426 },
  { name: "Leeds", lat: 53.8008, lng: -1.5491 },
  { name: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { name: "Reading", lat: 51.4543, lng: -0.9781 },
  { name: "Brighton", lat: 50.8225, lng: -0.1372 },
];

// Very small "geocoder": case-insensitive substring match against known
// towns. Falls back to Portsmouth (the default demo location) if unknown so
// the app never hard-fails on an unrecognised location string.
export function geocodeLocation(location: string): TownCoord {
  const needle = location.trim().toLowerCase();
  const exact = KNOWN_TOWNS.find((t) => t.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = KNOWN_TOWNS.find(
    (t) => t.name.toLowerCase().includes(needle) || needle.includes(t.name.toLowerCase())
  );
  if (partial) return partial;
  return KNOWN_TOWNS[0];
}

// Haversine distance in miles between two lat/lng points.
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
