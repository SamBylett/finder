// PATCH /api/business/[id]/workflow-status { status } — manual dropdown
// update for the lightweight Lovable-workflow tracking. Not a CRM; just a
// status label the user sets by hand.

import { NextRequest, NextResponse } from "next/server";
import { getDemoByBusinessId, saveDemo } from "@/lib/demo/store";
import type { WorkflowStatus } from "@/lib/demo/types";

const VALID_STATUSES: WorkflowStatus[] = [
  "NOT_STARTED", "BRIEF_READY", "BUILDING_IN_LOVABLE", "DEMO_READY",
  "SENT", "RESPONDED", "INTERESTED", "NOT_INTERESTED",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const demo = await getDemoByBusinessId(id);
  if (!demo) return NextResponse.json({ error: "No demo record for this business yet." }, { status: 404 });

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as WorkflowStatus)) {
    return NextResponse.json({ error: `'status' must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const updated = { ...demo, workflow_status: body.status as WorkflowStatus, updated_at: new Date().toISOString() };
  await saveDemo(updated);
  return NextResponse.json({ demo: updated });
}
