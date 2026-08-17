// Persistence for demos + their assets, same shape as lib/store.ts: Supabase
// when configured, in-memory fallback otherwise so the app still works with
// zero setup.

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Demo, DemoAsset, DemoReview } from "./types";

const memoryDemos = new Map<string, Demo>();
const memorySlugIndex = new Map<string, string>(); // slug -> id
const memoryAssets = new Map<string, DemoAsset[]>(); // demoId -> assets
const memoryVersions = new Map<string, unknown[]>(); // demoId -> snapshots

export async function saveDemo(demo: Demo): Promise<void> {
  memoryDemos.set(demo.id, demo);
  memorySlugIndex.set(demo.slug, demo.id);

  if (!isSupabaseConfigured()) return;

  const { error } = await getSupabaseClient().from("demos").upsert(demo, { onConflict: "id" });
  if (error) console.error("Supabase demo upsert failed:", error.message);
}

export async function getDemoById(id: string): Promise<Demo | undefined> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient().from("demos").select("*").eq("id", id).maybeSingle();
    if (!error && data) return data as Demo;
    if (error) console.error("Supabase demo lookup failed:", error.message);
  }
  return memoryDemos.get(id);
}

export async function getDemoBySlug(slug: string): Promise<Demo | undefined> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient().from("demos").select("*").eq("slug", slug).maybeSingle();
    if (!error && data) return data as Demo;
    if (error) console.error("Supabase demo slug lookup failed:", error.message);
  }
  const id = memorySlugIndex.get(slug);
  return id ? memoryDemos.get(id) : undefined;
}

export async function getDemoByBusinessId(businessId: string): Promise<Demo | undefined> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("demos")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) return data as Demo;
    if (error) console.error("Supabase demo-by-business lookup failed:", error.message);
  }
  return Array.from(memoryDemos.values())
    .filter((d) => d.business_id === businessId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
}

export async function listDemos(limit = 100): Promise<Demo[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("demos")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (!error && data) return data as Demo[];
    if (error) console.error("Supabase demo list failed:", error.message);
  }
  return Array.from(memoryDemos.values())
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, limit);
}

// Snapshot the current copy/strategy/director config before an in-place
// regenerate overwrites it — lightweight loss-prevention, not full version
// control per the spec's "avoid overengineering" guidance.
export async function saveDemoVersionSnapshot(demo: Demo): Promise<void> {
  const snapshot = {
    demo_id: demo.id,
    business_profile: demo.business_profile,
    website_strategy: demo.website_strategy,
    website_copy: demo.website_copy,
    site_director_config: demo.site_director_config,
    created_at: demo.updated_at,
  };

  const existing = memoryVersions.get(demo.id) ?? [];
  memoryVersions.set(demo.id, [...existing, snapshot]);

  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabaseClient().from("demo_versions").insert(snapshot);
  if (error) console.error("Supabase demo version snapshot failed:", error.message);
}

export async function saveDemoAssets(demoId: string, assets: DemoAsset[]): Promise<void> {
  memoryAssets.set(demoId, assets);

  if (!isSupabaseConfigured() || assets.length === 0) return;
  const { error } = await getSupabaseClient().from("demo_assets").upsert(assets, { onConflict: "id" });
  if (error) console.error("Supabase demo asset upsert failed:", error.message);
}

export async function getDemoAssets(demoId: string): Promise<DemoAsset[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient()
      .from("demo_assets")
      .select("*")
      .eq("demo_id", demoId)
      .order("sort_order", { ascending: true });
    if (!error && data) return data as DemoAsset[];
    if (error) console.error("Supabase demo asset lookup failed:", error.message);
  }
  return memoryAssets.get(demoId) ?? [];
}

// Reviews stay empty in V1 (see lib/demo/reviews.ts) — the table exists so a
// future review-import step has somewhere to write without a migration.
export async function getDemoReviews(demoId: string): Promise<DemoReview[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient().from("demo_reviews").select("*").eq("demo_id", demoId);
    if (!error && data) return data as DemoReview[];
  }
  return [];
}
