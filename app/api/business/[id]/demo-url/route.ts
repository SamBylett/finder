// POST /api/business/[id]/demo-url { demo_url } — manually attach a
// Lovable-built demo link to the prospect. Sets demo_builder=LOVABLE and
// bumps workflow_status to DEMO_READY if it was BRIEF_READY/BUILDING_IN_LOVABLE.

import { NextRequest, NextResponse } from "next/server";
import { getDemoByBusinessId, saveDemo } from "@/lib/demo/store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const demo = await getDemoByBusinessId(id);
  if (!demo) return NextResponse.json({ error: "No demo record for this business yet — generate a Lovable brief first." }, { status: 404 });

  let body: { demo_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.demo_url || !/^https?:\/\//.test(body.demo_url)) {
    return NextResponse.json({ error: "demo_url must be a valid http(s) URL." }, { status: 400 });
  }

  const bumpToReady = demo.workflow_status === "BRIEF_READY" || demo.workflow_status === "BUILDING_IN_LOVABLE";
  const updated = {
    ...demo,
    demo_url: body.demo_url,
    demo_builder: "LOVABLE" as const,
    workflow_status: bumpToReady ? ("DEMO_READY" as const) : demo.workflow_status,
    updated_at: new Date().toISOString(),
  };
  await saveDemo(updated);
  return NextResponse.json({ demo: updated });
}
