// POST /api/bulk-check { domains: string[] } — runs the same website
// analyzer used by prospect search against a batch of URLs, with AI
// design-assessment explicitly disabled (this is a fast triage pass over
// potentially thousands of rows, not a per-business deep analysis — no
// point spending AI calls on a bulk status check). Called repeatedly by
// the client in small batches (see app/bulk-check/page.tsx) rather than
// processing everything in one request, since a serverless function has a
// execution time limit and a CSV can have thousands of rows.

import { NextRequest, NextResponse } from "next/server";
import { getWebsiteAnalyzer } from "@/lib/website-analyzer";
import { mapWithConcurrency } from "@/lib/concurrency";

const MAX_BATCH_SIZE = 25;
const CONCURRENCY = 8;

// Defensive — a batch of up to 25 URLs (some retried, some slow/broken)
// could approach typical serverless defaults; the existing prospect-search
// route already runs similar concurrent analysis without this and works
// fine in production, but this is a cheap safety net for a route that will
// be hit thousands of times in a row.
export const maxDuration = 60;

export interface BulkCheckResult {
  domain: string;
  status: string;
  score: number | null;
  summary: string;
}

export async function POST(request: NextRequest) {
  let body: { domains?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const domains = Array.isArray(body.domains) ? body.domains.filter((d) => typeof d === "string" && d.trim()) : [];
  if (domains.length === 0) {
    return NextResponse.json({ error: "'domains' must be a non-empty array of strings." }, { status: 400 });
  }
  if (domains.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `Batch too large — max ${MAX_BATCH_SIZE} per request.` }, { status: 400 });
  }

  const analyzer = getWebsiteAnalyzer({ maxAiCalls: 0 });

  const results: BulkCheckResult[] = await mapWithConcurrency(domains, CONCURRENCY, async (domain) => {
    const url = toFetchableUrl(domain);
    if (!url) {
      return { domain, status: "no_website", score: null, summary: "No usable website URL." };
    }
    try {
      const analysis = await analyzer.analyze(url);
      return { domain, status: analysis.status, score: analysis.score, summary: analysis.summary };
    } catch (err) {
      return {
        domain,
        status: "broken_website",
        score: 10,
        summary: err instanceof Error ? err.message : "Analysis failed.",
      };
    }
  });

  return NextResponse.json({ results });
}

function toFetchableUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
