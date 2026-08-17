// We only ever have Google's aggregate rating/count (no per-review text is
// fetched by the Places search in V1 — Place Details review text would need
// a separate paid call). So structured DemoReview records stay empty by
// default; the trust bar/reviews section falls back to displaying the
// aggregate stat only, never a fabricated testimonial quote.

import type { DemoReview } from "./types";

export function buildDemoReviews(): DemoReview[] {
  return [];
}
