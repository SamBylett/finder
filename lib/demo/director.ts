// SiteDirector — third AI call. Chooses ONLY from our approved enums; never
// writes code or CSS. Response is schema-constrained AND re-validated after
// parsing; any unsupported value or malformed response falls back to the
// deterministic per-industry config so rendering never depends entirely on AI.

import Anthropic from "@anthropic-ai/sdk";
import type {
  DemoAsset, DemoBusinessProfile, IndustryFamily, PaletteId, SectionConfig, SiteDirectorConfig, ThemeId, WebsiteStrategy,
} from "./types";
import { describeProfileForPrompt } from "./prompt-context";
import { fallbackSiteDirectorConfig } from "./fallback-config";

const MODEL = "claude-sonnet-5";

const THEME_IDS: ThemeId[] = ["clean-light", "premium-dark", "bold-local", "natural"];
const PALETTE_IDS: PaletteId[] = ["slate-blue", "charcoal-gold", "forest-neutral", "navy-sand", "graphite-orange"];
const NAV_VARIANTS = ["standard", "transparent-overlay", "compact"] as const;
const FOOTER_VARIANTS = ["standard", "compact"] as const;

const SECTION_VARIANTS: Record<SectionConfig["type"], readonly string[]> = {
  hero: ["full-image", "split-image", "trust-focused", "minimal"],
  "trust-bar": ["google-rating", "review-stats", "simple"],
  services: ["image-cards", "clean-cards", "alternating-rows", "compact-grid"],
  gallery: ["masonry", "grid", "featured-project"],
  about: ["split-image", "text-focused", "trust-led"],
  reviews: ["cards", "featured-grid", "simple-carousel"],
  "service-areas": ["list", "compact", "map-style"],
  faq: ["accordion"],
  cta: ["full-width", "image-background", "simple"],
  contact: ["standard", "split", "compact"],
};

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    theme: { type: "string", enum: THEME_IDS },
    palette: { type: "string", enum: PALETTE_IDS },
    navVariant: { type: "string", enum: NAV_VARIANTS },
    footerVariant: { type: "string", enum: FOOTER_VARIANTS },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: Object.keys(SECTION_VARIANTS) },
          variant: { type: "string" },
        },
        required: ["type", "variant"],
        additionalProperties: false,
      },
    },
  },
  required: ["theme", "palette", "navVariant", "footerVariant", "sections"],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

function isValidConfig(raw: unknown, industryFamily: IndustryFamily): SiteDirectorConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.theme !== "string" || !THEME_IDS.includes(r.theme as ThemeId)) return null;
  if (typeof r.palette !== "string" || !PALETTE_IDS.includes(r.palette as PaletteId)) return null;
  if (typeof r.navVariant !== "string" || !NAV_VARIANTS.includes(r.navVariant as (typeof NAV_VARIANTS)[number])) return null;
  if (typeof r.footerVariant !== "string" || !FOOTER_VARIANTS.includes(r.footerVariant as (typeof FOOTER_VARIANTS)[number])) return null;
  if (!Array.isArray(r.sections) || r.sections.length === 0) return null;

  const sections: SectionConfig[] = [];
  for (const s of r.sections) {
    if (!s || typeof s !== "object") return null;
    const type = (s as Record<string, unknown>).type;
    const variant = (s as Record<string, unknown>).variant;
    if (typeof type !== "string" || !(type in SECTION_VARIANTS)) return null;
    const allowedVariants = SECTION_VARIANTS[type as SectionConfig["type"]];
    if (typeof variant !== "string" || !allowedVariants.includes(variant)) return null;
    sections.push({ type, variant } as SectionConfig);
  }

  return {
    industryFamily,
    theme: r.theme as ThemeId,
    palette: r.palette as PaletteId,
    navVariant: r.navVariant as SiteDirectorConfig["navVariant"],
    footerVariant: r.footerVariant as SiteDirectorConfig["footerVariant"],
    sections,
  };
}

export async function runSiteDirector(
  profile: DemoBusinessProfile,
  strategy: WebsiteStrategy,
  assets: DemoAsset[]
): Promise<{ config: SiteDirectorConfig; usedFallback: boolean }> {
  const fallback = fallbackSiteDirectorConfig(profile.industry_family);

  if (!process.env.ANTHROPIC_API_KEY) {
    return { config: fallback, usedFallback: true };
  }

  try {
    const hasGallery = assets.some((a) => !a.placeholder && a.type === "gallery");
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 800,
      output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            `You are the Site Director for a speculative demo website. You do NOT write code or CSS — you only pick from ` +
            `the approved theme, palette, and section/variant options below, based on what suits this business.\n\n` +
            `Business data:\n${describeProfileForPrompt(profile)}\n\n` +
            `Strategy: tone=${strategy.tone}, visual direction=${strategy.visual_direction}, ` +
            `messaging angle=${strategy.messaging_angle}\n` +
            `Real gallery imagery available: ${hasGallery ? "yes" : "no — avoid gallery-heavy variants"}\n\n` +
            `Allowed themes: ${THEME_IDS.join(", ")}\n` +
            `Allowed palettes: ${PALETTE_IDS.join(", ")}\n` +
            `Allowed nav variants: ${NAV_VARIANTS.join(", ")}\n` +
            `Allowed footer variants: ${FOOTER_VARIANTS.join(", ")}\n` +
            `Allowed sections and their variants:\n` +
            Object.entries(SECTION_VARIANTS).map(([type, variants]) => `  ${type}: ${variants.join(", ")}`).join("\n") +
            `\n\nReturn a section order and variant choices that fit this industry and the strategy's visual direction. ` +
            `Include hero, services, about, faq, cta, and contact at minimum.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return { config: fallback, usedFallback: true };

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { config: fallback, usedFallback: true };

    const parsed = JSON.parse(textBlock.text);
    const validated = isValidConfig(parsed, profile.industry_family);
    if (!validated) return { config: fallback, usedFallback: true };

    return { config: validated, usedFallback: false };
  } catch {
    return { config: fallback, usedFallback: true };
  }
}
