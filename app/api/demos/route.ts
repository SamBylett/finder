import { NextRequest, NextResponse } from "next/server";
import { getCachedBusiness } from "@/lib/store";
import { buildDemo } from "@/lib/demo/generate";
import { listDemos } from "@/lib/demo/store";

// GET /api/demos — list demos, most recently updated first.
export async function GET() {
  const demos = await listDemos();
  return NextResponse.json({ demos });
}

// POST /api/demos { business_id } — triggers the full Build Demo pipeline.
// This is the only place that runs the AI strategy/copy/director calls
// outside of an explicit regenerate action.
export async function POST(request: NextRequest) {
  let body: { business_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const businessId = body.business_id;
  if (!businessId) {
    return NextResponse.json({ error: "'business_id' is required." }, { status: 400 });
  }

  const cached = await getCachedBusiness(businessId);
  if (!cached) {
    return NextResponse.json({ error: "Business not found. Run a search again first." }, { status: 404 });
  }

  try {
    const demo = await buildDemo(cached.business);
    return NextResponse.json({ demo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
