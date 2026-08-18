// Shared helper: renders a DemoBusinessProfile into plain text for AI
// prompts, clearly separating CONFIRMED facts from what's UNKNOWN so the
// model isn't tempted to fill gaps. Deliberately uses marketing_category
// (deterministic, customer-facing) rather than the raw source_category —
// see lib/demo/industry.ts — so Google's often generic/misleading category
// text never becomes customer-facing positioning.

import type { DemoBusinessProfile, Fact } from "./types";
import { archetypeMeta } from "./industry";

function line(label: string, f: Fact<string | number>): string | null {
  if (f.status === "UNKNOWN" || f.value === null) return null;
  return `${label}: ${f.value} (${f.status})`;
}

export function describeProfileForPrompt(profile: DemoBusinessProfile): string {
  const meta = archetypeMeta(profile.business_archetype);

  const lines = [
    line("Business name", profile.business_name),
    `Customer-facing category: ${profile.marketing_category}`,
    `Business type: ${profile.business_archetype.replace(/_/g, " ")}`,
    `Conversion model: ${profile.conversion_model.replace(/_/g, " ")} — the site's job is to get this action, not a generic "get a quote"`,
    `Content richness: ${profile.content_richness}${profile.content_richness === "sparse" ? " — keep copy conservative and short rather than padded" : ""}`,
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
    lines.push(
      `Confirmed services: UNKNOWN — do not invent a services list. Write generically to the "${profile.marketing_category}" category rather than naming specific services we don't have evidence for.`
    );
  }

  if (profile.website_weaknesses.length > 0) {
    lines.push(`Weaknesses of their current web/digital presence: ${profile.website_weaknesses.join("; ")}`);
  }

  lines.push(
    `Do NOT use the raw Google/source category as customer-facing wording — always use the customer-facing category above instead.`
  );
  lines.push(
    `Never claim emergency/urgent availability${meta.canClaimEmergency ? "" : " for this business type"} unless explicitly evidenced above.`
  );
  lines.push(
    "Any field not listed above (years of experience, accreditations, guarantees, team size, prices, testimonial quotes) is UNKNOWN and must not appear in the output."
  );

  return lines.join("\n");
}
