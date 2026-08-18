// Contact-enrichment provider abstraction — mirrors the existing
// BusinessSearchProvider pattern (lib/providers/business-search/types.ts)
// so a provider can be swapped without touching call sites.

export interface ContactEnrichmentInput {
  businessName: string;
  domain: string | null; // website domain, if known — improves match accuracy
}

export interface ContactEnrichmentEmailResult {
  value: string;
  verified: boolean; // true only if the provider explicitly confirms deliverability
}

export interface ContactEnrichmentPhoneResult {
  value: string;
}

export interface ContactEnrichmentResult {
  email: ContactEnrichmentEmailResult | null;
  phone: ContactEnrichmentPhoneResult | null;
  raw: unknown; // full provider response, kept for the audit trail
}

export interface ContactEnrichmentProvider {
  enrich(input: ContactEnrichmentInput): Promise<ContactEnrichmentResult | null>;
}
