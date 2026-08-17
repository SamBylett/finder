import { NextRequest, NextResponse } from "next/server";
import { getCachedBusiness } from "@/lib/store";
import { getDemoByBusinessId } from "@/lib/demo/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cached = await getCachedBusiness(id);

  if (!cached) {
    return NextResponse.json(
      {
        error:
          "Business not found. Run a search again and reopen the detail page.",
      },
      { status: 404 }
    );
  }

  const demo = await getDemoByBusinessId(id);

  return NextResponse.json({ ...cached, demo: demo ?? null });
}
