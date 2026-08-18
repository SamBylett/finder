// SiteDirector — third AI call. Its job is NOT "choose attractive
// components" — it's "choose the right variant/theme for this specific
// business within a structure already determined by deterministic logic."
// The section list itself comes from composition.ts (pure function, not
// AI) — the AI only picks variants for that fixed list, plus theme/palette/
// nav/footer. Response is schema-constrained AND re-validated after
// parsing; any unsupported value or malformed response falls back to the
// deterministic config so rendering never depends entirely on AI.

import Anthropic from "@anthropic-ai/sdk";
import { chooseCompositionStrategy, sectionSkeleton } from "./composition";
import { archetypeMeta } from "./industry";
import { describeProfileForPrompt } from "./prompt-context";
import { fallbackSiteDirectorConfig } from "./fallback-config";
import { applyDeterministicGuardrails } from "./guardrails";
import type {
  DemoAsset, DemoBusinessProfile, DemoReview, PaletteId, SectionConfig, SiteDirectorConfig, ThemeId, WebsiteStrategy,
} from "./types";

const MODEL = "claude-sonnet-5";

const THEME_IDS: ThemeId[] = ["clean-light", "premium-dark", "bold-local", "natural"];
const PALETTE_IDS: PaletteId[] = ["slate-blue", "charcoal-gold", "forest-neutral", "navy-sand", "graphite-orange"];
const NAV_VARIANTS = ["standard", "transparent-overlay", "compact"] as const;
const FOOTER_VARIANTS = ["standard", "compact"] as const;

const SECTION_VARIANTS: Record<SectionConfig["type"], readonly string[]> = {
  hero: ["full-image", "split-image", "trust-focused", "minimal", "professional-authority"],
  "trust-bar": ["google-rating", "review-stats", "simple", "professional"],
  services: ["image-cards", "clean-cards", "alternating-rows", "compact-grid"],
  gallery: ["masonry", "grid", "featured-project"],
  about: ["split-image", "text-focused", "trust-led"],
  "who-we-help": ["audience-cards", "simple-columns"],
  expertise: ["clean-list", "cards"],
  process: ["three-step", "numbered"],
  reviews: ["cards", "featured-grid", "simple-carousel"],
  "service-areas": ["list", "compact", "map-style"],
  faq: ["accordion"],
  cta: ["full-width", "image-background", "simple", "consultation"],
  contact: ["standard", "split", "compact"],
};

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    theme: { type: "string", enum: THEME_IDS },
    palette: { type: "string", enum: PALETTE_IDS },
    navVariant: { type: "string", enum: NAV_VARIANTS },
    footerVariant: { type: "string", enum: FOOTER_VARIANTS },
    sectionVariants: {
      type: "object",
      description: "Map of section type -> chosen variant, one entry per section in the given skeleton, same order.",
      additionalProperties: { type: "string" },
    },
  },
  required: ["theme", "palette", "navVariant", "footerVariant", "sectionVariants"],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function isValidResponse(
  raw: unknown,
  skeleton: SectionConfig["type"][]
): { theme: ThemeId; palette: PaletteId; navVariant: (typeof NAV_VARIANTS)[number]; footerVariant: (typeof FOOTER_VARIANTS)[number]; sections: SectionConfig[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.theme !== "string" || !THEME_IDS.includes(r.theme as ThemeId)) return null;
  if (typeof r.palette !== "string" || !PALETTE_IDS.includes(r.palette as PaletteId)) return null;
  if (typeof r.navVariant !== "string" || !NAV_VARIANTS.includes(r.navVariant as (typeof NAV_VARIANTS)[number])) return null;
  if (typeof r.footerVariant !== "string" || !FOOTER_VARIANTS.includes(r.footerVariant as (typeof FOOTER_VARIANTS)[number])) return null;
  if (!r.sectionVariants || typeof r.sectionVariants !== "object") return null;

  const variantMap = r.sectionVariants as Record<string, unknown>;
  const sections: SectionConfig[] = [];
  for (const type of skeleton) {
    const variant = variantMap[type];
    const allowed = SECTION_VARIANTS[type];
    if (typeof variant !== "string" || !allowed.includes(variant)) return null;
    sections.push({ type, variant } as SectionConfig);
  }

  return {
    theme: r.theme as ThemeId,
    palette: r.palette as PaletteId,
    navVariant: r.navVariant as (typeof NAV_VARIANTS)[number],
    footerVariant: r.footerVariant as (typeof FOOTER_VARIANTS)[number],
    sections,
  };
}

export async function runSiteDirector(
  profile: DemoBusinessProfile,
  strategy: WebsiteStrategy,
  assets: DemoAsset[],
  reviews: DemoReview[]
): Promise<{ config: SiteDirectorConfig; usedFallback: boolean }> {
  const compositionStrategy = chooseCompositionStrategy(profile, assets, reviews.length);
  const skeleton = sectionSkeleton(compositionStrategy);
  const meta = archetypeMeta(profile.business_archetype);
  const fallback = fallbackSiteDirectorConfig(profile, assets, reviews.length);

  if (!process.env.ANTHROPIC_API_KEY) {
    return { config: fallback, usedFallback: true };
  }

  try {
    const hasGallery = assets.some((a) => !a.placeholder && a.type === "gallery");
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 900,
      output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            `You are the Site Director for a speculative demo website. The page STRUCTURE has already been decided for you ` +
            `by deterministic logic based on this business's type — your job is only to pick the best variant for each ` +
            `section in that fixed structure, plus an overall theme/palette/nav/footer. You do NOT write code or CSS and ` +
            `you CANNOT add, remove, or reorder sections.\n\n` +
            `Business data:\n${describeProfileForPrompt(profile)}\n\n` +
            `Composition strategy already chosen: ${compositionStrategy}\n` +
            `Fixed section order (in this exact order, you only choose each one's variant): ${skeleton.join(" -> ")}\n\n` +
            `Strategy: tone=${strategy.tone}, visual direction=${strategy.visual_direction}, ` +
            `messaging angle=${strategy.messaging_angle}\n` +
            `Real gallery imagery available: ${hasGallery ? "yes" : "no"}\n\n` +
            `Allowed themes: ${THEME_IDS.join(", ")}\n` +
            `Allowed palettes: ${PALETTE_IDS.join(", ")}\n` +
            `Allowed nav variants: ${NAV_VARIANTS.join(", ")}\n` +
            `Allowed footer variants: ${FOOTER_VARIANTS.join(", ")}\n` +
            `Allowed variants per section type:\n` +
            skeleton.map((type) => `  ${type}: ${SECTION_VARIANTS[type].join(", ")}`).join("\n") +
            `\n\nReturn sectionVariants as an object keyed by each section type above with your chosen variant. ` +
            (meta.professionalSections
              ? `This is a professional-services business — favour restrained, authoritative variants over trades-style ones.\n`
              : ``),
        },
      ],
    });

    if (response.stop_reason === "refusal") return { config: fallback, usedFallback: true };

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { config: fallback, usedFallback: true };

    const parsed = JSON.parse(textBlock.text);
    const validated = isValidResponse(parsed, skeleton);
    if (!validated) return { config: fallback, usedFallback: true };

    const config: SiteDirectorConfig = {
      industryFamily: profile.industry_family,
      businessArchetype: profile.business_archetype,
      compositionStrategy,
      theme: validated.theme,
      palette: validated.palette,
      navVariant: validated.navVariant,
      footerVariant: validated.footerVariant,
      sections: validated.sections,
    };

    return { config: applyDeterministicGuardrails(config, profile, assets), usedFallback: false };
  } catch {
    return { config: fallback, usedFallback: true };
  }
}
