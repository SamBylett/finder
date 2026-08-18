// Industry taxonomy. Two levels:
//   - IndustryFamily: broad, controls overall visual language (theme leaning)
//   - BusinessArchetype: specific, controls which sections/CTAs/FAQ style/
//     conversion model are appropriate. This is the level that actually
//     differentiates a roofer from a landscaper from an accountant.
//
// Google's category text is NEVER used directly as marketing-facing
// positioning — see marketingCategoryLabel below and profile.ts, which uses
// it only for archetype resolution and keeps the raw text as source_category.

import type { BusinessArchetype, ConversionModel, IndustryFamily } from "./types";

export const INDUSTRY_FAMILY_LABELS: Record<IndustryFamily, string> = {
  trades: "Trades",
  outdoor: "Outdoor & Landscaping",
  professional: "Professional Services",
  automotive: "Automotive",
  generic_local_service: "Local Service",
};

export type GalleryEligibility = "strong" | "possible" | "unsuitable";

export interface ArchetypeMeta {
  family: IndustryFamily;
  // Human, customer-facing category label — deliberately NOT the raw Google
  // category. Used as the fallback marketing_category when we can't derive
  // something better from confirmed services.
  marketingCategoryLabel: string;
  conversionModel: ConversionModel;
  galleryEligibility: GalleryEligibility;
  // Whether this archetype should be able to claim emergency/urgent
  // availability by default (still requires evidence — see profile.ts).
  canClaimEmergency: boolean;
  ctaLibrary: {
    hero: string;
    mid: string;
    final: string;
    phone: string;
    form: string;
  };
  faqExamples: string[];
  // Professional-service-only sections this archetype should prefer over
  // trades-style gallery/coverage sections.
  professionalSections: boolean;
}

const TRADE_CTA = {
  hero: "Request a Free Quote",
  mid: "Discuss Your Project",
  final: "Get Your Quote",
  phone: "Call Now",
  form: "Request a Quote",
};

const PROFESSIONAL_CTA = {
  hero: "Arrange a Conversation",
  mid: "Discuss Your Requirements",
  final: "Speak to the Team",
  phone: "Call the Team",
  form: "Send Enquiry",
};

const ARCHETYPES: Record<BusinessArchetype, ArchetypeMeta> = {
  // --- trades ---
  roofer: {
    family: "trades", marketingCategoryLabel: "Roofing Contractor", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: { hero: "Request a Free Quote", mid: "Discuss Your Roofing Work", final: "Get Your Roofing Quote", phone: "Call Now", form: "Request a Quote" },
    faqExamples: ["What areas do you cover?", "How do I request a quote?", "Can you assess a leaking roof?", "What information should I provide when I contact you?"],
    professionalSections: false,
  },
  plumber: {
    family: "trades", marketingCategoryLabel: "Plumbing Services", conversionModel: "emergency_call",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { hero: "Call Now", mid: "Discuss Your Plumbing Issue", final: "Get in Touch", phone: "Call Now", form: "Request a Callback" },
    faqExamples: ["Do you cover my area?", "How quickly can you respond?", "Can I get a quote before booking?", "What information should I have ready when I call?"],
    professionalSections: false,
  },
  electrician: {
    family: "trades", marketingCategoryLabel: "Electrical Services", conversionModel: "quote_request",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["What areas do you cover?", "How do I request a quote?", "What electrical work do you carry out?", "How do I get in touch?"],
    professionalSections: false,
  },
  builder: {
    family: "trades", marketingCategoryLabel: "Building Contractor", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["What areas do you cover?", "How do I request a quote?", "What types of building work do you take on?", "How do I get started?"],
    professionalSections: false,
  },
  heating_engineer: {
    family: "trades", marketingCategoryLabel: "Heating Services", conversionModel: "callback",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { ...TRADE_CTA, hero: "Request a Callback" }, faqExamples: ["What areas do you cover?", "How do I arrange a visit?", "What heating work do you carry out?", "How do I get in touch?"],
    professionalSections: false,
  },
  decorator: {
    family: "trades", marketingCategoryLabel: "Decorating Services", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["What areas do you cover?", "How do I request a quote?", "What decorating work do you take on?", "How do I get started?"],
    professionalSections: false,
  },
  window_installer: {
    family: "trades", marketingCategoryLabel: "Window & Glazing Services", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["What areas do you cover?", "How do I request a quote?", "What types of windows do you install?", "How do I get in touch?"],
    professionalSections: false,
  },
  general_trade: {
    family: "trades", marketingCategoryLabel: "Local Trade Services", conversionModel: "quote_request",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["What areas do you cover?", "How do I request a quote?", "What work do you take on?", "How do I get in touch?"],
    professionalSections: false,
  },

  // --- outdoor ---
  landscaper: {
    family: "outdoor", marketingCategoryLabel: "Landscaping & Garden Design", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: { hero: "Request a Quote", mid: "Discuss Your Garden", final: "Start Your Project", phone: "Call Now", form: "Request a Quote" },
    faqExamples: ["How do I request a quote?", "What areas do you cover?", "Can I discuss ideas before deciding on the work?", "How do I get started?"],
    professionalSections: false,
  },
  garden_designer: {
    family: "outdoor", marketingCategoryLabel: "Garden Design", conversionModel: "consultation",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: { hero: "Discuss Your Garden", mid: "Arrange a Consultation", final: "Start Your Project", phone: "Call Now", form: "Request a Consultation" },
    faqExamples: ["How do I arrange a consultation?", "What areas do you cover?", "Can you work from an existing idea?", "How do I get started?"],
    professionalSections: false,
  },
  fencing: {
    family: "outdoor", marketingCategoryLabel: "Fencing Services", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["How do I request a quote?", "What areas do you cover?", "What fencing options do you offer?", "How do I get started?"],
    professionalSections: false,
  },
  driveway: {
    family: "outdoor", marketingCategoryLabel: "Driveway Installation", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["How do I request a quote?", "What areas do you cover?", "What driveway materials do you work with?", "How do I get started?"],
    professionalSections: false,
  },
  tree_surgeon: {
    family: "outdoor", marketingCategoryLabel: "Tree Surgery", conversionModel: "quote_request",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: TRADE_CTA, faqExamples: ["How do I request a quote?", "What areas do you cover?", "What tree work do you carry out?", "How do I get in touch?"],
    professionalSections: false,
  },
  garden_maintenance: {
    family: "outdoor", marketingCategoryLabel: "Garden Maintenance", conversionModel: "booking",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { ...TRADE_CTA, hero: "Book a Visit" }, faqExamples: ["How do I book a visit?", "What areas do you cover?", "What maintenance work do you offer?", "How do I get started?"],
    professionalSections: false,
  },

  // --- professional ---
  accountant: {
    family: "professional", marketingCategoryLabel: "Accountancy Services", conversionModel: "consultation",
    galleryEligibility: "unsuitable", canClaimEmergency: false,
    ctaLibrary: { hero: "Book a Consultation", mid: "Discuss Your Accounting Needs", final: "Speak to the Team", phone: "Call the Team", form: "Send Enquiry" },
    faqExamples: ["Do you work with individuals as well as businesses?", "How do I arrange an initial conversation?", "Where are you based?", "What should I have ready when I get in touch?"],
    professionalSections: true,
  },
  tax_adviser: {
    family: "professional", marketingCategoryLabel: "Tax Advisory Services", conversionModel: "consultation",
    galleryEligibility: "unsuitable", canClaimEmergency: false,
    ctaLibrary: { hero: "Speak to a Tax Adviser", mid: "Discuss Your Tax Position", final: "Speak to the Team", phone: "Call the Team", form: "Send Enquiry" },
    faqExamples: ["What kind of tax matters can you help with?", "Do you work with individuals as well as businesses?", "How do I arrange an initial conversation?", "What should I have ready when I get in touch?"],
    professionalSections: true,
  },
  solicitor: {
    family: "professional", marketingCategoryLabel: "Legal Services", conversionModel: "consultation",
    galleryEligibility: "unsuitable", canClaimEmergency: false,
    ctaLibrary: { hero: "Arrange a Consultation", mid: "Discuss Your Matter", final: "Speak to the Team", phone: "Call the Team", form: "Send Enquiry" },
    faqExamples: ["What areas of law do you cover?", "How do I arrange an initial consultation?", "Where are you based?", "What should I have ready when I get in touch?"],
    professionalSections: true,
  },
  financial_adviser: {
    family: "professional", marketingCategoryLabel: "Financial Advice", conversionModel: "consultation",
    galleryEligibility: "unsuitable", canClaimEmergency: false,
    ctaLibrary: { hero: "Book a Consultation", mid: "Discuss Your Situation", final: "Speak to an Adviser", phone: "Call the Team", form: "Send Enquiry" },
    faqExamples: ["What areas of financial advice do you cover?", "How do I arrange an initial conversation?", "Where are you based?", "What should I have ready when I get in touch?"],
    professionalSections: true,
  },
  consultant: {
    family: "professional", marketingCategoryLabel: "Consultancy Services", conversionModel: "enquiry",
    galleryEligibility: "unsuitable", canClaimEmergency: false,
    ctaLibrary: PROFESSIONAL_CTA, faqExamples: ["What services do you offer?", "How do I get in touch?", "Where are you based?", "What should I have ready when I get in touch?"],
    professionalSections: true,
  },
  general_professional: {
    family: "professional", marketingCategoryLabel: "Professional Services", conversionModel: "enquiry",
    galleryEligibility: "unsuitable", canClaimEmergency: false,
    ctaLibrary: PROFESSIONAL_CTA, faqExamples: ["What services do you offer?", "How do I get in touch?", "Where are you based?", "What should I have ready when I get in touch?"],
    professionalSections: true,
  },

  // --- automotive ---
  garage: {
    family: "automotive", marketingCategoryLabel: "Vehicle Servicing & Repairs", conversionModel: "booking",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { ...TRADE_CTA, hero: "Book Your Vehicle In" }, faqExamples: ["How do I book my vehicle in?", "What areas do you cover?", "What work do you carry out?", "How do I get in touch?"],
    professionalSections: false,
  },
  detailing: {
    family: "automotive", marketingCategoryLabel: "Vehicle Detailing", conversionModel: "booking",
    galleryEligibility: "strong", canClaimEmergency: false,
    ctaLibrary: { ...TRADE_CTA, hero: "Book a Detail" }, faqExamples: ["How do I book?", "What areas do you cover?", "What detailing packages do you offer?", "How do I get in touch?"],
    professionalSections: false,
  },
  tyre_service: {
    family: "automotive", marketingCategoryLabel: "Tyre Services", conversionModel: "callback",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { ...TRADE_CTA, hero: "Request a Callback" }, faqExamples: ["How do I get a price?", "What areas do you cover?", "What tyre brands do you stock?", "How do I get in touch?"],
    professionalSections: false,
  },
  mot_centre: {
    family: "automotive", marketingCategoryLabel: "MOT Testing", conversionModel: "booking",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { ...TRADE_CTA, hero: "Book Your MOT" }, faqExamples: ["How do I book an MOT?", "What areas do you cover?", "What else do you offer alongside MOTs?", "How do I get in touch?"],
    professionalSections: false,
  },

  generic_local_service: {
    family: "generic_local_service", marketingCategoryLabel: "Local Service", conversionModel: "enquiry",
    galleryEligibility: "possible", canClaimEmergency: false,
    ctaLibrary: { hero: "Get in Touch", mid: "Discuss Your Requirements", final: "Contact the Team", phone: "Call Now", form: "Send Enquiry" },
    faqExamples: ["What areas do you cover?", "How do I get in touch?", "What services do you offer?", "How do I get started?"],
    professionalSections: false,
  },
};

export function archetypeMeta(archetype: BusinessArchetype): ArchetypeMeta {
  return ARCHETYPES[archetype];
}

// Ordered so more specific terms are checked before generic ones within a
// family (e.g. "tax" before generic "account", "garden design" before
// generic "landscap").
const ARCHETYPE_KEYWORDS: [BusinessArchetype, string[]][] = [
  // trades
  ["roofer", ["roof"]],
  ["plumber", ["plumb"]],
  ["electrician", ["electric"]],
  ["heating_engineer", ["heating", "boiler", "gas engineer"]],
  ["decorator", ["decorat", "paint"]],
  ["window_installer", ["window", "glaz"]],
  ["builder", ["builder", "construction", "extension", "loft", "carpent", "joiner", "handyman", "kitchen fitter"]],

  // outdoor
  ["tree_surgeon", ["tree surgeon", "arboris"]],
  ["fencing", ["fenc"]],
  ["driveway", ["driveway", "paving", "patio"]],
  ["garden_designer", ["garden design"]],
  ["garden_maintenance", ["garden maintenance", "lawn", "turf", "groundwork"]],
  ["landscaper", ["landscap", "garden"]],

  // professional
  ["tax_adviser", ["tax adviser", "tax advisor", "tax specialist", "tax consultan"]],
  ["accountant", ["account"]],
  ["solicitor", ["solicitor", "lawyer", "legal"]],
  ["financial_adviser", ["financial advis", "mortgage advis"]],
  ["consultant", ["consult"]],

  // automotive
  ["detailing", ["detailing", "valet"]],
  ["mot_centre", ["mot centre", "mot test"]],
  ["tyre_service", ["tyre"]],
  ["garage", ["garage", "car repair", "auto repair", "mechanic", "bodyshop", "body shop"]],
];

export function resolveBusinessArchetype(...texts: (string | null | undefined)[]): BusinessArchetype {
  const haystack = texts.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return "generic_local_service";

  for (const [archetype, keywords] of ARCHETYPE_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw))) return archetype;
  }
  return "generic_local_service";
}

export function resolveIndustryFamily(...texts: (string | null | undefined)[]): IndustryFamily {
  return archetypeMeta(resolveBusinessArchetype(...texts)).family;
}
