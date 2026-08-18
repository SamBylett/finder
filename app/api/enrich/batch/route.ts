// Batch enrichment — "Enrich Top N" from the results page. Always gated
// through isEnrichmentEligible(); ?dryRun=1 returns the count that would
// actually be enriched (after the threshold filter) without calling
// FindyMail, so the UI can show a confirmation before spending credits.

import { NextRequest, NextResponse } from "next/server";
import { listRecentBusinesses } from "@/lib/store";
import { isEnrichmentEligible } from "@/lib/enrichment-policy";
import { enrichBusinessContact } from "@/lib/enrich-business";

export async function POST(request: NextRequest) {
  let body: { topN?: number; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topN = body.topN;
  if (!topN || ![10, 25, 50].includes(topN)) {
    return NextResponse.json({ error: "topN must be 10, 25, or 50." }, { status: 400 });
  }

  const businesses = (await listRecentBusinesses(500))
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, topN);

  const eligible = businesses.filter((b) => isEnrichmentEligible(b).eligible);

  if (body.dryRun) {
    return NextResponse.json({ requestedCount: topN, eligibleCount: eligible.length });
  }

  const results: { businessId: string; businessName: string; enriched: boolean; reason: string }[] = [];
  for (const business of eligible) {
    try {
      const result = await enrichBusinessContact(business);
      results.push({ businessId: business.id, businessName: business.business_name, ...result });
    } catch (err) {
      results.push({
        businessId: business.id,
        businessName: business.business_name,
        enriched: false,
        reason: err instanceof Error ? err.message : "Enrichment failed.",
      });
    }
  }

  return NextResponse.json({
    requestedCount: topN,
    eligibleCount: eligible.length,
    enrichedCount: results.filter((r) => r.enriched).length,
    results,
  });
}
