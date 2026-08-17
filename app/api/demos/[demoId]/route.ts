import { NextRequest, NextResponse } from "next/server";
import { getDemoById, getDemoAssets, saveDemo } from "@/lib/demo/store";
import type { Demo, DemoStatus, ThemeId, PaletteId } from "@/lib/demo/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  const { demoId } = await params;
  const demo = await getDemoById(demoId);
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });

  const assets = await getDemoAssets(demoId);
  return NextResponse.json({ demo, assets });
}

// Structured editing only — see spec: not a full drag-and-drop builder.
// Accepts a partial patch of editable fields; AI-generated fields
// (website_strategy/website_copy/site_director_config) can be edited here
// too (e.g. tweaking individual copy fields) but are never auto-regenerated
// by this route — that only happens via the explicit regenerate endpoint.
const EDITABLE_FIELDS = [
  "status", "sharing_enabled", "show_demo_banner", "theme_override", "palette_override",
  "custom_domain", "production_mode", "website_copy", "site_director_config", "business_profile",
] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  const { demoId } = await params;
  const demo = await getDemoById(demoId);
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Partial<Demo> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) (patch as Record<string, unknown>)[field] = body[field];
  }

  const updated: Demo = {
    ...demo,
    ...patch,
    status: (patch.status as DemoStatus) ?? demo.status,
    theme_override: (patch.theme_override as ThemeId | null | undefined) ?? demo.theme_override,
    palette_override: (patch.palette_override as PaletteId | null | undefined) ?? demo.palette_override,
    updated_at: new Date().toISOString(),
  };

  await saveDemo(updated);
  return NextResponse.json({ demo: updated });
}
