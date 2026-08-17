// Shared helper: renders a DemoBusinessProfile into plain text for AI
// prompts, clearly separating CONFIRMED facts from what's UNKNOWN so the
// model isn't tempted to fill gaps.

import type { DemoBusinessProfile, Fact } from "./types";
import { INDUSTRY_FAMILY_LABELS } from "./industry";

function line(label: string, f: Fact<string | number>): string | null {
  if (f.status === "UNKNOWN" || f.value === null) return null;
  return `${label}: ${f.value} (${f.status})`;
}

export function describeProfileForPrompt(profile: DemoBusinessProfile): string {
  const lines = [
    line("Business name", profile.business_name),
    line("Category", profile.category),
    `Industry family: ${INDUSTRY_FAMILY_LABELS[profile.industry_family]}`,
    line("Town/city", profile.town_city),
    line("Google rating", profile.google_rating),
    line("Google review count", profile.google_review_count),
    line("Phone", profile.phone),
    line("Email", profile.email),
    line("Existing website", profile.website_url),
  ].filter((l): l is string => Boolean(l));

  if (profile.confirmed_services.length > 0) {
    lines.push(`Confirmed services: ${profile.confirmed_services.join(", ")}`);
  } else {
    lines.push("Confirmed services: UNKNOWN — do not invent a services list, keep messaging generic to the category.");
  }

  if (profile.website_weaknesses.length > 0) {
    lines.push(`Weaknesses of their current web/digital presence: ${profile.website_weaknesses.join("; ")}`);
  }

  lines.push(
    "Any field not listed above (years of experience, accreditations, guarantees, team size, prices, testimonial quotes) is UNKNOWN and must not appear in the output."
  );

  return lines.join("\n");
}
