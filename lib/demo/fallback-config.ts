// Deterministic Site Director configuration used when the AI call fails, is
// unavailable, or returns invalid/unsupported JSON. Website generation must
// never depend entirely on AI. Built from the SAME composition engine the
// real director uses (composition.ts) so a fallback demo is still properly
// differentiated by archetype/composition, not one generic template.

import { chooseCompositionStrategy, sectionSkeleton } from "./composition";
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
    case "portfolio_led":
    case "visual_first":
      return "split-image";
    case "professional_authority":
    case "minimal_professional":
      return "professional-authority";
    case "conversion_first":
      return "minimal";
    default:
      return "trust-focused";
  }
}

function defaultVariant(type: SectionConfig["type"], strategy: CompositionStrategy): SectionConfig {
  switch (type) {
    case "hero":
      return { type, variant: defaultHeroVariant(strategy) };
    case "trust-bar":
      return { type, variant: strategy === "professional_authority" || strategy === "minimal_professional" ? "professional" : "google-rating" };
    case "services":
      return { type, variant: strategy === "portfolio_led" || strategy === "visual_first" ? "image-cards" : "clean-cards" };
    case "gallery":
      return { type, variant: strategy === "portfolio_led" ? "masonry" : "grid" };
    case "about":
      return { type, variant: strategy === "minimal_professional" ? "text-focused" : "trust-led" };
    case "who-we-help":
      return { type, variant: "simple-columns" };
    case "expertise":
      return { type, variant: "clean-list" };
    case "process":
      return { type, variant: "three-step" };
    case "reviews":
      return { type, variant: "cards" };
    case "service-areas":
      return { type, variant: "compact" };
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
  const skeleton = sectionSkeleton(strategy);
  const { theme, palette } = FAMILY_THEME[profile.industry_family] ?? FAMILY_THEME.generic_local_service;

  return {
    industryFamily: profile.industry_family,
    businessArchetype: profile.business_archetype,
    compositionStrategy: strategy,
    theme,
    palette,
    navVariant: "standard",
    footerVariant: archetypeMeta(profile.business_archetype).professionalSections ? "compact" : "standard",
    sections: skeleton.map((type) => defaultVariant(type, strategy)),
  };
}
