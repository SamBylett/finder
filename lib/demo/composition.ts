// Deterministic composition strategy. This is the architectural core of
// V2.1/V2.2: WHICH sections appear and in what order is decided by pure
// logic here, not by the AI Site Director. The AI only picks variants/
// theme/palette within the fixed skeleton this module returns — see
// director.ts. This guarantees genuine structural differentiation between
// businesses instead of relying on the model to reliably vary its own
// output, and lets contentDensity prune sections that would otherwise be
// near-empty (V2.2: a single-location "Service Area" section, for example,
// is never worth its own block — the town is already in the hero/contact).

import { archetypeMeta } from "./industry";
import type { CompositionStrategy, ContentDensity, DemoAsset, DemoBusinessProfile, SectionConfig } from "./types";

export function chooseCompositionStrategy(
  profile: DemoBusinessProfile,
  assets: DemoAsset[],
  reviewTextCount: number
): CompositionStrategy {
  const meta = archetypeMeta(profile.business_archetype);
  const realGalleryAssets = assets.filter((a) => !a.placeholder && (a.type === "gallery" || a.type === "project")).length;
  const rating = profile.google_rating.status !== "UNKNOWN" ? profile.google_rating.value ?? 0 : 0;
  const reviewCount = profile.google_review_count.status !== "UNKNOWN" ? profile.google_review_count.value ?? 0 : 0;
  const strongReputation = rating >= 4.5 && reviewCount >= 20;

  if (meta.professionalSections) {
    // Real testimonial text is strong enough trust evidence to justify the
    // fuller layout even when other content is otherwise sparse.
    const sparse = profile.content_richness === "SPARSE" && reviewTextCount === 0;
    return sparse ? "minimal_professional" : "professional_authority";
  }

  if (meta.galleryEligibility === "strong" && realGalleryAssets >= 4 && reviewCount >= 20) {
    return "portfolio_led";
  }

  if (meta.conversionModel === "emergency_call" || meta.conversionModel === "callback") {
    return "conversion_first";
  }

  if (meta.galleryEligibility === "strong" && realGalleryAssets >= 2) {
    return "visual_first";
  }

  if (strongReputation) {
    return "trust_first";
  }

  return "service_first";
}

export function chooseContentDensity(profile: DemoBusinessProfile): ContentDensity {
  if (profile.content_richness === "RICH") return "rich";
  if (profile.content_richness === "SPARSE") return "minimal";
  return "standard";
}

// Ordered section TYPES only — the AI fills in variants. Kept intentionally
// as plain type lists so a composition's structure is legible at a glance.
// "service-areas" is deliberately never included: we only ever have a
// single confirmed town/city (see profile.ts), and a dedicated section for
// one location is exactly the near-empty-block problem V2.2 fixes — the
// town already appears in the hero subtext, About, and Contact address.
export function sectionSkeleton(strategy: CompositionStrategy, density: ContentDensity): SectionConfig["type"][] {
  switch (strategy) {
    case "portfolio_led":
      return ["hero", "gallery", "services", "trust-bar", "about", "reviews", "faq", "cta", "contact"];

    case "visual_first":
      return ["hero", "trust-bar", "services", "gallery", "about", "reviews", "faq", "cta", "contact"];

    case "conversion_first":
      return ["hero", "trust-bar", "services", "cta", "faq", "contact"];

    case "trust_first":
      return ["hero", "trust-bar", "services", "about", "reviews", "faq", "cta", "contact"];

    case "professional_authority": {
      const base: SectionConfig["type"][] = ["hero", "trust-bar", "who-we-help", "expertise", "about", "process", "reviews", "faq", "cta", "contact"];
      // A minimal-density professional business rarely has enough to
      // support both Who We Help and Expertise as separate sections —
      // Expertise alone (grounded in confirmed services/category) is the
      // stronger of the two when only one can be justified.
      return density === "minimal" ? base.filter((s) => s !== "who-we-help") : base;
    }

    case "minimal_professional":
      return ["hero", "trust-bar", "about", "process", "faq", "cta", "contact"];

    case "service_first":
    default:
      return ["hero", "trust-bar", "services", "about", "faq", "cta", "contact"];
  }
}
