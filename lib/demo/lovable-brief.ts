// Lovable Demo Brief pipeline (V2.5). Deliberately lighter than buildDemo()
// in lib/demo/generate.ts — reuses the profile/enrichment/asset stages
// (zero AI cost) but skips generateWebsiteStrategy/generateWebsiteCopy/
// runSiteDirector/quality-checks entirely, since none of that is needed to
// produce a Lovable prompt. Only ONE new AI call (generateLovablePrompt).

import type { Business } from "@/lib/types";
import { buildBaseProfile, applyEnrichment, finalizeRichness } from "./profile";
import { enrichFromWebsite } from "./enrichment";
import { fetchGooglePlacesPhotoRefs, buildAssetsFromPlacesPhotos, buildPlaceholderAssets } from "./assets";
import { generateLovablePrompt } from "./lovable-prompt";
import { generateDemoSlug } from "./slug";
import { saveDemo, saveDemoAssets, getDemoByBusinessId } from "./store";
import type { Demo } from "./types";

// Gets the existing Demo row for this business, or creates a minimal stub
// (no internal-renderer fields populated) — a Lovable brief needs somewhere
// to live (demo_url, workflow_status, lovable_brief all hang off a Demo
// row), but must not require running the full internal-renderer pipeline
// first.
async function getOrCreateDemoStub(business: Business): Promise<Demo> {
  // getDemoByBusinessId normalizes pre-V2.5 rows (missing workflow_status
  // etc.) to sane defaults — see lib/demo/store.ts's normalizeDemo().
  const existing = await getDemoByBusinessId(business.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const stub: Demo = {
    id: crypto.randomUUID(),
    business_id: business.id,
    slug: generateDemoSlug(business.business_name),
    status: "NOT_STARTED",
    sharing_enabled: false,
    show_demo_banner: true,
    demo_potential_score: business.demo_potential_score,
    demo_potential_tier: business.demo_potential_tier,
    business_profile: null,
    website_strategy: null,
    website_copy: null,
    site_director_config: null,
    theme_override: null,
    palette_override: null,
    custom_domain: null,
    production_mode: false,
    failure_reason: null,
    quality_check: null,
    presentation_review: null,
    send_readiness: null,
    demo_url: null,
    demo_builder: null,
    workflow_status: "NOT_STARTED",
    lovable_brief: null,
    outreach_messages: {},
    created_at: now,
    updated_at: now,
  };
  await saveDemo(stub);
  return stub;
}

export async function buildLovableBrief(business: Business): Promise<Demo> {
  let demo = await getOrCreateDemoStub(business);

  let profile = buildBaseProfile(business);
  if (profile.website_url.value) {
    try {
      const enrichment = await enrichFromWebsite(profile.website_url.value);
      profile = applyEnrichment(profile, enrichment);
    } catch {
      // enrichment is best-effort — never block brief generation on it
    }
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const photoRefs = apiKey ? await fetchGooglePlacesPhotoRefs(business.id, apiKey) : [];
  const assets = photoRefs.length > 0
    ? buildAssetsFromPlacesPhotos(photoRefs, demo.id, business.id)
    : buildPlaceholderAssets(demo.id, business.id, profile.industry_family);
  await saveDemoAssets(demo.id, assets);

  const finalProfile = finalizeRichness(profile, assets);
  const brief = await generateLovablePrompt(finalProfile, assets);

  demo = {
    ...demo,
    business_profile: finalProfile,
    lovable_brief: brief,
    workflow_status: demo.workflow_status === "NOT_STARTED" ? "BRIEF_READY" : demo.workflow_status,
    updated_at: new Date().toISOString(),
  };
  await saveDemo(demo);
  return demo;
}
