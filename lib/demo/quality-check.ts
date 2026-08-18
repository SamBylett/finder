// DemoQualityCheck — deterministic readiness guardrail, run automatically
// after every generation/regeneration. NOT another AI score: plain checks
// over the stored data. Purely informational — never blocks manual preview
// or editing, just tells you whether a demo is safe to send to a prospect.

import { archetypeMeta } from "./industry";
import type { DemoAsset, DemoBusinessProfile, DemoQualityCheck, SiteDirectorConfig, WebsiteCopy } from "./types";

const EM_DASH_PATTERN = /[—–]/;
const PLACEHOLDER_COPY_PATTERNS = [/lorem ipsum/i, /\btbd\b/i, /\btodo\b/i, /\[insert/i, /\bxxx\b/i];

function collectCopyStrings(copy: WebsiteCopy): { field: string; value: string }[] {
  const strings: { field: string; value: string }[] = [
    { field: "hero_headline", value: copy.hero_headline },
    { field: "hero_supporting_text", value: copy.hero_supporting_text },
    { field: "primary_cta", value: copy.primary_cta },
    { field: "services_intro", value: copy.services_intro },
    { field: "about", value: copy.about },
    { field: "final_cta_heading", value: copy.final_cta_heading },
    { field: "final_cta_body", value: copy.final_cta_body },
    { field: "contact_content", value: copy.contact_content },
    { field: "footer_content", value: copy.footer_content },
  ];
  copy.service_cards.forEach((c, i) => strings.push({ field: `service_cards[${i}].description`, value: c.description }));
  copy.faq.forEach((f, i) => strings.push({ field: `faq[${i}].answer`, value: f.answer }));
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
