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
  category: Fact<string>;
  industry_family: IndustryFamily;
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
}

export type ThemeId = "clean-light" | "premium-dark" | "bold-local" | "natural";

export type PaletteId = "slate-blue" | "charcoal-gold" | "forest-neutral" | "navy-sand" | "graphite-orange";

export type NavVariant = "standard" | "transparent-overlay" | "compact";
export type HeroVariant = "full-image" | "split-image" | "trust-focused" | "minimal";
export type TrustBarVariant = "google-rating" | "review-stats" | "simple";
export type ServicesVariant = "image-cards" | "clean-cards" | "alternating-rows" | "compact-grid";
export type GalleryVariant = "masonry" | "grid" | "featured-project";
export type AboutVariant = "split-image" | "text-focused" | "trust-led";
export type ReviewsVariant = "cards" | "featured-grid" | "simple-carousel";
export type ServiceAreasVariant = "list" | "compact" | "map-style";
export type FaqVariant = "accordion";
export type CtaVariant = "full-width" | "image-background" | "simple";
export type ContactVariant = "standard" | "split" | "compact";
export type FooterVariant = "standard" | "compact";

export type SectionConfig =
  | { type: "hero"; variant: HeroVariant }
  | { type: "trust-bar"; variant: TrustBarVariant }
  | { type: "services"; variant: ServicesVariant }
  | { type: "gallery"; variant: GalleryVariant }
  | { type: "about"; variant: AboutVariant }
  | { type: "reviews"; variant: ReviewsVariant }
  | { type: "service-areas"; variant: ServiceAreasVariant }
  | { type: "faq"; variant: FaqVariant }
  | { type: "cta"; variant: CtaVariant }
  | { type: "contact"; variant: ContactVariant };

export interface SiteDirectorConfig {
  industryFamily: IndustryFamily;
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
  created_at: string;
  updated_at: string;
}
