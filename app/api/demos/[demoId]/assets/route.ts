import { NextRequest, NextResponse } from "next/server";
import { getDemoAssets, saveDemoAssets } from "@/lib/demo/store";

// PATCH { asset_id, selected } — toggles whether an asset is used on the
// live demo. Image selection only; adding new assets isn't supported in V2.0.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ demoId: string }> }) {
  const { demoId } = await params;

  let body: { asset_id?: string; selected?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.asset_id || typeof body.selected !== "boolean") {
    return NextResponse.json({ error: "'asset_id' and 'selected' are required." }, { status: 400 });
  }

  const assets = await getDemoAssets(demoId);
  const updated = assets.map((a) => (a.id === body.asset_id ? { ...a, selected: body.selected! } : a));
  await saveDemoAssets(demoId, updated);

  return NextResponse.json({ assets: updated });
}
