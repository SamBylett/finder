import type { WebsiteAnalyzer } from "./types";
import { MockWebsiteAnalyzer } from "./mock";
import { LiveWebsiteAnalyzer } from "./live";

export type {
  WebsiteAnalyzer,
  WebsiteAnalysisResult,
  ObjectiveWebsiteChecks,
  SubjectiveWebsiteAssessment,
} from "./types";

/**
 * Analyzer factory. Defaults to the real fetch+cheerio analyzer (no API key
 * required — just outbound network access). Set WEBSITE_ANALYZER=mock to
 * force the deterministic mock (useful for fast local iteration without
 * hitting real sites).
 */
export function getWebsiteAnalyzer(): WebsiteAnalyzer {
  if (process.env.WEBSITE_ANALYZER === "mock") {
    return new MockWebsiteAnalyzer();
  }
  return new LiveWebsiteAnalyzer();
}
