import { NextRequest, NextResponse } from "next/server";
import type { SearchParams, SearchResponse } from "@/lib/types";
import { runOpportunitySearch } from "@/lib/pipeline";
import { cacheResults, listRecentBusinesses } from "@/lib/store";

// Returns the most recently seen persisted businesses (if any), so the
// dashboard can repopulate itself after a page refresh instead of starting
// blank. Empty results array if nothing has been searched yet / no
// persistence configured.
export async function GET() {
  const results = await listRecentBusinesses();
  const summary = {
    totalAnalysed: results.length,
    hot: results.filter((r) => r.opportunity_tier === "HOT").length,
    opportunity: results.filter((r) => r.opportunity_tier === "OPPORTUNITY").length,
    lowPriority: results.filter((r) => r.opportunity_tier === "LOW PRIORITY").length,
  };
  const response: SearchResponse = { summary, results };
  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  let body: Partial<SearchParams>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";

  if (!keyword || !location) {
    return NextResponse.json(
      { error: "Both 'keyword' and 'location' are required." },
      { status: 400 }
    );
  }

  const params: SearchParams = {
    keyword,
    location,
    radiusMiles: clampNumber(body.radiusMiles, 1, 200, 10),
    minReviews: clampNumber(body.minReviews, 0, 100000, 0),
    maxResults: clampNumber(body.maxResults, 1, 100, 20),
  };

  let pipelineResult;
  try {
    pipelineResult = await runOpportunitySearch(params);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Business search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { summary, results, breakdowns } = pipelineResult;
  await cacheResults(results, breakdowns);

  const response: SearchResponse = { summary, results };
  return NextResponse.json(response);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
