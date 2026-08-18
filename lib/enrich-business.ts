// Orchestrates a single-business FindyMail enrichment call: eligibility
// gate -> provider call -> classify + normalize results -> write as
// contact_routes (which also promotes to the businesses cache per source
// priority — see lib/contact-routes.ts). Never runs automatically; only
// from an explicit "Enrich Contact" click or the batch enrich action.

import type { Business, ContactRouteConfidence } from "./types";
import { isEnrichmentEligible } from "./enrichment-policy";
import { getContactEnrichmentProvider } from "./providers/contact-enrichment/findymail";
import { addContactRoute } from "./contact-routes";
import { classifyUkPhone, normalizeUkPhone } from "./phone";

const NAMED_BUSINESS_LOCAL_PARTS = ["info", "hello", "enquiries", "enquiry", "contact", "sales", "admin", "office"];
const FREE_EMAIL_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"];

function domainOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function classifyEmailConfidence(email: string, businessDomain: string | null, verified: boolean): ContactRouteConfidence {
  if (verified) return "high";
  const [localPart, emailDomain] = email.toLowerCase().split("@");
  if (businessDomain && emailDomain === businessDomain && NAMED_BUSINESS_LOCAL_PARTS.includes(localPart)) return "high";
  if (FREE_EMAIL_DOMAINS.includes(emailDomain)) return "medium";
  return "low";
}

export interface EnrichBusinessResult {
  enriched: boolean;
  reason: string;
}

export async function enrichBusinessContact(business: Business): Promise<EnrichBusinessResult> {
  const eligibility = isEnrichmentEligible(business);
  if (!eligibility.eligible) return { enriched: false, reason: eligibility.reason };

  const domain = domainOf(business.website_url);
  const result = await getContactEnrichmentProvider().enrich({ businessName: business.business_name, domain });
  if (!result) return { enriched: false, reason: "FindyMail found no contact information for this business" };

  const found: string[] = [];

  if (result.email) {
    const confidence = classifyEmailConfidence(result.email.value, domain, result.email.verified);
    await addContactRoute(business.id, {
      type: "EMAIL",
      value: result.email.value,
      normalized_value: result.email.value.toLowerCase(),
      source: "findymail",
      confidence,
      verified: result.email.verified,
    });
    found.push(`email (${confidence} confidence)`);
  }

  if (result.phone) {
    const { e164 } = normalizeUkPhone(result.phone.value);
    const phoneType = classifyUkPhone(e164);
    await addContactRoute(business.id, {
      type: phoneType === "mobile" ? "MOBILE" : phoneType === "landline" ? "LANDLINE" : "OTHER",
      value: result.phone.value,
      normalized_value: e164,
      source: "findymail",
      confidence: "medium",
      verified: false,
    });
    found.push(`phone (${phoneType})`);
  }

  if (found.length === 0) return { enriched: false, reason: "FindyMail returned no usable email or phone" };
  return { enriched: true, reason: `Found ${found.join(" and ")}` };
}
