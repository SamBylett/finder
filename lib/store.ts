// Persistence layer. When Supabase env vars are present, results are
// upserted into Postgres (keyed on the provider's business id, so
// re-discovering the same business just refreshes its row). Otherwise falls
// back to an in-memory, per-process cache so the app still works instantly
// with zero setup.
//
// "Persistence" here means latest-known-state per business, not a full
// history log — searching the same area again overwrites prior results for
// businesses that reappear.

import type { Business } from "@/lib/types";
import type { ScoreBreakdownLine } from "@/lib/scoring";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export { isSupabaseConfigured as hasSupabaseConfigured };

interface StoredBusiness {
  business: Business;
  breakdown: ScoreBreakdownLine[];
}

// In-memory fallback cache. Persists for the lifetime of the Next.js server
// process only.
const memoryCache = new Map<string, StoredBusiness>();

interface BusinessRow extends Omit<Business, "detected_issues"> {
  detected_issues: Business["detected_issues"];
  score_breakdown: ScoreBreakdownLine[];
}

function toRow(business: Business, breakdown: ScoreBreakdownLine[]): BusinessRow {
  return { ...business, score_breakdown: breakdown };
}

function fromRow(row: BusinessRow): StoredBusiness {
  const { score_breakdown, ...business } = row;
  return { business: business as Business, breakdown: score_breakdown ?? [] };
}

export async function cacheResults(
  businesses: Business[],
  breakdowns: Record<string, ScoreBreakdownLine[]>
): Promise<void> {
  for (const business of businesses) {
    memoryCache.set(business.id, { business, breakdown: breakdowns[business.id] ?? [] });
  }

  if (!isSupabaseConfigured() || businesses.length === 0) return;

  const rows = businesses.map((b) => toRow(b, breakdowns[b.id] ?? []));
  const { error } = await getSupabaseClient().from("businesses").upsert(rows, { onConflict: "id" });

  if (error) {
    // Persistence is best-effort — a Supabase hiccup shouldn't break the
    // search response, which already succeeded and is cached in memory.
    console.error("Supabase upsert failed:", error.message);
  }
}

export async function getCachedBusiness(id: string): Promise<StoredBusiness | undefined> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("businesses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return fromRow(data as BusinessRow);
    if (error) console.error("Supabase lookup failed:", error.message);
  }

  return memoryCache.get(id);
}

// Latest-known businesses, most recently updated first. Used to repopulate
// the dashboard on load so a page refresh doesn't lose prior search results.
export async function listRecentBusinesses(limit = 100): Promise<Business[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("businesses")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      return (data as BusinessRow[]).map((row) => fromRow(row).business);
    }
    if (error) console.error("Supabase list failed:", error.message);
  }

  return Array.from(memoryCache.values())
    .map((s) => s.business)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}
