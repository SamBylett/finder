// Deterministic Site Director configuration used when the AI call fails, is
// unavailable, or returns invalid/unsupported JSON. Website generation must
// never depend entirely on AI. Built from the SAME composition engine the
// real director uses (composition.ts) so a fallback demo is still properly
// differentiated by archetype/composition-family/density, not one generic
// template.

import { chooseCompositionFamily, chooseContentDensity, compositionProfile } from "./composition";
import { archetypeMeta } from "./industry";
import type {
  CompositionFamily, DemoAsset, DemoBusinessProfile, HeroVariant, PaletteId, SectionConfig, SiteDirectorConfig, ThemeId,
} from "./types";

const FAMILY_THEME: Record<string, { theme: ThemeId; palette: PaletteId }> = {
  trades: { theme: "clean-light", palette: "slate-blue" },
  outdoor: { theme: "natural", palette: "forest-neutral" },
  professional: { theme: "clean-light", palette: "navy-sand" },
  automotive: { theme: "bold-local", palette: "graphite-orange" },
  generic_local_service: { theme: "clean-light", palette: "slate-blue" },
};

const PROFESSIONAL_FAMILIES: CompositionFamily[] = ["editorial_authority", "boutique_advisory", "modern_minimal"];

function defaultHeroVariant(family: CompositionFamily): HeroVariant {
  if (PROFESSIONAL_FAMILIES.includes(family)) return "professional-authority";
  if (family === "project_first" || family === "craft_premium") return "cinematic";
  return "editorial-split";
}

function defaultVariant(type: SectionConfig["type"], family: CompositionFamily, serviceCount: number): SectionConfig {
  const professional = PROFESSIONAL_FAMILIES.includes(family);
  switch (type) {
    case "hero":
      return { type, variant: defaultHeroVariant(family) };
    case "services":
      if (serviceCount >= 5) return { type, variant: "grid" };
      if (serviceCount <= 2) return { type, variant: "feature-panels" };
      return { type, variant: "editorial-rows" };
    case "gallery":
      return { type, variant: family === "project_first" || family === "craft_premium" ? "masonry" : "grid" };
    case "about":
      return { type, variant: family === "modern_minimal" ? "compact-story" : "trust-led" };
    case "who-we-help":
      return { type, variant: "simple-columns" };
    case "expertise":
      return { type, variant: professional ? "editorial-list" : "clean-list" };
    case "process":
      return { type, variant: "three-step" };
    case "reviews":
      return { type, variant: professional ? "featured" : "grid" };
    case "faq":
      return { type, variant: professional ? "structured-list" : "accordion" };
    case "cta":
      return { type, variant: professional ? "consultation" : "simple" };
    case "contact":
      return { type, variant: "standard" };
  }
}

export function fallbackSiteDirectorConfig(
  profile: DemoBusinessProfile,
  assets: DemoAsset[],
  reviewTextCount: number
): SiteDirectorConfig {
  const family = chooseCompositionFamily(profile, assets, reviewTextCount);
  const density = chooseContentDensity(profile);
  const { profile: compProfile, sections: skeleton } = compositionProfile(family, density);
  const { theme, palette } = FAMILY_THEME[profile.industry_family] ?? FAMILY_THEME.generic_local_service;
  const serviceCount = Math.max(profile.confirmed_services.length, 1);

  return {
    industryFamily: profile.industry_family,
    businessArchetype: profile.business_archetype,
    compositionFamily: family,
    compositionProfile: compProfile,
    contentDensity: density,
    theme,
    palette,
    navVariant: "standard",
    footerVariant: archetypeMeta(profile.business_archetype).professionalSections ? "compact" : "standard",
    sections: skeleton.map((type) => defaultVariant(type, family, serviceCount)),
  };
}
