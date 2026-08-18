// BusinessEnrichmentService — the new stage between V1 discovery/analysis
// and website generation. Crawls the business's OWN first-party website
// (bounded, same-origin only) to extract structured facts that V1's
// website analyzer never captured (it only checked for objective UX
// signals like "has a contact form", not what the business actually says
// about itself).
//
// Scope decision: this only crawls the confirmed first-party website.
// External sources (Companies House, industry directories, social
// profiles) are NOT implemented here — that's a materially larger effort
// (new API integrations, legal/rate-limit handling per source) that
// deserves its own pass rather than a rushed addition. See the final
// report for this being called out as a known limitation.
//
// Every extracted fact keeps a source URL and a confidence level. Nothing
// here is ever promoted to CONFIRMED without being explicitly present in
// the page text — no inference across pages, no filling gaps from what's
// "typical" for the industry.

import * as cheerio from "cheerio";
import type { FactStatus } from "./types";

const MAX_PAGES = 8;
const MAX_DEPTH = 2;
const FETCH_TIMEOUT_MS = 5000;
const USER_AGENT = "Mozilla/5.0 (compatible; UKLocalOpportunityFinder/1.0; +demo-enrichment)";

const SKIP_URL_KEYWORDS = [
  "blog", "news", "privacy", "cookie", "terms", "sitemap", "wp-admin", "wp-login",
  "cart", "checkout", "login", "account", "wp-content/uploads", ".pdf", ".jpg", ".png", ".zip",
];

// Pages likely to contain useful customer-facing facts, roughly in priority order.
const PRIORITY_KEYWORDS = [
  "service", "what-we-do", "about", "who-we-are", "contact", "area", "coverage",
  "gallery", "project", "portfolio", "work", "faq", "team", "testimonial", "review",
  "accredit", "quote", "booking", "process", "how-it-works",
];

export interface EnrichedFact {
  value: string;
  confidence: FactStatus;
  sourceUrl: string;
}

export interface EnrichmentResult {
  pagesVisited: string[];
  services: EnrichedFact[];
  descriptionParagraphs: EnrichedFact[];
  trustSignals: EnrichedFact[];
  establishedYear: EnrichedFact | null;
  customerTypes: EnrichedFact[];
  additionalServiceAreas: EnrichedFact[];
}

const EMPTY_RESULT: EnrichmentResult = {
  pagesVisited: [],
  services: [],
  descriptionParagraphs: [],
  trustSignals: [],
  establishedYear: null,
  customerTypes: [],
  additionalServiceAreas: [],
};

// SSRF guard: business.website_url is attacker-influenceable (anyone can
// list a business on Google Maps with an arbitrary "website"). Reject
// non-http(s) protocols and obvious internal/private/link-local targets
// before ever fetching — this is a server-side crawler, not a browser.
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);
function isPrivateOrInternalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(lower)) return true;
  if (lower.endsWith(".local") || lower.endsWith(".internal")) return true;
  // IPv4 literal checks: loopback, private ranges, link-local (incl. cloud
  // metadata at 169.254.169.254), and 0.0.0.0/8.
  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  if (lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  return false;
}

function isSafeCrawlUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isPrivateOrInternalHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  if (!isSafeCrawlUrl(url)) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    if (!res.ok) return null;
    // Reject if the final URL (after redirects) resolved somewhere unsafe.
    if (!isSafeCrawlUrl(res.url)) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function isCrawlAllowed(origin: string): Promise<boolean> {
  const html = await fetchPage(`${origin}/robots.txt`);
  if (!html) return true; // no robots.txt or unreachable — treat as allowed
  // Minimal check: a blanket "Disallow: /" under "User-agent: *" blocks us entirely.
  // Not a full robots.txt parser — just enough to respect an explicit full block.
  const blocksAll = /user-agent:\s*\*[\s\S]{0,200}?disallow:\s*\/\s*(\n|$)/i.test(html);
  return !blocksAll;
}

function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return SKIP_URL_KEYWORDS.some((kw) => lower.includes(kw));
}

function priorityScore(url: string, linkText: string): number {
  const haystack = `${url} ${linkText}`.toLowerCase();
  const idx = PRIORITY_KEYWORDS.findIndex((kw) => haystack.includes(kw));
  return idx === -1 ? 999 : idx;
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string, origin: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl);
      resolved.hash = "";
      if (resolved.origin !== origin) return;
      if (shouldSkipUrl(resolved.href)) return;
      links.push({ url: resolved.href, text: $(el).text().trim().slice(0, 60) });
    } catch {
      // ignore malformed hrefs
    }
  });
  return links;
}

function pageMainText($: cheerio.CheerioAPI): string {
  const clone = $.root().clone();
  clone.find("nav, header, footer, script, style, noscript").remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

const SERVICE_HEADING_STOPWORDS = new Set([
  "home", "about", "about us", "contact", "contact us", "our services", "services",
  "gallery", "faq", "faqs", "blog", "news", "reviews", "testimonials", "get in touch",
  "get a quote", "request a quote", "welcome",
]);

// Marketing/navigation headings ("Why Choose Us", "What Our Customers Say")
// read as section titles, not service names — reject by leading word or
// phrase rather than trying to enumerate every possible heading.
const SERVICE_HEADING_REJECT_PATTERNS = [
  /^why\b/i, /^what\b/i, /^how\b/i, /^our\b/i, /^who\b/i,
  /customers? say/i, /choose us/i, /get started/i, /find out more/i, /learn more/i,
  /^\d{4}$/, // bare years
];

// Phone numbers, postcodes, and dates commonly appear in <li> elements
// inside nav/footer contact blocks — reject anything that looks like one
// rather than a service name, in addition to scoping the scan away from
// nav/header/footer entirely.
const PHONE_LIKE = /(\+?\d[\d\s()-]{7,}\d)/;
const POSTCODE_LIKE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i;

function extractServiceHeadings($: cheerio.CheerioAPI, url: string): EnrichedFact[] {
  const facts: EnrichedFact[] = [];
  const clone = $.root().clone();
  clone.find("nav, header, footer, script, style, noscript, form").remove();
  const scoped = cheerio.load(clone.html() ?? "");

  scoped("h2, h3, li").each((_, el) => {
    const text = scoped(el).text().replace(/\s+/g, " ").trim();
    if (!text) return;
    const words = text.split(" ").length;
    if (text.length < 3 || text.length > 60 || words > 8) return;
    const normalised = text.toLowerCase();
    if (SERVICE_HEADING_STOPWORDS.has(normalised)) return;
    if (SERVICE_HEADING_REJECT_PATTERNS.some((re) => re.test(text))) return;
    if (/^\d+$/.test(text)) return;
    if (PHONE_LIKE.test(text) || POSTCODE_LIKE.test(text)) return;
    facts.push({ value: text, confidence: "CONFIRMED", sourceUrl: url });
  });
  return facts;
}

const TRUST_PATTERNS: { re: RegExp; label: (m: RegExpMatchArray) => string }[] = [
  { re: /\b(accredited by|accreditation from|certified by)\s+([A-Z][A-Za-z0-9&.\- ]{2,40})/i, label: (m) => `Accredited by ${m[2].trim()}` },
  { re: /\bmember of\s+([A-Z][A-Za-z0-9&.\- ]{2,50})/i, label: (m) => `Member of ${m[1].trim()}` },
  { re: /\bfully insured\b/i, label: () => "Fully insured" },
  { re: /\b(\d+)[\s-]year(?:s)? guarantee\b/i, label: (m) => `${m[1]}-year guarantee` },
  { re: /\bmoney[\s-]back guarantee\b/i, label: () => "Money-back guarantee" },
  { re: /\bDBS[\s-]checked\b/i, label: () => "DBS checked" },
  { re: /\baward[\s-]winning\b/i, label: () => "Award-winning (as stated on their own site)" },
];

function extractTrustSignals(text: string, url: string): EnrichedFact[] {
  const facts: EnrichedFact[] = [];
  for (const { re, label } of TRUST_PATTERNS) {
    const match = text.match(re);
    if (match) facts.push({ value: label(match), confidence: "CONFIRMED", sourceUrl: url });
  }
  return facts;
}

function extractEstablishedYear(text: string, url: string): EnrichedFact | null {
  const match = text.match(/\b(?:established|founded|est\.?|trading since)\s*(?:in\s*)?(\d{4})\b/i);
  if (!match) return null;
  const year = Number(match[1]);
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return null;
  return { value: match[1], confidence: "CONFIRMED", sourceUrl: url };
}

const CUSTOMER_TYPE_KEYWORDS = [
  "homeowners", "landlords", "commercial clients", "residential customers",
  "property managers", "sole traders", "limited companies", "businesses",
];

function extractCustomerTypes(text: string, url: string): EnrichedFact[] {
  const lower = text.toLowerCase();
  return CUSTOMER_TYPE_KEYWORDS.filter((kw) => lower.includes(kw)).map((kw) => ({
    value: kw.replace(/\b\w/g, (c) => c.toUpperCase()),
    confidence: "CONFIRMED" as FactStatus,
    sourceUrl: url,
  }));
}

function extractDescriptionParagraph($: cheerio.CheerioAPI, url: string): EnrichedFact[] {
  const facts: EnrichedFact[] = [];
  $("main p, article p, body p").each((_, el) => {
    if (facts.length >= 2) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length < 60 || text.length > 400) return;
    facts.push({ value: text, confidence: "CONFIRMED", sourceUrl: url });
  });
  return facts;
}

export async function enrichFromWebsite(websiteUrl: string): Promise<EnrichmentResult> {
  if (!isSafeCrawlUrl(websiteUrl)) return EMPTY_RESULT;

  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return EMPTY_RESULT;
  }

  if (!(await isCrawlAllowed(origin))) return EMPTY_RESULT;

  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = [{ url: websiteUrl, depth: 0 }];
  const result: EnrichmentResult = {
    pagesVisited: [], services: [], descriptionParagraphs: [], trustSignals: [],
    establishedYear: null, customerTypes: [], additionalServiceAreas: [],
  };

  while (queue.length > 0 && visited.size < MAX_PAGES) {
    queue.sort((a, b) => a.depth - b.depth);
    const next = queue.shift();
    if (!next || visited.has(next.url)) continue;
    visited.add(next.url);

    const html = await fetchPage(next.url);
    if (!html) continue;

    const $ = cheerio.load(html);
    result.pagesVisited.push(next.url);

    const mainText = pageMainText($);
    result.services.push(...extractServiceHeadings($, next.url));
    result.descriptionParagraphs.push(...extractDescriptionParagraph($, next.url));
    result.trustSignals.push(...extractTrustSignals(mainText, next.url));
    result.customerTypes.push(...extractCustomerTypes(mainText, next.url));
    if (!result.establishedYear) result.establishedYear = extractEstablishedYear(mainText, next.url);

    if (next.depth < MAX_DEPTH && visited.size < MAX_PAGES) {
      const links = extractLinks($, next.url, origin)
        .filter((l) => !visited.has(l.url) && !queue.some((q) => q.url === l.url))
        .sort((a, b) => priorityScore(a.url, a.text) - priorityScore(b.url, b.text))
        .slice(0, MAX_PAGES);
      for (const link of links) queue.push({ url: link.url, depth: next.depth + 1 });
    }
  }

  // Dedupe services by normalised text, cap to a sane number.
  const seen = new Set<string>();
  result.services = result.services
    .filter((s) => {
      const key = s.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  const seenTrust = new Set<string>();
  result.trustSignals = result.trustSignals.filter((s) => {
    if (seenTrust.has(s.value)) return false;
    seenTrust.add(s.value);
    return true;
  });

  const seenCustomer = new Set<string>();
  result.customerTypes = result.customerTypes.filter((s) => {
    if (seenCustomer.has(s.value)) return false;
    seenCustomer.add(s.value);
    return true;
  });

  return result;
}
