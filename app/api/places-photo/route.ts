// Proxies Google Places photo media through our server so GOOGLE_PLACES_API_KEY
// never appears in a client-rendered <img> src on a public demo page.

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_NAME_PATTERN = /^places\/[^/]+\/photos\/[^/]+$/;

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places is not configured." }, { status: 503 });
  }

  const name = request.nextUrl.searchParams.get("name");
  const maxWidthPx = Math.min(Number(request.nextUrl.searchParams.get("maxWidthPx")) || 1200, 1600);

  if (!name || !ALLOWED_NAME_PATTERN.test(name)) {
    return NextResponse.json({ error: "Invalid photo name." }, { status: 400 });
  }

  const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&key=${apiKey}`;

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch photo." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
