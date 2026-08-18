// Deterministic rules that override the AI Site Director when it makes an
// obviously bad decision, applied after every AI response (fallback config
// is already correct-by-construction from composition.ts, but guardrails
// run on it too for a single, consistent enforcement point).

import { archetypeMeta } from "./industry";
import type { DemoAsset, DemoBusinessProfile, SectionConfig, SiteDirectorConfig } from "./types";

export function applyDeterministicGuardrails(
  config: SiteDirectorConfig,
  profile: DemoBusinessProfile,
  assets: DemoAsset[]
): SiteDirectorConfig {
  const meta = archetypeMeta(profile.business_archetype);
  const realGalleryAssets = assets.filter((a) => !a.placeholder && (a.type === "gallery" || a.type === "project")).length;

  let sections = config.sections;

  // Professional services (or any archetype we've marked gallery-unsuitable)
  // never get a project gallery, regardless of what the AI picked.
  if (meta.galleryEligibility === "unsuitable") {
    sections = sections.filter((s) => s.type !== "gallery");
  }

  // No real imagery to show -> drop the gallery even if the archetype
  // allows one and the AI included it (a gallery of placeholders is worse
  // than no gallery).
  if (realGalleryAssets === 0) {
    sections = sections.filter((s) => s.type !== "gallery");
  }

  // Strong visual archetype with real imagery but no gallery in the
  // skeleton/AI output — add one back in (visual proof is a strong signal
  // for these business types and shouldn't be lost to an AI omission).
  if (meta.galleryEligibility === "strong" && realGalleryAssets >= 2 && !sections.some((s) => s.type === "gallery")) {
    const servicesIndex = sections.findIndex((s) => s.type === "services");
    const insertAt = servicesIndex >= 0 ? servicesIndex + 1 : sections.length;
    const galleryVariant: SectionConfig = { type: "gallery", variant: "grid" };
    sections = [...sections.slice(0, insertAt), galleryVariant, ...sections.slice(insertAt)];
  }

  return { ...config, sections };
}
