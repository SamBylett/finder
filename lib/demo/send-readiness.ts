// SendReadiness (V2.3) — combines TechnicalQualityCheck (objective defects)
// and PresentationQualityReview (visual/AI-appearance quality) into one
// overall signal. Advisory only, per spec #22: never blocks manual preview
// or sharing.

import type { DemoQualityCheck, PresentationQualityReview, SendReadiness } from "./types";

const READY_THRESHOLD = 75;
const NOT_READY_THRESHOLD = 40;

export function computeSendReadiness(
  technical: DemoQualityCheck,
  presentation: PresentationQualityReview
): SendReadiness {
  if (technical.status === "NOT_READY" || presentation.score < NOT_READY_THRESHOLD) return "NOT_READY";
  if (technical.status === "READY" && presentation.score >= READY_THRESHOLD) return "READY_TO_SEND";
  return "NEEDS_VISUAL_REVIEW";
}
