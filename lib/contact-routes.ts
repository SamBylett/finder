// Contact-route provenance store (V2.5). contact_routes is the audit-trail
// source of truth for every discovered contact route; businesses.email/
// phone/phone_e164/phone_type/facebook_url/instagram_url/linkedin_url stay
// as a denormalized "best known value per type" cache so ResultsTable/CSV/
// computeOutreachReadiness() keep working unmodified against Business.
//
// Same dual in-memory + Supabase persistence pattern as lib/store.ts and
// lib/demo/store.ts, so this works with zero Supabase setup too.

import type { Business, ContactRoute, ContactRouteSource, ContactRouteType } from "./types";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase/client";
import { getCachedBusiness, cacheResults } from "./store";
import { normalizeAndClassifyUkPhone } from "./phone";

const memoryRoutes = new Map<string, ContactRoute[]>(); // businessId -> routes

// Lower number = stronger source. Never let a weaker source overwrite the
// denormalized cache value that a stronger source already established.
const SOURCE_PRIORITY: Record<ContactRouteSource, number> = {
  website: 1,
  google_places: 2,
  findymail: 3,
  social_profile: 4,
  directory: 5,
  inferred: 6,
};

export async function getContactRoutes(businessId: string): Promise<ContactRoute[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("contact_routes")
      .select("*")
      .eq("business_id", businessId)
      .order("discovered_at", { ascending: false });
    if (!error && data) return data as ContactRoute[];
    if (error) console.error("Supabase contact_routes lookup failed:", error.message);
  }
  return memoryRoutes.get(businessId) ?? [];
}

export async function addContactRoute(
  businessId: string,
  input: Omit<ContactRoute, "id" | "business_id" | "discovered_at">
): Promise<ContactRoute> {
  const route: ContactRoute = {
    id: crypto.randomUUID(),
    business_id: businessId,
    discovered_at: new Date().toISOString(),
    ...input,
  };

  const existing = await getContactRoutes(businessId);
  memoryRoutes.set(businessId, [route, ...existing]);

  if (isSupabaseConfigured()) {
    const { error } = await getSupabaseClient().from("contact_routes").insert(route);
    if (error) console.error("Supabase contact_routes insert failed:", error.message);
  }

  await maybePromoteToCache(businessId, route, existing);
  return route;
}

// Only overwrites businesses.<field> when either (a) it's currently empty,
// or (b) there's a previously-recorded ContactRoute of the same type whose
// source priority is strictly weaker than this one — i.e. we can prove the
// new value is stronger. A legacy value with no recorded provenance history
// is left alone rather than risk downgrading a value we can't compare.
async function maybePromoteToCache(businessId: string, route: ContactRoute, priorRoutes: ContactRoute[]): Promise<void> {
  const cached = await getCachedBusiness(businessId);
  if (!cached) return;
  const business = cached.business;

  const sameTypeHistory = priorRoutes.filter((r) => r.type === route.type);
  const strongestPrior = sameTypeHistory.reduce<ContactRouteSource | null>((best, r) => {
    if (!best) return r.source;
    return SOURCE_PRIORITY[r.source] < SOURCE_PRIORITY[best] ? r.source : best;
  }, null);

  const currentFieldEmpty = isCacheFieldEmpty(business, route.type);
  const provablyStronger = strongestPrior !== null && SOURCE_PRIORITY[route.source] < SOURCE_PRIORITY[strongestPrior];

  if (!currentFieldEmpty && !provablyStronger) return;

  const updated = applyRouteToCache(business, route);
  await cacheResults([updated], { [businessId]: cached.breakdown });
}

function isCacheFieldEmpty(business: Business, type: ContactRouteType): boolean {
  switch (type) {
    case "EMAIL": return !business.email;
    case "MOBILE": case "LANDLINE": return !business.phone;
    case "FACEBOOK": return !business.facebook_url;
    case "INSTAGRAM": return !business.instagram_url;
    case "LINKEDIN": return !business.linkedin_url;
    default: return true;
  }
}

function applyRouteToCache(business: Business, route: ContactRoute): Business {
  switch (route.type) {
    case "EMAIL":
      return { ...business, email: route.value };
    case "MOBILE":
    case "LANDLINE": {
      const { phone_e164, phone_type } = normalizeAndClassifyUkPhone(route.value);
      return { ...business, phone: route.value, phone_e164, phone_type };
    }
    case "FACEBOOK":
      return { ...business, facebook_url: route.value };
    case "INSTAGRAM":
      return { ...business, instagram_url: route.value };
    case "LINKEDIN":
      return { ...business, linkedin_url: route.value };
    default:
      return business; // CONTACT_FORM/OTHER have no denormalized cache field
  }
}
