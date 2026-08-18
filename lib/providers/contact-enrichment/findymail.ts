// FindyMail contact-enrichment client. API reference: https://app.findymail.com/docs/
//
// We only ever have a business name + domain for these prospects (never a
// named individual or their LinkedIn profile), so the only fitting endpoint
// is POST /api/search/domain (domain + generic roles -> candidate contacts).
// FindyMail marks this endpoint deprecated in their docs but it's the only
// one that matches a domain-only query shape; if it's ever removed this is
// the one file that needs revisiting.
//
// FindyMail has no phone-by-domain endpoint (their /api/search/phone needs
// a LinkedIn URL, which we don't have for these businesses) — phone is
// always null from this provider. /api/verify would confirm an email but
// costs separate verifier credits, so it's deliberately NOT called
// automatically here (cost control) — the email is returned unverified
// (verified: false) rather than invented as verified.

import type { ContactEnrichmentInput, ContactEnrichmentProvider, ContactEnrichmentResult } from "./types";

const BASE_URL = "https://app.findymail.com";
const GENERIC_ROLES = ["Owner", "Director", "Founder"]; // API caps roles at 3 items

interface FindyMailDomainSearchResponse {
  contacts?: { domain: string; email: string; name: string }[];
  error?: string;
}

export class FindyMailProvider implements ContactEnrichmentProvider {
  async enrich(input: ContactEnrichmentInput): Promise<ContactEnrichmentResult | null> {
    const apiKey = process.env.FINDYMAIL_API_KEY;
    if (!apiKey) {
      throw new Error("FINDYMAIL_API_KEY is not configured — contact enrichment is unavailable.");
    }
    if (!input.domain) {
      // The domain endpoint requires a domain; without a website we have
      // nothing FindyMail can search against.
      return null;
    }

    const res = await fetch(`${BASE_URL}/api/search/domain`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domain: input.domain, roles: GENERIC_ROLES }),
    });

    if (!res.ok) {
      if (res.status === 402 || res.status === 429) {
        throw new Error(`FindyMail: ${res.status === 402 ? "not enough credits" : "rate limited"}.`);
      }
      const bodyText = await res.text().catch(() => "");
      console.error("FindyMail request failed:", res.status, bodyText);
      throw new Error(`FindyMail request failed (${res.status}).`);
    }

    const data = (await res.json()) as FindyMailDomainSearchResponse;
    if (data.error) throw new Error(`FindyMail: ${data.error}`);

    const first = data.contacts?.[0];
    if (!first?.email) return { email: null, phone: null, raw: data };

    return {
      email: { value: first.email, verified: false },
      phone: null, // FindyMail has no domain-based phone lookup — see file header
      raw: data,
    };
  }
}

let provider: FindyMailProvider | null = null;
export function getContactEnrichmentProvider(): ContactEnrichmentProvider {
  if (!provider) provider = new FindyMailProvider();
  return provider;
}
