// Real WebsiteAnalyzer implementation. Fetches the homepage plus up to two
// likely subpages (contact, quote/booking) and runs deterministic,
// regex/DOM based checks against them — no headless browser, no AI call for
// the objective checks. A form/booking widget that only lives on /contact or
// /quote is common enough that homepage-only analysis was missing it.
//
// Never throws: any fetch/parse failure is reported as status="broken_website"
// so callers can rely on always getting a usable result.

import * as cheerio from "cheerio";
import type { WebsiteStatus } from "@/lib/types";
import type {
  WebsiteAnalyzer,
  WebsiteAnalysisResult,
  ObjectiveWebsiteChecks,
  ExtractedContactInfo,
} from "./types";
import { assessDesignQuality } from "./ai-assessment";

const FETCH_TIMEOUT_MS = 6000;
const SUBPAGE_FETCH_TIMEOUT_MS = 4000;
const LINK_CHECK_TIMEOUT_MS = 2500;
const MAX_LINKS_TO_CHECK = 3;
const MAX_SUBPAGES = 2;

// Link-text/href keyword groups used to find likely contact/quote/booking
// subpages from the homepage nav — checked in this priority order per group.
const CONTACT_PAGE_KEYWORDS = ["contact"];
const BOOKING_PAGE_KEYWORDS = ["quote", "estimate", "book", "booking", "appointment"];
// Real, billed Claude API calls — capped per search to keep cost predictable.
// A fresh LiveWebsiteAnalyzer instance is created per search (see
// getWebsiteAnalyzer() in index.ts), so this naturally scopes per search run.
const DEFAULT_AI_ASSESSMENT_MAX_PER_SEARCH = 15;
// A self-identifying bot UA gets trivially keyword-blocked by security
// plugins even on perfectly healthy sites — this is a standard current
// desktop browser UA instead, same as any legitimate read-only fetch of a
// business's own public homepage. Note this does NOT defeat genuine
// TLS/behavioural bot-detection (WAFs like Cloudflare) — see the 403/429
// handling below, which is the actual fix for that case.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Status codes that mean "a server responded and refused us" — this is
// evidence of bot-detection/rate-limiting (Cloudflare, Wordfence, etc.),
// NOT evidence the site is broken. A real visitor in a real browser very
// often sees a perfectly working site. Deliberately distinct from a
// connection-level failure (DNS/reset/timeout/TLS), which genuinely does
// mean the site is unreachable.
const BLOCKED_STATUS_CODES = new Set([401, 403, 429, 503]);

class HttpStatusError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

const CTA_PHRASES = [
  "get a quote",
  "request a quote",
  "free quote",
  "get quote",
  "get in touch",
  "contact us",
  "call now",
  "call today",
  "book now",
  "book online",
  "request callback",
  "enquire now",
  "get started",
  "request a call",
  "message us",
];

const BOOKING_KEYWORDS = [
  "book online",
  "book an appointment",
  "book a visit",
  "schedule an appointment",
  "online booking",
  "calendly.com",
  "acuityscheduling.com",
  "setmore.com",
  "bookwhen.com",
  "simplybook.me",
  "fresha.com",
];

const LIVE_CHAT_PATTERNS = [
  "tawk.to",
  "intercom",
  "driftt.com",
  "js.driftt",
  "crisp.chat",
  "zdassets.com",
  "zopim",
  "livechatinc",
  "freshchat",
  "hs-scripts.com",
  "purechat",
];

const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com"];

export class LiveWebsiteAnalyzer implements WebsiteAnalyzer {
  private aiCallsRemaining =
    Number(process.env.AI_ASSESSMENT_MAX_PER_SEARCH) || DEFAULT_AI_ASSESSMENT_MAX_PER_SEARCH;

  async analyze(url: string): Promise<WebsiteAnalysisResult> {
    let fetchResult: { html: string; finalUrl: string; isHtml: boolean };
    try {
      fetchResult = await this.fetchPage(url);
    } catch (err) {
      if (err instanceof HttpStatusError && BLOCKED_STATUS_CODES.has(err.status)) {
        return this.blockedResult(url, err.status);
      }
      // Network-level failures (timeout, connection reset, DNS blip) are
      // often transient — a single bad request against an otherwise
      // perfectly working site would get permanently recorded as
      // "broken_website" with no way to self-correct. One retry after a
      // short pause meaningfully cuts false positives; a genuinely dead
      // site will still fail the retry too, so this doesn't mask real
      // outages, just one-off flakiness.
      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        fetchResult = await this.fetchPage(url);
      } catch (retryErr) {
        if (retryErr instanceof HttpStatusError && BLOCKED_STATUS_CODES.has(retryErr.status)) {
          return this.blockedResult(url, retryErr.status);
        }
        return this.brokenResult(url);
      }
    }

    const { html, finalUrl, isHtml } = fetchResult;
    if (!isHtml) {
      // Loaded, but not a normal HTML page (e.g. a PDF, or an empty response)
      // — can't run content checks, but it's not "broken" either.
      const objective = falseChecks();
      objective.loadsSuccessfully = true;
      objective.https = finalUrl.startsWith("https://");
      return {
        url,
        status: "weak_website",
        score: 15,
        objective,
        subjective: stubSubjective(),
        summary: "Page loaded but did not return analysable HTML content.",
        contact: noContact(),
      };
    }

    const $ = cheerio.load(html);
    const bodyText = $("body").text().replace(/\s+/g, " ").toLowerCase();
    const rawHtmlLower = html.toLowerCase();

    const hasObviousBrokenLinks = await this.checkForBrokenLinks($, finalUrl);
    let mergedChecks = computePageChecks($, html, bodyText, rawHtmlLower);
    let contact = extractContactInfo($, finalUrl);

    // Check a couple of likely subpages (contact, quote/booking) — a
    // form or booking widget often lives there rather than the homepage.
    const subpageUrls = findSubpageLinks($, finalUrl);
    const subpageResults = await Promise.allSettled(
      subpageUrls.map((subUrl) => this.fetchPage(subUrl, SUBPAGE_FETCH_TIMEOUT_MS))
    );

    for (const result of subpageResults) {
      if (result.status !== "fulfilled" || !result.value.isHtml) continue;
      const sub$ = cheerio.load(result.value.html);
      const subBodyText = sub$("body").text().replace(/\s+/g, " ").toLowerCase();
      const subRawHtmlLower = result.value.html.toLowerCase();
      mergedChecks = orMergeChecks(
        mergedChecks,
        computePageChecks(sub$, result.value.html, subBodyText, subRawHtmlLower)
      );
      if (!contact.email || !contact.facebookUrl || !contact.instagramUrl || !contact.linkedinUrl) {
        const subContact = extractContactInfo(sub$, result.value.finalUrl);
        contact = {
          email: contact.email ?? subContact.email,
          facebookUrl: contact.facebookUrl ?? subContact.facebookUrl,
          instagramUrl: contact.instagramUrl ?? subContact.instagramUrl,
          linkedinUrl: contact.linkedinUrl ?? subContact.linkedinUrl,
        };
      }
    }

    const objective: ObjectiveWebsiteChecks = {
      loadsSuccessfully: true,
      https: finalUrl.startsWith("https://"),
      hasObviousBrokenLinks,
      weakOrDatedDesignIndicators: false, // computed below once other checks are known
      ...mergedChecks,
    };

    objective.weakOrDatedDesignIndicators = computeWeakDesignIndicator($, objective, html);

    const score = computeWebsiteScore(objective);
    const status = statusFromScore(score);
    const summary = buildSummary(status, objective);
    const subjective = this.tryConsumeAiCall()
      ? await assessDesignQuality({
          url: finalUrl,
          visibleText: bodyText,
          objectiveSummary: summary,
        })
      : stubSubjective();

    return {
      url,
      status,
      score,
      objective,
      subjective,
      summary,
      contact,
    };
  }

  // Synchronous check-and-decrement — safe under concurrent analyze() calls
  // since JS has no preemption between this and the caller's next await.
  private tryConsumeAiCall(): boolean {
    if (this.aiCallsRemaining <= 0) return false;
    this.aiCallsRemaining -= 1;
    return true;
  }

  private async fetchPage(
    url: string,
    timeoutMs: number = FETCH_TIMEOUT_MS
  ): Promise<{ html: string; finalUrl: string; isHtml: boolean }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      });

      if (!res.ok) {
        throw new HttpStatusError(res.status);
      }

      const contentType = res.headers.get("content-type") ?? "";
      const isHtml = contentType.includes("text/html") || contentType === "";
      const html = isHtml ? await res.text() : "";

      return { html, finalUrl: res.url || url, isHtml };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async checkForBrokenLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): Promise<boolean> {
    let base: URL;
    try {
      base = new URL(baseUrl);
    } catch {
      return false;
    }

    const seen = new Set<string>();
    const links: string[] = [];

    $("a[href]").each((_, el) => {
      if (links.length >= MAX_LINKS_TO_CHECK) return;
      const href = $(el).attr("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#") || href.startsWith("javascript:")) {
        return;
      }
      try {
        const resolved = new URL(href, base);
        if (resolved.hostname !== base.hostname) return; // same-origin only
        const key = resolved.toString();
        if (seen.has(key)) return;
        seen.add(key);
        links.push(key);
      } catch {
        // ignore unparsable hrefs
      }
    });

    if (links.length === 0) return false;

    const results = await Promise.allSettled(
      links.map((link) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
        return fetch(link, {
          method: "HEAD",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": USER_AGENT },
        }).finally(() => clearTimeout(timeout));
      })
    );

    return results.some((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
  }

  // A server responded and refused the request (bot-detection/rate-limit
  // territory), which is fundamentally different evidence than the site
  // being down. Reported as "not_analysed" (zero Opportunity Score weight,
  // same as "haven't checked yet") rather than "broken_website" (the
  // heaviest-weighted signal) — we genuinely don't know if this is a good
  // or bad site, and it would be actively misleading to score it as if we
  // do.
  private blockedResult(url: string, statusCode: number): WebsiteAnalysisResult {
    return {
      url,
      status: "not_analysed",
      score: null,
      objective: falseChecks(),
      subjective: stubSubjective(),
      summary:
        `Automated check was blocked (HTTP ${statusCode}) by the site's bot-protection. This is common on ` +
        `perfectly healthy websites (Cloudflare, Wordfence, and similar security plugins block automated ` +
        `requests) — it is NOT evidence the site is broken or weak. Open it manually in a browser to judge it.`,
      contact: noContact(),
    };
  }

  private brokenResult(url: string): WebsiteAnalysisResult {
    const objective = falseChecks();
    objective.loadsSuccessfully = false;
    objective.hasObviousBrokenLinks = true;
    objective.weakOrDatedDesignIndicators = true;

    return {
      url,
      status: "broken_website",
      score: 10,
      objective,
      subjective: stubSubjective(),
      summary:
        "Website did not load successfully during analysis. Likely expired hosting/domain, SSL failure, DNS issue, or the site is blocking automated requests.",
      contact: noContact(),
    };
  }
}

function falseChecks(): ObjectiveWebsiteChecks {
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

// Checks that are meaningful per-page and get OR-merged across the
// homepage + subpages. loadsSuccessfully/https/hasObviousBrokenLinks/
// weakOrDatedDesignIndicators are site-level, computed once from the
// homepage only.
type PageChecks = Omit<
  ObjectiveWebsiteChecks,
  "loadsSuccessfully" | "https" | "hasObviousBrokenLinks" | "weakOrDatedDesignIndicators"
>;

function computePageChecks(
  $: cheerio.CheerioAPI,
  html: string,
  bodyText: string,
  rawHtmlLower: string
): PageChecks {
  return {
    mobileResponsive: $('meta[name="viewport"]').length > 0,
    hasObviousPhoneNumber: /(\+44\s?\d{2,4}|\(?0\d{2,4}\)?)[\s-]?\d{3,4}[\s-]?\d{3,4}/.test(bodyText),
    hasClickToCallLink: $('a[href^="tel:"]').length > 0,
    hasClearPrimaryCTA: containsAny(bodyText, CTA_PHRASES) || hasCtaElement($),
    hasContactForm: hasContactFormEl($),
    hasQuoteOrEstimateForm:
      (hasContactFormEl($) && /quote|estimate/.test(bodyText)) ||
      /request a quote|get a quote|free estimate/.test(bodyText),
    hasOnlineBooking: containsAny(bodyText, BOOKING_KEYWORDS) || containsAny(rawHtmlLower, BOOKING_KEYWORDS),
    hasLiveChat: containsAny(rawHtmlLower, LIVE_CHAT_PATTERNS),
    hasTestimonialsOrReviews:
      /testimonial|what our customers say|5[\s-]?star|customer review/.test(bodyText) ||
      $('[itemtype*="Review"], [itemtype*="AggregateRating"]').length > 0,
    hasRecentProjectGallery:
      /gallery|portfolio|our work|recent projects|case studies|before and after/.test(bodyText) &&
      $("img").length > 4,
    hasServicesListed:
      /our services|services we offer|what we do/.test(bodyText) ||
      $("a, nav *").filter((_, el) => /^services?$/i.test($(el).text().trim())).length > 0,
    hasServiceAreasStated: /areas we cover|service area|areas covered|covering the|we cover/.test(bodyText),
    hasSocialLinks: SOCIAL_DOMAINS.some((d) => $(`a[href*="${d}"]`).length > 0),
    outdatedCopyrightYear: isOutdatedCopyright(bodyText + " " + rawHtmlLower),
  };
}

function orMergeChecks(a: PageChecks, b: PageChecks): PageChecks {
  const merged = { ...a };
  for (const key of Object.keys(b) as (keyof PageChecks)[]) {
    merged[key] = a[key] || b[key];
  }
  return merged;
}

// Finds up to MAX_SUBPAGES likely subpage URLs from the homepage nav: one
// contact-ish page, one quote/booking-ish page. Same-origin only.
function findSubpageLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }

  const found: string[] = [];
  const seen = new Set<string>([base.toString()]);

  function findFirstMatching(keywords: string[]): string | null {
    let match: string | null = null;
    $("a[href]").each((_, el) => {
      if (match) return;
      const href = $(el).attr("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;
      const text = $(el).text().trim().toLowerCase();
      const hrefLower = href.toLowerCase();
      if (!keywords.some((k) => text.includes(k) || hrefLower.includes(k))) return;
      try {
        const resolved = new URL(href, base);
        if (resolved.hostname !== base.hostname) return;
        const key = resolved.toString();
        if (seen.has(key)) return;
        match = key;
      } catch {
        // ignore unparsable hrefs
      }
    });
    return match;
  }

  const contactUrl = findFirstMatching(CONTACT_PAGE_KEYWORDS);
  if (contactUrl) {
    found.push(contactUrl);
    seen.add(contactUrl);
  }

  const bookingUrl = findFirstMatching(BOOKING_PAGE_KEYWORDS);
  if (bookingUrl) {
    found.push(bookingUrl);
    seen.add(bookingUrl);
  }

  return found.slice(0, MAX_SUBPAGES);
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function hasCtaElement($: cheerio.CheerioAPI): boolean {
  let found = false;
  $("a, button").each((_, el) => {
    if (found) return;
    const text = $(el).text().trim().toLowerCase();
    if (text && CTA_PHRASES.some((phrase) => text.includes(phrase))) found = true;
  });
  return found;
}

function hasContactFormEl($: cheerio.CheerioAPI): boolean {
  let found = false;
  $("form").each((_, el) => {
    if (found) return;
    const form = $(el);
    const hasEmailInput = form.find('input[type="email"]').length > 0;
    const hasTextarea = form.find("textarea").length > 0;
    const attrText = `${form.attr("id") ?? ""} ${form.attr("class") ?? ""} ${form.attr("action") ?? ""}`.toLowerCase();
    if (hasEmailInput || hasTextarea || attrText.includes("contact")) found = true;
  });
  return found;
}

function isOutdatedCopyright(text: string): boolean {
  const match = text.match(/(?:©|copyright)\s*(\d{4})/i);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const currentYear = new Date().getFullYear();
  return year > 1990 && year < currentYear - 1;
}

function computeWeakDesignIndicator(
  $: cheerio.CheerioAPI,
  checks: ObjectiveWebsiteChecks,
  html: string
): boolean {
  let signals = 0;
  if (!checks.mobileResponsive) signals++;
  if (checks.outdatedCopyrightYear) signals++;
  if (/<font[\s>]|<marquee[\s>]|<center[\s>]|<frameset[\s>]/i.test(html)) signals++;
  if ($("table").length > 2 && !checks.mobileResponsive) signals++;
  return signals >= 2;
}

// Weighted positive signals, normalised to 0-100, minus penalties for
// negative signals. Kept in its own function so the weighting is easy to
// retune without touching the detection logic above.
const POSITIVE_WEIGHTS: Partial<Record<keyof ObjectiveWebsiteChecks, number>> = {
  https: 5,
  mobileResponsive: 10,
  hasObviousPhoneNumber: 5,
  hasClickToCallLink: 5,
  hasClearPrimaryCTA: 10,
  hasContactForm: 10,
  hasQuoteOrEstimateForm: 10,
  hasOnlineBooking: 10,
  hasLiveChat: 5,
  hasTestimonialsOrReviews: 8,
  hasRecentProjectGallery: 7,
  hasServicesListed: 8,
  hasServiceAreasStated: 7,
  hasSocialLinks: 5,
};
const MAX_POSITIVE_WEIGHT = Object.values(POSITIVE_WEIGHTS).reduce((a, b) => a + (b ?? 0), 0);

function computeWebsiteScore(checks: ObjectiveWebsiteChecks): number {
  let sum = 0;
  for (const [key, weight] of Object.entries(POSITIVE_WEIGHTS) as [keyof ObjectiveWebsiteChecks, number][]) {
    if (checks[key]) sum += weight;
  }

  let score = (sum / MAX_POSITIVE_WEIGHT) * 100;
  if (checks.outdatedCopyrightYear) score -= 5;
  if (checks.hasObviousBrokenLinks) score -= 10;
  if (checks.weakOrDatedDesignIndicators) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusFromScore(score: number): Exclude<WebsiteStatus, "no_website" | "social_only" | "broken_website" | "not_analysed"> {
  if (score < 35) return "weak_website";
  if (score < 70) return "average_website";
  return "strong_website";
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

function noContact(): ExtractedContactInfo {
  return { email: null, facebookUrl: null, instagramUrl: null, linkedinUrl: null };
}

// Pull contact details straight out of the homepage: the first mailto: link
// (falling back to a plain-text email regex), and the first Facebook/
// Instagram link found anywhere on the page. Cheap, deterministic, and fills
// a real gap since Google Places doesn't return email or social profiles.
function extractContactInfo($: cheerio.CheerioAPI, baseUrl: string): ExtractedContactInfo {
  let email: string | null = null;
  const mailtoHref = $('a[href^="mailto:"]').first().attr("href");
  if (mailtoHref) {
    email = mailtoHref.replace(/^mailto:/i, "").split("?")[0].trim() || null;
  }
  if (!email) {
    const text = $("body").text();
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    email = match ? match[0] : null;
  }

  const findSocialLink = (domain: string): string | null => {
    const href = $(`a[href*="${domain}"]`).first().attr("href");
    if (!href) return null;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  };

  return {
    email,
    facebookUrl: findSocialLink("facebook.com"),
    instagramUrl: findSocialLink("instagram.com"),
    linkedinUrl: findSocialLink("linkedin.com"),
  };
}
