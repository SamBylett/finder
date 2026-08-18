// Deterministic Site Director configuration used when the AI call fails, is
// unavailable, or returns invalid/unsupported JSON. Website generation must
// never depend entirely on AI. Built from the SAME composition engine the
// real director uses (composition.ts) so a fallback demo is still properly
// differentiated by archetype/composition/density, not one generic template.

import { chooseCompositionStrategy, chooseContentDensity, sectionSkeleton } from "./composition";
import { archetypeMeta } from "./industry";
import type {
  CompositionStrategy, DemoAsset, DemoBusinessProfile, HeroVariant, PaletteId, SectionConfig, SiteDirectorConfig, ThemeId,
} from "./types";

const FAMILY_THEME: Record<string, { theme: ThemeId; palette: PaletteId }> = {
  trades: { theme: "clean-light", palette: "slate-blue" },
  outdoor: { theme: "natural", palette: "forest-neutral" },
  professional: { theme: "clean-light", palette: "navy-sand" },
  automotive: { theme: "bold-local", palette: "graphite-orange" },
  generic_local_service: { theme: "clean-light", palette: "slate-blue" },
};

function defaultHeroVariant(strategy: CompositionStrategy): HeroVariant {
  switch (strategy) {
    case "professional_authority":
    case "minimal_professional":
      return "professional-authority";
    case "portfolio_led":
    case "visual_first":
      return "cinematic";
    default:
      return "editorial-split";
  }
}

function defaultVariant(type: SectionConfig["type"], strategy: CompositionStrategy, serviceCount: number): SectionConfig {
  switch (type) {
    case "hero":
      return { type, variant: defaultHeroVariant(strategy) };
    case "trust-bar":
      return { type, variant: strategy === "professional_authority" || strategy === "minimal_professional" ? "professional" : "google-rating" };
    case "services":
      if (serviceCount >= 5) return { type, variant: "grid" };
      if (serviceCount <= 2) return { type, variant: "feature-panels" };
      return { type, variant: "editorial-rows" };
    case "gallery":
      return { type, variant: strategy === "portfolio_led" ? "masonry" : "grid" };
    case "about":
      return { type, variant: strategy === "minimal_professional" ? "compact-story" : "trust-led" };
    case "who-we-help":
      return { type, variant: "simple-columns" };
    case "expertise":
      return { type, variant: "clean-list" };
    case "process":
      return { type, variant: "three-step" };
    case "reviews":
      return { type, variant: "cards" };
    case "faq":
      return { type, variant: "accordion" };
    case "cta":
      return { type, variant: strategy === "professional_authority" || strategy === "minimal_professional" ? "consultation" : "simple" };
    case "contact":
      return { type, variant: "standard" };
  }
}

export function fallbackSiteDirectorConfig(
  profile: DemoBusinessProfile,
  assets: DemoAsset[],
  reviewTextCount: number
): SiteDirectorConfig {
  const strategy = chooseCompositionStrategy(profile, assets, reviewTextCount);
  const density = chooseContentDensity(profile);
  const skeleton = sectionSkeleton(strategy, density);
  const { theme, palette } = FAMILY_THEME[profile.industry_family] ?? FAMILY_THEME.generic_local_service;
  const serviceCount = Math.max(profile.confirmed_services.length, 1);

  return {
    industryFamily: profile.industry_family,
    businessArchetype: profile.business_archetype,
    compositionStrategy: strategy,
    contentDensity: density,
    theme,
    palette,
    navVariant: "standard",
    footerVariant: archetypeMeta(profile.business_archetype).professionalSections ? "compact" : "standard",
    sections: skeleton.map((type) => defaultVariant(type, strategy, serviceCount)),
  };
}
