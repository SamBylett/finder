// WebsiteCopyGenerator — second AI call, grounded in the profile AND the
// strategy already produced. UK English, no invented facts, no clichés.

import Anthropic from "@anthropic-ai/sdk";
import type { DemoBusinessProfile, WebsiteCopy, WebsiteStrategy } from "./types";
import { describeProfileForPrompt } from "./prompt-context";
import { archetypeMeta } from "./industry";

const MODEL = "claude-sonnet-5";

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    navigation_labels: { type: "array", items: { type: "string" } },
    hero_eyebrow: { type: ["string", "null"] },
    hero_headline: { type: "string" },
    hero_supporting_text: { type: "string" },
    primary_cta: { type: "string" },
    secondary_cta: { type: ["string", "null"] },
    trust_bar_text: { type: ["string", "null"] },
    services_intro: { type: "string" },
    service_cards: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, description: { type: "string" } },
        required: ["name", "description"],
        additionalProperties: false,
      },
    },
    about: { type: "string" },
    why_choose_us: { type: "array", items: { type: "string" } },
    gallery_intro: { type: ["string", "null"] },
    testimonials_heading: { type: ["string", "null"] },
    service_area_content: { type: ["string", "null"] },
    faq: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    final_cta_heading: { type: "string" },
    final_cta_body: { type: "string" },
    contact_content: { type: "string" },
    footer_content: { type: "string" },
    seo_title: { type: "string" },
    seo_description: { type: "string" },
    who_we_help_intro: { type: ["string", "null"] },
    who_we_help_audiences: { type: "array", items: { type: "string" } },
    expertise_intro: { type: ["string", "null"] },
    expertise_items: { type: "array", items: { type: "string" } },
    process_intro: { type: ["string", "null"] },
    process_steps: { type: "array", items: { type: "string" } },
  },
  required: [
    "navigation_labels", "hero_eyebrow", "hero_headline", "hero_supporting_text", "primary_cta",
    "secondary_cta", "trust_bar_text", "services_intro", "service_cards", "about", "why_choose_us",
    "gallery_intro", "testimonials_heading", "service_area_content", "faq", "final_cta_heading",
    "final_cta_body", "contact_content", "footer_content", "seo_title", "seo_description",
    "who_we_help_intro", "who_we_help_audiences", "expertise_intro", "expertise_items",
    "process_intro", "process_steps",
  ],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const BANNED_PHRASES = [
  "your trusted partner", "where quality meets", "we pride ourselves",
  "unparalleled service", "customer satisfaction is our priority", "bringing your vision to life",
];

// Self-validating FAQ questions ("are you legit") read as machine-generated
// filler and never appear on a real business's own site. Grounded in the
// prompt AND enforced as a deterministic post-filter — see stripBannedFaq.
const BANNED_FAQ_PATTERNS = [
  /\breputable\b/i, /\btrust(worthy)?\b.*\byou\b/i, /\bcan i trust\b/i, /\blegit(imate)?\b/i,
  /\bare you (a )?(good|reliable|real)\b/i,
];

function stripBannedFaq(faq: { question: string; answer: string }[]): { question: string; answer: string }[] {
  return faq.filter((item) => !BANNED_FAQ_PATTERNS.some((re) => re.test(item.question)));
}

// Deterministic safety net — the prompt asks for no em dashes, but LLMs
// slip. Only touches generated display copy strings, never URLs/names/data.
// Exported so strategy.ts can apply the same sanitisation (WebsiteStrategy
// isn't rendered on the public page, but it's stored/queryable data and the
// V2.3 acceptance test scans generated content broadly, not just what's
// currently wired up to a component).
export function stripEmDashesFromString(text: string): string {
  // "word — word" -> "word, word"; "word—word" (no surrounding spaces) -> "word - word"
  return text
    .replace(/\s+[—–]\s+/g, ", ")
    .replace(/([a-zA-Z0-9])[—–]([a-zA-Z0-9])/g, "$1 - $2")
    .replace(/[—–]/g, ",");
}

function stripEmDashes(copy: WebsiteCopy): WebsiteCopy {
  const clean = <T,>(v: T): T => (typeof v === "string" ? (stripEmDashesFromString(v) as unknown as T) : v);
  return {
    ...copy,
    navigation_labels: copy.navigation_labels.map(clean),
    hero_eyebrow: copy.hero_eyebrow ? stripEmDashesFromString(copy.hero_eyebrow) : copy.hero_eyebrow,
    hero_headline: clean(copy.hero_headline),
    hero_supporting_text: clean(copy.hero_supporting_text),
    primary_cta: clean(copy.primary_cta),
    secondary_cta: copy.secondary_cta ? stripEmDashesFromString(copy.secondary_cta) : copy.secondary_cta,
    trust_bar_text: copy.trust_bar_text ? stripEmDashesFromString(copy.trust_bar_text) : copy.trust_bar_text,
    services_intro: clean(copy.services_intro),
    service_cards: copy.service_cards.map((c) => ({ name: clean(c.name), description: clean(c.description) })),
    about: clean(copy.about),
    why_choose_us: copy.why_choose_us.map(clean),
    gallery_intro: copy.gallery_intro ? stripEmDashesFromString(copy.gallery_intro) : copy.gallery_intro,
    testimonials_heading: copy.testimonials_heading ? stripEmDashesFromString(copy.testimonials_heading) : copy.testimonials_heading,
    service_area_content: copy.service_area_content ? stripEmDashesFromString(copy.service_area_content) : copy.service_area_content,
    faq: copy.faq.map((f) => ({ question: clean(f.question), answer: clean(f.answer) })),
    final_cta_heading: clean(copy.final_cta_heading),
    final_cta_body: clean(copy.final_cta_body),
    contact_content: clean(copy.contact_content),
    footer_content: clean(copy.footer_content),
    seo_title: clean(copy.seo_title),
    seo_description: clean(copy.seo_description),
    who_we_help_intro: copy.who_we_help_intro ? stripEmDashesFromString(copy.who_we_help_intro) : copy.who_we_help_intro,
    who_we_help_audiences: copy.who_we_help_audiences.map(clean),
    expertise_intro: copy.expertise_intro ? stripEmDashesFromString(copy.expertise_intro) : copy.expertise_intro,
    expertise_items: copy.expertise_items.map(clean),
    process_intro: copy.process_intro ? stripEmDashesFromString(copy.process_intro) : copy.process_intro,
    process_steps: copy.process_steps.map(clean),
  };
}

export async function generateWebsiteCopy(
  profile: DemoBusinessProfile,
  strategy: WebsiteStrategy
): Promise<WebsiteCopy> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured — cannot generate website copy.");
  }

  const meta = archetypeMeta(profile.business_archetype);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2400,
    output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `Write the on-page copy for a speculative demo website for this UK local service business, as a sales asset to ` +
          `pitch them a modern website — they have not commissioned it.\n\n` +
          `Business data:\n${describeProfileForPrompt(profile)}\n\n` +
          `Website strategy already agreed:\n${JSON.stringify(strategy, null, 2)}\n\n` +
          `Writing rules:\n` +
          `- Natural UK English, concise, credible.\n` +
          `- Never invent facts not present in the business data above (years of experience, certifications, ` +
          `awards, guarantees, team size, customer counts, prices, memberships, review quotes).\n` +
          `- If a section would require an unconfirmed fact, write it generically instead of guessing.\n` +
          `- Avoid hype, filler, and generic AI phrasing. Never claim "leading" or "best" without evidence.\n` +
          `- Do NOT use em dashes (—) or double hyphens (--) anywhere. Use a comma, full stop, or colon instead.\n` +
          `- Avoid other obvious AI writing patterns: excessive semicolons, rhetorical fragments, starting a sentence with ` +
          `"Whether you're...", "From X to Y...", or stacking three-item lists everywhere. Write like a straightforward ` +
          `professional business would write about itself.\n` +
          `- Do not use these exact clichés unless the wording comes directly from the business itself: ` +
          `${BANNED_PHRASES.map((p) => `"${p}"`).join(", ")}.\n` +
          `- Source-priority for service_cards and any service terminology, in order: (1) confirmed_services if listed above, ` +
          `using their exact meaningful distinctions (e.g. "flat roofing" vs "pitched roofing" if both are confirmed) — ` +
          `(2) the customer-facing category — (3) a safe generic description as a last resort. Never invent a specific ` +
          `service just because businesses of this type commonly offer it.\n` +
          `- CTAs must fit the "${profile.conversion_model.replace(/_/g, " ")}" conversion model. Tone reference for this ` +
          `business type — hero: "${meta.ctaLibrary.hero}", mid-page: "${meta.ctaLibrary.mid}", final: "${meta.ctaLibrary.final}", ` +
          `phone button: "${meta.ctaLibrary.phone}", form submit: "${meta.ctaLibrary.form}". Adapt naturally, don't copy verbatim, ` +
          `but stay in that register — ${meta.professionalSections ? "never use trades \"quote\"/\"job\" language" : "quote/callout language is fine if it fits"}.\n` +
          `- FAQ: 3-5 REAL prospective-customer questions, grounded in examples like: ${meta.faqExamples.map((q) => `"${q}"`).join(", ")}. ` +
          `Never generate self-validating trust questions such as "Are you reputable?" or "How do I know I can trust you?" — ` +
          `real businesses don't put those on their own site. Only mention services/capabilities the answer can honestly support.\n` +
          `- About: if content richness is SPARSE or little is confirmed, keep it to 1-2 short sentences. Do not pad with ` +
          `restated database facts ("X is based in Y and has Z reviews and offers W"). A short honest paragraph beats a long ` +
          `generic one.\n` +
          `- The Google rating is trust proof that will already appear prominently elsewhere on the page — do not restate the ` +
          `exact rating/review numbers in hero_supporting_text, about, AND final_cta_body; use it at most once outside the ` +
          `dedicated trust section.\n` +
          `- service_cards should reflect priority_services from the strategy; keep names short and descriptions to one sentence.\n` +
          `- If service_area_content or testimonials_heading don't make sense given missing data, return null for them.\n` +
          (meta.professionalSections
            ? `- This is a professional-services business: populate who_we_help_intro/who_we_help_audiences ONLY with audiences ` +
              `reasonably supported by the category/services evidence (e.g. do not claim "limited companies" service unless ` +
              `evidenced) — otherwise return null/[]. Populate expertise_intro/expertise_items conservatively from the ` +
              `customer-facing category and any confirmed services — otherwise null/[]. process_steps should be a short, ` +
              `conservative, generic 3-step process (e.g. "Get in touch", "Discuss your requirements", "Receive advice/next ` +
              `steps") since we don't know their actual process — do not invent specifics.\n`
            : `- This is not a professional-services business — return null/[] for who_we_help_intro, who_we_help_audiences, ` +
              `expertise_intro, expertise_items, process_intro, process_steps.\n`),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Website copy generation was refused by the model.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Website copy generation returned no content.");
  }

  const parsed = JSON.parse(textBlock.text) as WebsiteCopy;
  return stripEmDashes({ ...parsed, faq: stripBannedFaq(parsed.faq) });
}
