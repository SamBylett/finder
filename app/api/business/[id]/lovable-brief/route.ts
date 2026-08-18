// POST /api/business/[id]/lovable-brief — generate or regenerate the
// Lovable Demo Brief for a business. Always explicit (button click), never
// automatic. See lib/demo/lovable-brief.ts for the pipeline.

import { NextRequest, NextResponse } from "next/server";
import { getCachedBusiness } from "@/lib/store";
import { buildLovableBrief } from "@/lib/demo/lovable-brief";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cached = await getCachedBusiness(id);
  if (!cached) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  try {
    const demo = await buildLovableBrief(cached.business);
    return NextResponse.json({ demo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lovable brief generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
