// Core domain types for V2 — speculative website demo generation.
// Mirrors the provenance requirement in the spec: every fact we might put on
// a demo site is tagged with where it came from and how sure we are, so
// nothing gets promoted from a guess into copy as if it were confirmed.

export type IndustryFamily =
  | "trades"
  | "outdoor"
  | "professional"
  | "automotive"
  | "generic_local_service";

// Specific business type within a family — this is the level that actually
// drives which sections/CTAs/FAQ style/conversion model are appropriate.
// See lib/demo/industry.ts for the metadata (label, CTA library, FAQ
// examples, gallery eligibility) keyed by archetype.
export type BusinessArchetype =
  | "roofer" | "plumber" | "electrician" | "builder" | "heating_engineer" | "decorator" | "window_installer" | "general_trade"
  | "landscaper" | "garden_designer" | "fencing" | "driveway" | "tree_surgeon" | "garden_maintenance"
  | "accountant" | "tax_adviser" | "solicitor" | "financial_adviser" | "consultant" | "general_professional"
  | "garage" | "detailing" | "tyre_service" | "mot_centre"
  | "generic_local_service";

// What the site is actually asking the visitor to do — drives CTA wording
// and contact form shape. Never a generic "Get a quote" fallback for
// archetypes where that doesn't fit (see lib/demo/industry.ts ctaLibrary).
export type ConversionModel =
  | "quote_request" | "emergency_call" | "consultation" | "callback" | "appointment" | "enquiry" | "booking";

// How much real material we have to work with, per the DataRichnessScore
// (0-100, see lib/demo/richness.ts). Drives whether sections that need
// substance (About, gallery, service areas) get shown at full size,
// compact, or omitted — see lib/demo/composition.ts and the copy prompts.
export type ContentRichness = "RICH" | "GOOD" | "LIMITED" | "SPARSE";

// How much content the site should carry overall — derived from
// ContentRichness, consumed by composition.ts to decide section count and
// which variants suit a shorter vs fuller site.
export type ContentDensity = "minimal" | "standard" | "rich";

// How the business's location should be presented (V2.3). Deterministic,
// derived in profile.ts from archetype + confirmed address — never chosen by
// AI. A trade with a confirmed Google address is very often a home/
// registered address, not a customer-facing premises, so it must not get an
// exact map pin by default; a premises-based professional/retail business
// with a confirmed address should.
export type LocationMode = "physical_location" | "service_area" | "multiple_locations" | "location_hidden";

export type FactStatus = "CONFIRMED" | "INFERRED" | "UNKNOWN";

export interface Fact<T> {
  value: T | null;
  status: FactStatus;
  source: string | null; // e.g. "google_places", "website:homepage", "website:contact-page"
}

function confirmed<T>(value: T, source: string): Fact<T> {
  return { value, status: "CONFIRMED", source };
}

function unknown<T>(): Fact<T> {
  return { value: null, status: "UNKNOWN", source: null };
}

export const fact = { confirmed, unknown };

export interface DemoBusinessProfile {
  business_id: string;
  business_name: Fact<string>;
  // Raw Google/source category text — kept for provenance ONLY. Never used
  // as customer-facing positioning; see marketing_category.
  source_category: Fact<string>;
  // @deprecated alias of source_category, kept so existing callers that
  // read `.category` don't need to change; prefer source_category/marketing_category.
  category: Fact<string>;
  // Deterministically derived, customer-facing category label (e.g.
  // "Landscaping & Garden Design" instead of Google's "General Contractor").
  // Never AI-generated — see lib/demo/profile.ts.
  marketing_category: string;
  industry_family: IndustryFamily;
  business_archetype: BusinessArchetype;
  conversion_model: ConversionModel;
  content_richness: ContentRichness;
  data_richness_score: number; // 0-100, see lib/demo/richness.ts
  location_mode: LocationMode;
  latitude: number | null;
  longitude: number | null;
  address: Fact<string>;
  town_city: Fact<string>;
  postcode: Fact<string>;
  phone: Fact<string>;
  email: Fact<string>;
  website_url: Fact<string>;
  google_maps_url: Fact<string>;
  google_rating: Fact<number>;
  google_review_count: Fact<number>;
  facebook_url: Fact<string>;
  instagram_url: Fact<string>;
  confirmed_services: string[]; // only ever populated from confirmed sources
  service_areas: string[];
  business_description: Fact<string>;
  // Enrichment-derived facts (see lib/demo/enrichment.ts) — crawled from the
  // business's own first-party website only, each kept as plain confirmed
  // strings (provenance/confidence already filtered at extraction time).
  trust_credentials: string[];
  established_year: Fact<string>;
  customer_types: string[];
  website_weaknesses: string[]; // pulled from existing detected_issues / analysis_summary
  source_urls: string[];
}

export type DemoAssetType =
  | "logo"
  | "hero"
  | "project"
  | "gallery"
  | "team"
  | "location"
  | "social"
  | "placeholder";

export interface DemoAsset {
  id: string;
  demo_id: string;
  business_id: string;
  type: DemoAssetType;
  url: string;
  source_url: string | null;
  source_provider: string | null; // e.g. "google_places"
  business_owned: boolean;
  placeholder: boolean;
  width: number | null;
  height: number | null;
  selected: boolean;
  sort_order: number;
}

export interface DemoReview {
  id: string;
  demo_id: string;
  reviewer_name: string | null;
  rating: number | null;
  review_text: string | null;
  review_date: string | null;
  source: string; // e.g. "google"
  source_url: string | null;
}

export interface WebsiteStrategy {
  positioning: string;
  target_customer: string;
  primary_conversion_goal: string;
  primary_cta: string;
  secondary_cta: string | null;
  trust_signals: string[];
  priority_services: string[];
  visitor_questions: string[];
  messaging_angle: string;
  page_structure_recommendation: string;
  tone: string;
  visual_direction: string;
  local_seo_focus: string;
  seo_title: string;
  seo_description: string;
}

export interface ServiceCardCopy {
  name: string;
  description: string;
}

export interface FaqItemCopy {
  question: string;
  answer: string;
}

export interface WebsiteCopy {
  navigation_labels: string[];
  hero_eyebrow: string | null;
  hero_headline: string;
  hero_supporting_text: string;
  primary_cta: string;
  secondary_cta: string | null;
  trust_bar_text: string | null;
  services_intro: string;
  service_cards: ServiceCardCopy[];
  about: string;
  why_choose_us: string[];
  gallery_intro: string | null;
  testimonials_heading: string | null;
  service_area_content: string | null;
  faq: FaqItemCopy[];
  final_cta_heading: string;
  final_cta_body: string;
  contact_content: string;
  footer_content: string;
  seo_title: string;
  seo_description: string;
  // Professional-service-only content — null/empty when not applicable
  // (archetype.professionalSections === false). Never populated with
  // audiences/expertise/process steps that aren't safely inferable.
  who_we_help_intro: string | null;
  who_we_help_audiences: string[];
  expertise_intro: string | null;
  expertise_items: string[];
  process_intro: string | null;
  process_steps: string[];
}

export type ThemeId = "clean-light" | "premium-dark" | "bold-local" | "natural";

export type PaletteId = "slate-blue" | "charcoal-gold" | "forest-neutral" | "navy-sand" | "graphite-orange";

export type NavVariant = "standard" | "transparent-overlay" | "compact";
// Consolidated to 3 deliberately strong variants (was 5 weaker ones) — see
// V2.2: "3 excellent hero variants beats 10 average ones". Hero now also
// carries the integrated trust/reputation line that used to be the
// standalone TrustBar section (removed V2.4 — it was a cosmetic-only strip,
// see composition.ts).
export type HeroVariant = "cinematic" | "editorial-split" | "professional-authority";
export type ServicesVariant = "editorial-rows" | "feature-panels" | "grid";
export type GalleryVariant = "masonry" | "grid" | "featured-project";
export type AboutVariant = "editorial" | "trust-led" | "compact-story";
// Collapsed from 3 to 2 (V2.4) — the old "featured-grid"/"simple-carousel"
// split rendered identical card markup, just a different wrapping class.
export type ReviewsVariant = "featured" | "grid";
// V2.4: a second, non-accordion variant for professional-services families
// where an accordion reads as a generic SaaS-support-page pattern rather
// than a considered part of the page.
export type FaqVariant = "accordion" | "structured-list";
export type CtaVariant = "full-width" | "image-background" | "simple" | "consultation";
export type ContactVariant = "standard" | "split" | "compact";
export type FooterVariant = "standard" | "compact";
export type WhoWeHelpVariant = "audience-cards" | "simple-columns";
export type ExpertiseVariant = "clean-list" | "cards" | "editorial-list";
export type ProcessVariant = "three-step" | "numbered";

export type SectionConfig =
  | { type: "hero"; variant: HeroVariant }
  | { type: "services"; variant: ServicesVariant }
  | { type: "gallery"; variant: GalleryVariant }
  | { type: "about"; variant: AboutVariant }
  | { type: "who-we-help"; variant: WhoWeHelpVariant }
  | { type: "expertise"; variant: ExpertiseVariant }
  | { type: "process"; variant: ProcessVariant }
  | { type: "reviews"; variant: ReviewsVariant }
  | { type: "faq"; variant: FaqVariant }
  | { type: "cta"; variant: CtaVariant }
  | { type: "contact"; variant: ContactVariant };

// V2.4 composition-family architecture (lib/demo/composition.ts). Replaces
// CompositionStrategy, which only ever controlled which sections appear —
// every family here also owns HOW those sections look (width/spacing/
// typography/imagery/card usage), because the V2.4 design audit found that
// once a section existed, it rendered through an identical shared shell
// regardless of strategy. This is what makes composition genuinely affect
// the browser output, not just section inclusion.
export type CompositionFamily =
  | "editorial_authority" | "boutique_advisory" | "modern_minimal" // professional services
  | "project_first" | "local_authority" | "craft_premium"           // trades / home services
  | "standard_local";                                               // generic/automotive fallback

export type SectionWidth = "contained" | "wide" | "full-bleed";
export type SpacingScale = "compact" | "standard" | "generous";
export type TypographyEmphasis = "display" | "balanced";
export type ImageDominance = "none" | "supporting" | "dominant";
export type CardPolicy = "minimal" | "moderate" | "liberal";

export interface CompositionProfile {
  family: CompositionFamily;
  // Per-section-type width override; a section type absent from this map
  // uses "contained" (the previous universal behaviour) by default.
  sectionWidth: Partial<Record<SectionConfig["type"], SectionWidth>>;
  spacingScale: SpacingScale;
  typographyEmphasis: TypographyEmphasis;
  imageDominance: ImageDominance;
  cardPolicy: CardPolicy;
  // Default heading/content alignment for this family — editorial families
  // read left-aligned; only modern_minimal and CTA-style moments centre.
  align: "left" | "center";
}

export interface SiteDirectorConfig {
  industryFamily: IndustryFamily;
  businessArchetype: BusinessArchetype;
  compositionFamily: CompositionFamily;
  compositionProfile: CompositionProfile;
  contentDensity: ContentDensity;
  theme: ThemeId;
  palette: PaletteId;
  navVariant: NavVariant;
  footerVariant: FooterVariant;
  sections: SectionConfig[];
}

export type DemoStatus =
  | "NOT_STARTED"
  | "COLLECTING_DATA"
  | "GENERATING"
  | "DRAFT"
  | "READY_TO_SHARE"
  | "SHARED"
  | "CONVERTED"
  | "ARCHIVED"
  | "FAILED";

export type DemoPotentialTier = "EXCELLENT DEMO" | "GOOD DEMO" | "POSSIBLE" | "LOW VALUE";

export type DemoQualityStatus = "READY" | "NEEDS_REVIEW" | "NOT_READY";

// V2.3: this is conceptually the "TechnicalQualityCheck" from the spec —
// objective, deterministic checks (missing CTA, empty section, em dash,
// broken/placeholder content). Kept as DemoQualityCheck/quality_check for
// the type name and DB column since it predates the rename and nothing
// about its shape or purpose actually changed.
export interface DemoQualityCheck {
  status: DemoQualityStatus;
  issues: string[]; // human-readable, e.g. "Em dash found in hero_supporting_text"
  checkedAt: string;
}

// V2.3: PresentationQualityReview — a bounded, structured-output Claude call
// (see lib/demo/presentation-review.ts) that looks at the same things a
// human visually reviewing the demo would flag: does it look AI-generated/
// templated, is the composition varied, does it suit this archetype, is
// imagery used well. It never modifies anything — findings are advisory
// text tied to a 0-100 score, exactly like TechnicalQualityCheck is advisory.
// The "AIAppearanceAudit" concept from the spec is folded in here as
// ai_appearance_findings rather than a separate AI call, to keep generation
// latency/cost bounded to one extra call instead of two near-identical ones.
export interface PresentationQualityReview {
  score: number; // 0-100 — did the design make good use of what was available, not a feature-count tally
  strengths: string[];
  findings: string[]; // things that would make this feel AI-generated/templated to a business owner
  ai_appearance_findings: string[]; // specifically: repetitive structure, generic phrasing, filler sections, etc.
  checkedAt: string;
}

export type SendReadiness = "READY_TO_SEND" | "NEEDS_VISUAL_REVIEW" | "NOT_READY";

export interface Demo {
  id: string;
  business_id: string;
  slug: string;
  status: DemoStatus;
  sharing_enabled: boolean;
  show_demo_banner: boolean;
  demo_potential_score: number;
  demo_potential_tier: DemoPotentialTier;
  business_profile: DemoBusinessProfile | null;
  website_strategy: WebsiteStrategy | null;
  website_copy: WebsiteCopy | null;
  site_director_config: SiteDirectorConfig | null;
  theme_override: ThemeId | null;
  palette_override: PaletteId | null;
  custom_domain: string | null;
  production_mode: boolean;
  failure_reason: string | null;
  quality_check: DemoQualityCheck | null;
  presentation_review: PresentationQualityReview | null;
  send_readiness: SendReadiness | null;
  created_at: string;
  updated_at: string;
}
