// Deterministic composition-family architecture (V2.4). This is the
// architectural core of the demo generator: WHICH sections appear, in what
// order, AND how each one looks (width/spacing/typography/imagery/card
// usage) is decided by pure logic here, never by the AI Site Director. The
// AI only picks a variant/theme/palette within the fixed profile this
// module returns — see director.ts.
//
// V2.4 replaces the old CompositionStrategy (which only controlled section
// inclusion) with CompositionFamily + CompositionProfile, because the
// design audit found that once a section existed, it rendered through an
// identical shared shell (same Container, same py-20, same Card) regardless
// of strategy — genuine visual differentiation requires controlling HOW a
// section looks, not just whether it's there. See
// components/demo-site/section-primitives.tsx for what CompositionProfile
// actually drives.

import { archetypeMeta } from "./industry";
import type {
  CardPolicy, CompositionFamily, CompositionProfile, ContentDensity, DemoAsset, DemoBusinessProfile,
  ImageDominance, SectionConfig, SpacingScale, TypographyEmphasis,
} from "./types";

function realProjectAssets(assets: DemoAsset[]): DemoAsset[] {
  return assets.filter((a) => !a.placeholder && (a.type === "gallery" || a.type === "project"));
}

// "Reasonable size" gate from the V2.4 spec — width/height are captured on
// DemoAsset but were never read by anything before this. Missing metadata
// (null) is treated as acceptable rather than penalised, since several
// asset sources don't report dimensions; only a KNOWN small image counts
// against image-dominant eligibility.
function hasQualityImagery(assets: DemoAsset[], minCount: number): boolean {
  const usable = realProjectAssets(assets).filter((a) => a.width === null || a.width >= 600);
  return usable.length >= minCount;
}

export function chooseCompositionFamily(
  profile: DemoBusinessProfile,
  assets: DemoAsset[],
  reviewTextCount: number
): CompositionFamily {
  const meta = archetypeMeta(profile.business_archetype);
  const rating = profile.google_rating.status !== "UNKNOWN" ? profile.google_rating.value ?? 0 : 0;
  const reviewCount = profile.google_review_count.status !== "UNKNOWN" ? profile.google_review_count.value ?? 0 : 0;
  const strongReputation = rating >= 4.5 && reviewCount >= 20;

  if (meta.professionalSections) {
    const hasEvidence =
      profile.confirmed_services.length > 0 ||
      profile.business_description.status !== "UNKNOWN" ||
      profile.trust_credentials.length > 0;

    // Professional-services families NEVER use image-dominant composition
    // (spec: must look excellent with little/no imagery) — richness alone
    // decides the family here, imagery is irrelevant to this branch.
    if (profile.content_richness === "SPARSE" && !hasEvidence && reviewTextCount === 0) {
      return "modern_minimal";
    }
    if (profile.content_richness === "RICH" || profile.content_richness === "GOOD") {
      return "editorial_authority";
    }
    // LIMITED, or SPARSE-with-some-real-evidence (e.g. Ramji & Knight) — the
    // direct stress-test family: enough to say something, not enough for
    // the fuller editorial treatment.
    return "boutique_advisory";
  }

  // Trades / automotive / generic — imagery-led families require real,
  // reasonably-sized project photography AND content that isn't SPARSE.
  // Google Places photos exist independently of how much real service/
  // description copy we actually have — a business can have 3+ decent
  // photos and still have nothing to say (Your Portsmouth Plumbers: 0
  // confirmed services, unreachable website). Without this density check,
  // image-dominant families produced an 8-section skeleton the copy
  // couldn't fill, exactly the "structure heavier than content" problem
  // the spec warns against.
  if (profile.content_richness !== "SPARSE" && hasQualityImagery(assets, 3)) {
    return profile.industry_family === "outdoor" ? "craft_premium" : "project_first";
  }
  if (strongReputation) return "local_authority";
  return "standard_local";
}

interface FamilyBase {
  sections: SectionConfig["type"][];
  sectionWidth: Partial<Record<SectionConfig["type"], "contained" | "wide" | "full-bleed">>;
  spacingScale: SpacingScale;
  typographyEmphasis: TypographyEmphasis;
  imageDominance: ImageDominance;
  cardPolicy: CardPolicy;
  align: "left" | "center";
}

const FAMILY_BASE: Record<CompositionFamily, FamilyBase> = {
  editorial_authority: {
    sections: ["hero", "expertise", "about", "process", "reviews", "faq", "cta", "contact"],
    sectionWidth: { hero: "wide" },
    spacingScale: "standard",
    typographyEmphasis: "display",
    imageDominance: "none",
    cardPolicy: "minimal",
    align: "left",
  },
  boutique_advisory: {
    sections: ["hero", "expertise", "about", "process", "faq", "cta", "contact"],
    sectionWidth: {},
    spacingScale: "standard",
    typographyEmphasis: "display",
    imageDominance: "none",
    cardPolicy: "minimal",
    align: "left",
  },
  modern_minimal: {
    sections: ["hero", "about", "process", "faq", "cta", "contact"],
    sectionWidth: {},
    spacingScale: "generous",
    typographyEmphasis: "display",
    imageDominance: "none",
    cardPolicy: "minimal",
    align: "center",
  },
  project_first: {
    sections: ["hero", "gallery", "services", "about", "reviews", "faq", "cta", "contact"],
    sectionWidth: { hero: "full-bleed", gallery: "full-bleed" },
    spacingScale: "standard",
    typographyEmphasis: "balanced",
    imageDominance: "dominant",
    cardPolicy: "moderate",
    align: "left",
  },
  local_authority: {
    sections: ["hero", "services", "about", "reviews", "faq", "cta", "contact"],
    sectionWidth: { hero: "wide" },
    spacingScale: "standard",
    typographyEmphasis: "balanced",
    imageDominance: "supporting",
    cardPolicy: "moderate",
    align: "left",
  },
  craft_premium: {
    sections: ["hero", "gallery", "about", "services", "faq", "cta", "contact"],
    sectionWidth: { hero: "full-bleed", gallery: "full-bleed" },
    spacingScale: "generous",
    typographyEmphasis: "balanced",
    imageDominance: "dominant",
    cardPolicy: "minimal",
    align: "left",
  },
  standard_local: {
    sections: ["hero", "services", "faq", "cta", "contact"],
    sectionWidth: {},
    spacingScale: "compact",
    typographyEmphasis: "balanced",
    imageDominance: "none",
    cardPolicy: "minimal",
    align: "left",
  },
};

export function chooseContentDensity(profile: DemoBusinessProfile): ContentDensity {
  if (profile.content_richness === "RICH") return "rich";
  if (profile.content_richness === "SPARSE") return "minimal";
  return "standard";
}

// Density-adjusted profile + section list. A RICH editorial_authority site
// can afford a who-we-help section alongside expertise; a SPARSE business
// is ALWAYS forced to cardPolicy "minimal" + spacing "generous" regardless
// of what its family would otherwise default to — sparse data must never
// render as a card-grid-heavy page just because its family normally allows
// cards. Section order/types are returned separately from CompositionProfile
// (which only carries look-and-feel parameters) since director.ts needs the
// type list on its own to build the AI's fixed skeleton.
export function compositionProfile(
  family: CompositionFamily,
  density: ContentDensity
): { profile: CompositionProfile; sections: SectionConfig["type"][] } {
  const base = FAMILY_BASE[family];
  let sections = [...base.sections];

  if (family === "editorial_authority" && density === "rich") {
    const i = sections.indexOf("expertise");
    sections = [...sections.slice(0, i + 1), "who-we-help", ...sections.slice(i + 1)];
  }

  const sparse = density === "minimal";

  const profile: CompositionProfile = {
    family,
    sectionWidth: base.sectionWidth,
    spacingScale: sparse ? "generous" : base.spacingScale,
    typographyEmphasis: base.typographyEmphasis,
    imageDominance: base.imageDominance,
    cardPolicy: sparse ? "minimal" : base.cardPolicy,
    align: base.align,
  };

  return { profile, sections };
}
