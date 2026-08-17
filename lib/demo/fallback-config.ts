// Deterministic Site Director configuration used when the AI call fails, is
// unavailable, or returns invalid/unsupported JSON. Website generation must
// never depend entirely on AI — this guarantees a demo can always render.

import type { IndustryFamily, SiteDirectorConfig } from "./types";

const BASE_SECTIONS: SiteDirectorConfig["sections"] = [
  { type: "hero", variant: "split-image" },
  { type: "trust-bar", variant: "google-rating" },
  { type: "services", variant: "clean-cards" },
  { type: "gallery", variant: "grid" },
  { type: "about", variant: "split-image" },
  { type: "reviews", variant: "cards" },
  { type: "service-areas", variant: "compact" },
  { type: "faq", variant: "accordion" },
  { type: "cta", variant: "full-width" },
  { type: "contact", variant: "standard" },
];

const FALLBACKS: Record<IndustryFamily, SiteDirectorConfig> = {
  trades: {
    industryFamily: "trades",
    theme: "clean-light",
    palette: "slate-blue",
    navVariant: "standard",
    footerVariant: "standard",
    sections: BASE_SECTIONS,
  },
  outdoor: {
    industryFamily: "outdoor",
    theme: "natural",
    palette: "forest-neutral",
    navVariant: "standard",
    footerVariant: "standard",
    sections: BASE_SECTIONS,
  },
  professional: {
    industryFamily: "professional",
    theme: "clean-light",
    palette: "navy-sand",
    navVariant: "standard",
    footerVariant: "compact",
    sections: [
      { type: "hero", variant: "trust-focused" },
      { type: "trust-bar", variant: "simple" },
      { type: "services", variant: "clean-cards" },
      { type: "about", variant: "text-focused" },
      { type: "reviews", variant: "cards" },
      { type: "faq", variant: "accordion" },
      { type: "cta", variant: "simple" },
      { type: "contact", variant: "standard" },
    ],
  },
  automotive: {
    industryFamily: "automotive",
    theme: "bold-local",
    palette: "graphite-orange",
    navVariant: "standard",
    footerVariant: "standard",
    sections: BASE_SECTIONS,
  },
  generic_local_service: {
    industryFamily: "generic_local_service",
    theme: "clean-light",
    palette: "slate-blue",
    navVariant: "standard",
    footerVariant: "standard",
    sections: BASE_SECTIONS,
  },
};

export function fallbackSiteDirectorConfig(industryFamily: IndustryFamily): SiteDirectorConfig {
  return FALLBACKS[industryFamily];
}
