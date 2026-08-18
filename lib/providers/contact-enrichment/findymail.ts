// FindyMail contact-enrichment client. NOT YET WIRED TO THE REAL API —
// the exact endpoint/auth header/request-response shape wasn't available
// when this was built (no FindyMail integration existed anywhere in the
// repo before V2.5). This throws a clear, descriptive error rather than
// silently no-opping or guessing an API contract, so the rest of the
// enrichment pipeline (eligibility gate, contact_routes writing, UI) can be
// built and tested end-to-end against everything except this one call.
//
// TODO(V2.5 follow-up): once FindyMail's API docs/key are available, fill
// in FINDYMAIL_API_BASE and the request/response mapping below. The shape
// of ContactEnrichmentProvider (lib/providers/contact-enrichment/types.ts)
// is already correct for a typical email-finder API (business name +
// domain in, email/phone + verification flag out) — this file should only
// need its fetch() call and response-parsing filled in, not a redesign.

import type { ContactEnrichmentInput, ContactEnrichmentProvider, ContactEnrichmentResult } from "./types";

export class FindyMailProvider implements ContactEnrichmentProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept stable for when the real API call is filled in
  async enrich(input: ContactEnrichmentInput): Promise<ContactEnrichmentResult | null> {
    if (!process.env.FINDYMAIL_API_KEY) {
      throw new Error("FINDYMAIL_API_KEY is not configured — contact enrichment is unavailable.");
    }
    throw new Error(
      "FindyMail API integration is not yet implemented — the request/response shape needs to be filled in " +
        "in lib/providers/contact-enrichment/findymail.ts once API docs are available."
    );
  }
}

let provider: FindyMailProvider | null = null;
export function getContactEnrichmentProvider(): ContactEnrichmentProvider {
  if (!provider) provider = new FindyMailProvider();
  return provider;
}
