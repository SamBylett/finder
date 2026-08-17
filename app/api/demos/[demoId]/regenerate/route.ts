import { NextRequest, NextResponse } from "next/server";
import { getDemoById } from "@/lib/demo/store";
import { regenerateDemoStage, type RegenerateStage } from "@/lib/demo/generate";

const VALID_STAGES: RegenerateStage[] = ["strategy", "copy", "director"];

// POST /api/demos/[demoId]/regenerate { stage: "strategy" | "copy" | "director" }
// Always explicit — never triggered automatically by an edit or a page view.
export async function POST(request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  const { demoId } = await params;
  const demo = await getDemoById(demoId);
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });

  let body: { stage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.stage || !VALID_STAGES.includes(body.stage as RegenerateStage)) {
    return NextResponse.json({ error: `'stage' must be one of ${VALID_STAGES.join(", ")}` }, { status: 400 });
  }

  try {
    const updated = await regenerateDemoStage(demo, body.stage as RegenerateStage);
    return NextResponse.json({ demo: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Regeneration failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
