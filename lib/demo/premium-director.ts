// PremiumDesignDirector (V2.3) — a deterministic refinement pass applied
// after composition.ts + the AI Site Director + guardrails.ts, not a fourth
// AI call. The spec asks for a layer that evaluates the proposed site and
// "chooses/refines approved presentation options" from validated enums only
// — that's exactly what the rest of this pipeline already does with pure
// functions (composition.ts for structure, guardrails.ts for AI-output
// correction). This module is the same kind of thing, scoped to two
// specific premium-quality problems visual review surfaced that neither of
// those covered:
//
//   1. Sparse professional-services sites still ran too long (spec #6):
//      "maximum sensible section count unless there is actual supporting
//      content" — a minimal_professional business with genuinely nothing to
//      say in Process shouldn't get a Process section just because the
//      skeleton includes one by default.
//   2. Card-grid overuse on professional sites (spec #18): "cards are a
//      component choice, not the default representation of information" —
//      nudges LIMITED/SPARSE professional sites toward list-style variants
//      instead of card grids, which read as more editorial and less
//      templated with little content to fill a grid.
//
// Deliberately NOT a new AI call: reliability (composition structure must
// never depend on the model complying with yet another prompt) and latency/
// cost (every demo generation already makes 3 AI calls; this keeps the
// count from becoming 5).

import type { DemoBusinessProfile, SectionConfig, SiteDirectorConfig } from "./types";

export function applyPremiumDesignDirector(
  config: SiteDirectorConfig,
  profile: DemoBusinessProfile
): SiteDirectorConfig {
  let sections = config.sections;

  // 1. Sparse professional sites: drop Process if there's nothing behind it.
  // A generic 3-step "get in touch / discuss / receive advice" process adds
  // a whole section for zero real information when we don't have confirmed
  // services, a description, or trust credentials to justify it existing.
  if (config.compositionStrategy === "minimal_professional") {
    const hasSupportingContent =
      profile.confirmed_services.length > 0 ||
      profile.business_description.status !== "UNKNOWN" ||
      profile.trust_credentials.length > 0;
    if (!hasSupportingContent) {
      sections = sections.filter((s) => s.type !== "process");
    }
  }

  // 2. Card-reduction rule: LIMITED/SPARSE professional-services sites
  // favour list/column variants over card grids — a 2-3 item card grid
  // with lots of empty padding reads as templated; a clean list reads as
  // deliberate. Only downgrades variants already known to be card-shaped;
  // never touches trades archetypes, where card grids suit richer content.
  const sparseProfessional =
    config.industryFamily === "professional" &&
    (profile.content_richness === "LIMITED" || profile.content_richness === "SPARSE");

  if (sparseProfessional) {
    sections = sections.map((s): SectionConfig => {
      if (s.type === "expertise" && s.variant === "cards") return { type: "expertise", variant: "clean-list" };
      if (s.type === "who-we-help" && s.variant === "audience-cards") return { type: "who-we-help", variant: "simple-columns" };
      if (s.type === "trust-bar" && (s.variant === "review-stats" || s.variant === "google-rating")) {
        return { type: "trust-bar", variant: "professional" };
      }
      return s;
    });
  }

  return { ...config, sections };
}
