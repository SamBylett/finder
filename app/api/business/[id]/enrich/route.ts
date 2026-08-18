import { NextRequest, NextResponse } from "next/server";
import { getCachedBusiness } from "@/lib/store";
import { enrichBusinessContact } from "@/lib/enrich-business";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cached = await getCachedBusiness(id);

  if (!cached) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  try {
    const result = await enrichBusinessContact(cached.business);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
