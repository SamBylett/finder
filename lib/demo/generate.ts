// Orchestrates the full "Build Demo" pipeline. This is the only place that
// wires profile -> enrichment -> richness -> assets -> strategy -> copy ->
// director -> quality check -> persistence together. Never called on page
// view — only on explicit user action (POST /api/demos or a
// regenerate-stage call).

import type { Business } from "@/lib/types";
import { buildBaseProfile, applyEnrichment, finalizeRichness } from "./profile";
import { enrichFromWebsite } from "./enrichment";
import { calculateDemoPotential } from "./potential";
import { fetchGooglePlacesPhotoRefs, buildAssetsFromPlacesPhotos, buildPlaceholderAssets } from "./assets";
import { generateWebsiteStrategy } from "./strategy";
import { generateWebsiteCopy } from "./copy";
import { runSiteDirector } from "./director";
import { runDemoQualityCheck } from "./quality-check";
import { runPresentationQualityReview } from "./presentation-review";
import { computeSendReadiness } from "./send-readiness";
import { generateDemoSlug } from "./slug";
import { saveDemo, saveDemoAssets, getDemoByBusinessId, getDemoReviews } from "./store";
import { buildDemoReviews } from "./reviews";
import type { Demo } from "./types";

export async function buildDemo(business: Business): Promise<Demo> {
  const existing = await getDemoByBusinessId(business.id);
  const demoId = existing?.id ?? crypto.randomUUID();
  const slug = existing?.slug ?? generateDemoSlug(business.business_name);
  const now = new Date().toISOString();

  let demo: Demo = existing ?? {
    id: demoId,
    business_id: business.id,
    slug,
    status: "COLLECTING_DATA",
    sharing_enabled: false,
    show_demo_banner: true,
    demo_potential_score: 0,
    demo_potential_tier: "LOW VALUE",
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
    created_at: now,
    updated_at: now,
  };

  demo = { ...demo, status: "COLLECTING_DATA", failure_reason: null, updated_at: new Date().toISOString() };
  await saveDemo(demo);

  try {
    let profile = buildBaseProfile(business);
    const potential = calculateDemoPotential(business);

    // Enrichment — bounded first-party website crawl. Best-effort: a slow
    // or unreachable site just means no enrichment, not a failed build.
    if (profile.website_url.value) {
      try {
        const enrichment = await enrichFromWebsite(profile.website_url.value);
        profile = applyEnrichment(profile, enrichment);
      } catch {
        // enrichment is best-effort — never block the build on it
      }
    }

    demo = {
      ...demo,
      demo_potential_score: potential.score,
      demo_potential_tier: potential.tier,
      status: "GENERATING",
      updated_at: new Date().toISOString(),
    };
    await saveDemo(demo);

    // Assets — Google Places photos when we can look them up, placeholder
    // otherwise. Deliberately not fetched during search — only here, on
    // explicit Build Demo action.
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    const photoRefs = apiKey ? await fetchGooglePlacesPhotoRefs(business.id, apiKey) : [];
    const assets = photoRefs.length > 0
      ? buildAssetsFromPlacesPhotos(photoRefs, demo.id, business.id)
      : buildPlaceholderAssets(demo.id, business.id, profile.industry_family);
    await saveDemoAssets(demo.id, assets);

    const finalProfile = finalizeRichness(profile, assets);
    demo = { ...demo, business_profile: finalProfile, updated_at: new Date().toISOString() };
    await saveDemo(demo);

    const strategy = await generateWebsiteStrategy(finalProfile);
    demo = { ...demo, website_strategy: strategy, updated_at: new Date().toISOString() };
    await saveDemo(demo);

    const copy = await generateWebsiteCopy(finalProfile, strategy);
    demo = { ...demo, website_copy: copy, updated_at: new Date().toISOString() };
    await saveDemo(demo);

    const reviews = buildDemoReviews();
    const { config } = await runSiteDirector(finalProfile, strategy, assets, reviews);
    const qualityCheck = runDemoQualityCheck(finalProfile, copy, config, assets);
    const presentationReview = await runPresentationQualityReview(finalProfile, copy, config);
    const sendReadiness = computeSendReadiness(qualityCheck, presentationReview);

    demo = {
      ...demo,
      site_director_config: config,
      quality_check: qualityCheck,
      presentation_review: presentationReview,
      send_readiness: sendReadiness,
      status: "DRAFT",
      updated_at: new Date().toISOString(),
    };
    await saveDemo(demo);

    return demo;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo generation failed.";
    demo = { ...demo, status: "FAILED", failure_reason: message, updated_at: new Date().toISOString() };
    await saveDemo(demo);
    throw err;
  }
}

export type RegenerateStage = "strategy" | "copy" | "director";

// Regenerates a single stage in place. Never runs automatically — only via
// an explicit "Regenerate Strategy/Copy/Site Director" action in the editor.
export async function regenerateDemoStage(demo: Demo, stage: RegenerateStage): Promise<Demo> {
  if (!demo.business_profile) {
    throw new Error("Demo has no business profile yet — run Build Demo first.");
  }

  const { saveDemoVersionSnapshot } = await import("./store");
  await saveDemoVersionSnapshot(demo);

  let updated: Demo = { ...demo, status: "GENERATING", failure_reason: null, updated_at: new Date().toISOString() };
  await saveDemo(updated);

  try {
    if (stage === "strategy") {
      const strategy = await generateWebsiteStrategy(demo.business_profile);
      updated = { ...updated, website_strategy: strategy };
    } else if (stage === "copy") {
      if (!demo.website_strategy) throw new Error("Cannot regenerate copy without a website strategy.");
      const copy = await generateWebsiteCopy(demo.business_profile, demo.website_strategy);
      updated = { ...updated, website_copy: copy };
    } else if (stage === "director") {
      if (!demo.website_strategy) throw new Error("Cannot re-run the Site Director without a website strategy.");
      const { getDemoAssets } = await import("./store");
      const assets = await getDemoAssets(demo.id);
      const reviews = await getDemoReviews(demo.id);
      const { config } = await runSiteDirector(demo.business_profile, demo.website_strategy, assets, reviews);
      updated = { ...updated, site_director_config: config };
    }

    if (updated.business_profile && updated.website_copy && updated.site_director_config) {
      const { getDemoAssets } = await import("./store");
      const assets = await getDemoAssets(demo.id);
      const qualityCheck = runDemoQualityCheck(updated.business_profile, updated.website_copy, updated.site_director_config, assets);
      const presentationReview = await runPresentationQualityReview(updated.business_profile, updated.website_copy, updated.site_director_config);
      updated = {
        ...updated,
        quality_check: qualityCheck,
        presentation_review: presentationReview,
        send_readiness: computeSendReadiness(qualityCheck, presentationReview),
      };
    }

    updated = { ...updated, status: "DRAFT", updated_at: new Date().toISOString() };
    await saveDemo(updated);
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Regeneration failed.";
    const failed: Demo = { ...updated, status: "DRAFT", failure_reason: message, updated_at: new Date().toISOString() };
    await saveDemo(failed);
    throw err;
  }
}
