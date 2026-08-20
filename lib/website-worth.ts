// Shared definition of "website weak/missing enough to be worth a digital
// upsell pitch" — average and strong sites already work fine. Used by both
// the main results table filter and the bulk CSV checker so the two never
// drift out of sync on what counts.
import type { WebsiteStatus } from "./types";

const WORTH_REACHING_OUT_STATUSES = new Set<WebsiteStatus>([
  "no_website",
  "social_only",
  "broken_website",
  "weak_website",
]);

export function isWebsiteWorthReachingOut(status: string): boolean {
  return WORTH_REACHING_OUT_STATUSES.has(status as WebsiteStatus);
}
