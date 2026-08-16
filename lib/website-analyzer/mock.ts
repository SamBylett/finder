import type {
  WebsiteAnalyzer,
  WebsiteAnalysisResult,
  ObjectiveWebsiteChecks,
} from "./types";
import type { WebsiteStatus } from "@/lib/types";

// Deterministic string hash so the same URL always produces the same mock
// analysis (stable across repeated searches / renders) while still varying
// realistically across different businesses.
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Pull a pseudo-random boolean/number out of the hash at a given "slot" so
// different checks for the same URL don't all move in lockstep.
function pick(seed: number, slot: number, mod: number): number {
  return (seed + slot * 2654435761) % mod;
}

interface Profile {
  status: WebsiteStatus;
  baseScore: number;
}

/**
 * Realistic mock implementation of WebsiteAnalyzer. Exercises the full
 * pipeline with varied, deterministic results and zero network calls. A real
 * implementation (fetch + cheerio, Firecrawl, Playwright, etc.) implements
 * the same WebsiteAnalyzer interface and can be swapped in without touching
 * any calling code.
 */
export class MockWebsiteAnalyzer implements WebsiteAnalyzer {
  async analyze(url: string): Promise<WebsiteAnalysisResult> {
    const seed = hashString(url);

    // Roughly: 15% broken, 30% weak, 35% average, 20% strong.
    const bucket = seed % 100;
    const profile: Profile =
      bucket < 15
        ? { status: "broken_website", baseScore: 10 }
        : bucket < 45
        ? { status: "weak_website", baseScore: 35 }
        : bucket < 80
        ? { status: "average_website", baseScore: 60 }
        : { status: "strong_website", baseScore: 85 };

    if (profile.status === "broken_website") {
      const objective = allFalseChecks();
      objective.loadsSuccessfully = false;
      objective.hasObviousBrokenLinks = true;
      objective.weakOrDatedDesignIndicators = true;

      return {
        url,
        status: "broken_website",
        score: profile.baseScore,
        objective,
        subjective: stubSubjective(),
        summary:
          "Website did not load successfully during analysis. Likely expired hosting/domain, SSL failure, or the site has been taken down.",
        contact: noContact(),
      };
    }

    const objective = buildObjectiveChecks(seed, profile.status);
    const score = computeWebsiteScore(objective, profile.baseScore);
    const summary = buildSummary(profile.status, objective);

    return {
      url,
      status: profile.status,
      score,
      objective,
      subjective: stubSubjective(),
      summary,
      contact: noContact(),
    };
  }
}

function allFalseChecks(): ObjectiveWebsiteChecks {
  return {
    loadsSuccessfully: true,
    https: false,
    mobileResponsive: false,
    hasObviousPhoneNumber: false,
    hasClickToCallLink: false,
    hasClearPrimaryCTA: false,
    hasContactForm: false,
    hasQuoteOrEstimateForm: false,
    hasOnlineBooking: false,
    hasLiveChat: false,
    hasTestimonialsOrReviews: false,
    hasRecentProjectGallery: false,
    hasServicesListed: false,
    hasServiceAreasStated: false,
    hasSocialLinks: false,
    outdatedCopyrightYear: false,
    hasObviousBrokenLinks: false,
    weakOrDatedDesignIndicators: false,
  };
}

function buildObjectiveChecks(seed: number, status: WebsiteStatus): ObjectiveWebsiteChecks {
  // Likelihood a given check passes, tuned per status tier so "weak" sites
  // fail most quality checks and "strong" sites pass most of them.
  const likelihood: Record<Exclude<WebsiteStatus, "broken_website" | "no_website" | "social_only" | "not_analysed">, number> = {
    weak_website: 0.25,
    average_website: 0.55,
    strong_website: 0.9,
  };
  const p = likelihood[status as "weak_website" | "average_website" | "strong_website"];

  let slot = 0;
  const chance = (bonus = 0) => pick(seed, slot++, 100) / 100 < Math.min(0.97, p + bonus);

  return {
    loadsSuccessfully: true,
    https: chance(0.05),
    mobileResponsive: chance(),
    hasObviousPhoneNumber: chance(0.15),
    hasClickToCallLink: chance(-0.1),
    hasClearPrimaryCTA: chance(-0.05),
    hasContactForm: chance(),
    hasQuoteOrEstimateForm: chance(-0.1),
    hasOnlineBooking: chance(-0.3),
    hasLiveChat: chance(-0.4),
    hasTestimonialsOrReviews: chance(-0.05),
    hasRecentProjectGallery: chance(-0.1),
    hasServicesListed: chance(0.1),
    hasServiceAreasStated: chance(-0.1),
    hasSocialLinks: chance(),
    outdatedCopyrightYear: !chance(0.2), // inverse: more likely on weak sites
    hasObviousBrokenLinks: !chance(0.3),
    weakOrDatedDesignIndicators: !chance(0.15),
  };
}

function computeWebsiteScore(checks: ObjectiveWebsiteChecks, baseScore: number): number {
  const positiveChecks: (keyof ObjectiveWebsiteChecks)[] = [
    "https",
    "mobileResponsive",
    "hasObviousPhoneNumber",
    "hasClickToCallLink",
    "hasClearPrimaryCTA",
    "hasContactForm",
    "hasQuoteOrEstimateForm",
    "hasOnlineBooking",
    "hasLiveChat",
    "hasTestimonialsOrReviews",
    "hasRecentProjectGallery",
    "hasServicesListed",
    "hasServiceAreasStated",
    "hasSocialLinks",
  ];
  const negativeChecks: (keyof ObjectiveWebsiteChecks)[] = [
    "outdatedCopyrightYear",
    "hasObviousBrokenLinks",
    "weakOrDatedDesignIndicators",
  ];

  const passCount = positiveChecks.filter((k) => checks[k]).length;
  const failCount = negativeChecks.filter((k) => checks[k]).length;

  const raw =
    baseScore * 0.5 +
    (passCount / positiveChecks.length) * 50 -
    failCount * 5;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

function buildSummary(status: WebsiteStatus, checks: ObjectiveWebsiteChecks): string {
  const missing: string[] = [];
  if (!checks.hasClearPrimaryCTA) missing.push("a clear primary call-to-action");
  if (!checks.hasContactForm && !checks.hasQuoteOrEstimateForm) missing.push("any contact or quote form");
  if (!checks.hasOnlineBooking) missing.push("online booking");
  if (!checks.mobileResponsive) missing.push("mobile-responsive layout");
  if (checks.outdatedCopyrightYear) missing.push("an up-to-date copyright year");

  const label =
    status === "strong_website"
      ? "Strong, modern website"
      : status === "average_website"
      ? "Average, workable website"
      : "Weak, dated website";

  if (missing.length === 0) {
    return `${label} with no major gaps detected in the automated scan.`;
  }
  return `${label}. Missing: ${missing.join(", ")}.`;
}

function stubSubjective() {
  return {
    available: false,
    overallImpression: null,
    designQualityNotes: null,
  };
}

function noContact() {
  return { email: null, facebookUrl: null, instagramUrl: null };
}
