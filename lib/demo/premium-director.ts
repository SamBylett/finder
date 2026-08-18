// PremiumDesignDirector — a deterministic refinement pass applied after
// composition.ts + the AI Site Director + guardrails.ts, not another AI
// call. It's the enforcer for CompositionProfile's constraints (V2.4),
// mirroring how guardrails.ts already enforces gallery eligibility: the AI
// can pick any allowed variant, but this pass corrects picks that violate
// what the deterministic profile actually decided.
//
// Deliberately NOT a new AI call: reliability (composition must never
// depend on the model complying with yet another prompt) and latency/cost
// (every demo generation already makes 3-4 AI calls; this keeps the count
// down).

import type { DemoBusinessProfile, DemoReview, SectionConfig, SiteDirectorConfig, WebsiteCopy } from "./types";

const MAX_SECTIONS_SPARSE_PROFESSIONAL = 6;

export function applyPremiumDesignDirector(
  config: SiteDirectorConfig,
  profile: DemoBusinessProfile,
  copy: WebsiteCopy,
  reviews: DemoReview[]
): SiteDirectorConfig {
  let sections = config.sections;
  const { family, cardPolicy } = config.compositionProfile;

  // 0. Drop sections the copy genuinely can't support — this is the same
  // threshold each component already self-guards on (Expertise.tsx hides
  // itself below 2 items, Reviews.tsx hides itself with no review text),
  // but pruning it here means TechnicalQualityCheck never sees a section
  // "present" that was always going to render as nothing, and the AI Site
  // Director never wastes a variant choice on it.
  if (copy.expertise_items.length < 2) sections = sections.filter((s) => s.type !== "expertise");
  if (reviews.length === 0) sections = sections.filter((s) => s.type !== "reviews");

  // 1. Sparse professional sites: drop Process if there's nothing behind it.
  // A generic 3-step "get in touch / discuss / receive advice" process adds
  // a whole section for zero real information when we don't have confirmed
  // services, a description, or trust credentials to justify it existing.
  if (family === "modern_minimal" || family === "boutique_advisory") {
    const hasSupportingContent =
      profile.confirmed_services.length > 0 ||
      profile.business_description.status !== "UNKNOWN" ||
      profile.trust_credentials.length > 0;
    if (!hasSupportingContent) {
      sections = sections.filter((s) => s.type !== "process");
    }
  }

  // 2. Card-policy enforcement: any family/density combination whose
  // resolved cardPolicy is "minimal" gets card-shaped variants downgraded
  // to their list/editorial equivalent — a 2-3 item card grid with lots of
  // empty padding reads as templated; a list reads as deliberate.
  if (cardPolicy === "minimal") {
    const professional = family === "editorial_authority" || family === "boutique_advisory" || family === "modern_minimal";
    sections = sections.map((s): SectionConfig => {
      if (s.type === "expertise" && s.variant === "cards") {
        return { type: "expertise", variant: professional ? "editorial-list" : "clean-list" };
      }
      if (s.type === "who-we-help" && s.variant === "audience-cards") return { type: "who-we-help", variant: "simple-columns" };
      if (s.type === "services" && s.variant === "grid") return { type: "services", variant: "editorial-rows" };
      if (s.type === "reviews" && s.variant === "grid" && professional) return { type: "reviews", variant: "featured" };
      return s;
    });
  }

  // 3. Hard section-count cap for sparse professional businesses — "a five
  // or six section premium website is better than a nine-section generic
  // one" (V2.4 spec). Trims from the end, keeping hero/faq/cta/contact
  // (the load-bearing sections) and dropping mid-page content sections
  // first if somehow still over the cap.
  if ((family === "modern_minimal" || family === "boutique_advisory") && sections.length > MAX_SECTIONS_SPARSE_PROFESSIONAL) {
    const protectedTypes: SectionConfig["type"][] = ["hero", "faq", "cta", "contact"];
    const trimmable = sections.filter((s) => !protectedTypes.includes(s.type));
    const overBy = sections.length - MAX_SECTIONS_SPARSE_PROFESSIONAL;
    const toDrop = new Set(trimmable.slice(trimmable.length - overBy).map((s) => s.type));
    sections = sections.filter((s) => !toDrop.has(s.type));
  }

  return { ...config, sections };
}
