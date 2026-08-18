// DemoQualityCheck — deterministic readiness guardrail, run automatically
// after every generation/regeneration. NOT another AI score: plain checks
// over the stored data. Purely informational — never blocks manual preview
// or editing, just tells you whether a demo is safe to send to a prospect.

import { archetypeMeta } from "./industry";
import type { DemoAsset, DemoBusinessProfile, DemoQualityCheck, SiteDirectorConfig, WebsiteCopy } from "./types";

const EM_DASH_PATTERN = /[—–]/;
const PLACEHOLDER_COPY_PATTERNS = [/lorem ipsum/i, /\btbd\b/i, /\btodo\b/i, /\[insert/i, /\bxxx\b/i];

// Every WebsiteCopy string/array-of-strings field — this is the acceptance
// scan for "zero em dashes in generated display content" (V2.3 spec #8).
// stripEmDashes() in copy.ts already sanitises all of these at generation
// time; this list exists so the check actually verifies that, instead of
// silently missing a field the way the V2.2 checker did (it only scanned 9
// of the ~25 copy fields, which is exactly how em dashes kept leaking).
function collectCopyStrings(copy: WebsiteCopy): { field: string; value: string }[] {
  const strings: { field: string; value: string }[] = [
    { field: "hero_eyebrow", value: copy.hero_eyebrow ?? "" },
    { field: "hero_headline", value: copy.hero_headline },
    { field: "hero_supporting_text", value: copy.hero_supporting_text },
    { field: "primary_cta", value: copy.primary_cta },
    { field: "secondary_cta", value: copy.secondary_cta ?? "" },
    { field: "trust_bar_text", value: copy.trust_bar_text ?? "" },
    { field: "services_intro", value: copy.services_intro },
    { field: "about", value: copy.about },
    { field: "gallery_intro", value: copy.gallery_intro ?? "" },
    { field: "testimonials_heading", value: copy.testimonials_heading ?? "" },
    { field: "service_area_content", value: copy.service_area_content ?? "" },
    { field: "final_cta_heading", value: copy.final_cta_heading },
    { field: "final_cta_body", value: copy.final_cta_body },
    { field: "contact_content", value: copy.contact_content },
    { field: "footer_content", value: copy.footer_content },
    { field: "seo_title", value: copy.seo_title },
    { field: "seo_description", value: copy.seo_description },
    { field: "who_we_help_intro", value: copy.who_we_help_intro ?? "" },
    { field: "expertise_intro", value: copy.expertise_intro ?? "" },
    { field: "process_intro", value: copy.process_intro ?? "" },
  ];
  copy.navigation_labels.forEach((l, i) => strings.push({ field: `navigation_labels[${i}]`, value: l }));
  copy.why_choose_us.forEach((w, i) => strings.push({ field: `why_choose_us[${i}]`, value: w }));
  copy.who_we_help_audiences.forEach((a, i) => strings.push({ field: `who_we_help_audiences[${i}]`, value: a }));
  copy.expertise_items.forEach((e, i) => strings.push({ field: `expertise_items[${i}]`, value: e }));
  copy.process_steps.forEach((p, i) => strings.push({ field: `process_steps[${i}]`, value: p }));
  copy.service_cards.forEach((c, i) => {
    strings.push({ field: `service_cards[${i}].name`, value: c.name });
    strings.push({ field: `service_cards[${i}].description`, value: c.description });
  });
  copy.faq.forEach((f, i) => {
    strings.push({ field: `faq[${i}].question`, value: f.question });
    strings.push({ field: `faq[${i}].answer`, value: f.answer });
  });
  return strings.filter((s) => s.value);
}

export function runDemoQualityCheck(
  profile: DemoBusinessProfile,
  copy: WebsiteCopy,
  config: SiteDirectorConfig,
  assets: DemoAsset[]
): DemoQualityCheck {
  const critical: string[] = [];
  const minor: string[] = [];

  // Hero
  const businessName = profile.business_name.value?.trim().toLowerCase() ?? "";
  if (!copy.hero_headline?.trim()) {
    critical.push("Hero headline is empty.");
  } else if (copy.hero_headline.trim().toLowerCase() === businessName) {
    minor.push("Hero headline is just the business name restated — no real message.");
  }

  // CTA
  if (!copy.primary_cta?.trim()) critical.push("No primary CTA set.");

  // Contact details
  if (profile.phone.status === "UNKNOWN" && profile.email.status === "UNKNOWN") {
    critical.push("No confirmed phone or email — visitors have no way to convert.");
  }

  // Section-level checks
  const meta = archetypeMeta(profile.business_archetype);
  const realAssetCount = assets.filter((a) => !a.placeholder).length;

  for (const section of config.sections) {
    switch (section.type) {
      case "services":
        if (copy.service_cards.length === 0) critical.push("Services section present but no service cards.");
        break;
      case "gallery":
        if (realAssetCount === 0) critical.push("Gallery section present with no real imagery (placeholder only).");
        if (meta.galleryEligibility === "unsuitable") critical.push("Gallery shown for an archetype marked gallery-unsuitable.");
        break;
      case "who-we-help":
        if (copy.who_we_help_audiences.length === 0) critical.push("Who We Help section present but no audiences.");
        break;
      case "expertise":
        if (copy.expertise_items.length < 2) critical.push("Expertise section present with fewer than 2 items.");
        break;
      case "process":
        if (copy.process_steps.length === 0) critical.push("Process section present but no steps.");
        break;
      case "faq":
        if (copy.faq.length === 0) critical.push("FAQ section present but no questions.");
        break;
    }
  }

  if (assets.every((a) => a.placeholder) && assets.length > 0) {
    minor.push("All imagery is placeholder — no real business photos found.");
  }

  // Section count sanity
  if (config.sections.length < 4) minor.push(`Only ${config.sections.length} sections — unusually short.`);
  if (config.sections.length > 12) minor.push(`${config.sections.length} sections — unusually long, check for padding.`);

  // Em dashes / placeholder copy in generated text
  for (const { field, value } of collectCopyStrings(copy)) {
    if (EM_DASH_PATTERN.test(value)) minor.push(`Em dash found in ${field}.`);
    if (PLACEHOLDER_COPY_PATTERNS.some((re) => re.test(value))) critical.push(`Placeholder copy detected in ${field}.`);
  }

  const issues = [...critical, ...minor];
  const status = critical.length > 0 ? "NOT_READY" : minor.length > 0 ? "NEEDS_REVIEW" : "READY";

  return { status, issues, checkedAt: new Date().toISOString() };
}
