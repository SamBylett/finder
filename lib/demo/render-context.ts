// Everything a demo-site section component needs to render, bundled so
// section components take one prop instead of a dozen.

import type { DemoAsset, DemoBusinessProfile, DemoReview, SiteDirectorConfig, WebsiteCopy } from "./types";

// V2.3: WebsiteStrategy is deliberately NOT part of this context. It's an
// internal input to the copy/director AI calls (see strategy.ts), never
// read by a section component — including it here meant Next.js serialised
// it into the page's RSC/flight payload on every render regardless of
// whether it was displayed, which is exactly how em dashes in
// tone/visual_direction/messaging_angle leaked into rendered page source
// despite never appearing as visible text.
export interface DemoRenderContext {
  profile: DemoBusinessProfile;
  copy: WebsiteCopy;
  assets: DemoAsset[];
  reviews: DemoReview[];
  config: SiteDirectorConfig;
}

export function factValue<T>(f: { value: T | null; status: string }): T | null {
  return f.status === "UNKNOWN" ? null : f.value;
}
