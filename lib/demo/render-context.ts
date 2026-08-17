// Everything a demo-site section component needs to render, bundled so
// section components take one prop instead of a dozen.

import type { DemoAsset, DemoBusinessProfile, DemoReview, SiteDirectorConfig, WebsiteCopy, WebsiteStrategy } from "./types";

export interface DemoRenderContext {
  profile: DemoBusinessProfile;
  copy: WebsiteCopy;
  strategy: WebsiteStrategy;
  assets: DemoAsset[];
  reviews: DemoReview[];
  config: SiteDirectorConfig;
}

export function factValue<T>(f: { value: T | null; status: string }): T | null {
  return f.status === "UNKNOWN" ? null : f.value;
}
