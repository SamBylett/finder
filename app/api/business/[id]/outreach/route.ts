// POST /api/business/[id]/outreach { kind, channel } — generate one
// outreach message, persist it to demos.outreach_messages, return it.
// Always explicit (per-message Generate/Regenerate click), never automatic.

import { NextRequest, NextResponse } from "next/server";
import { getDemoByBusinessId, saveDemo } from "@/lib/demo/store";
import { generateOutreachMessage } from "@/lib/demo/outreach-copy";
import type { OutreachChannel, OutreachKind } from "@/lib/demo/types";

const VALID_KINDS: OutreachKind[] = ["first_contact", "demo_link", "follow_up"];
const VALID_CHANNELS: OutreachChannel[] = ["email", "whatsapp", "facebook", "instagram", "linkedin"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const demo = await getDemoByBusinessId(id);
  if (!demo) return NextResponse.json({ error: "No demo record for this business yet — generate a Lovable brief first." }, { status: 404 });
  if (!demo.business_profile) return NextResponse.json({ error: "Generate a Lovable brief first — no business profile available." }, { status: 400 });

  let body: { kind?: string; channel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.kind || !VALID_KINDS.includes(body.kind as OutreachKind)) {
    return NextResponse.json({ error: `'kind' must be one of ${VALID_KINDS.join(", ")}` }, { status: 400 });
  }
  if (!body.channel || !VALID_CHANNELS.includes(body.channel as OutreachChannel)) {
    return NextResponse.json({ error: `'channel' must be one of ${VALID_CHANNELS.join(", ")}` }, { status: 400 });
  }

  const kind = body.kind as OutreachKind;
  const channel = body.channel as OutreachChannel;

  try {
    const message = await generateOutreachMessage(demo.business_profile, kind, channel, demo.demo_url);
    const key = `${kind}_${channel}`;
    const updated = {
      ...demo,
      outreach_messages: { ...demo.outreach_messages, [key]: message },
      updated_at: new Date().toISOString(),
    };
    await saveDemo(updated);
    return NextResponse.json({ message, demo: updated });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Outreach message generation failed.";
    return NextResponse.json({ error: errMessage }, { status: 502 });
  }
}
