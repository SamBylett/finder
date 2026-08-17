// WebsiteCopyGenerator — second AI call, grounded in the profile AND the
// strategy already produced. UK English, no invented facts, no clichés.

import Anthropic from "@anthropic-ai/sdk";
import type { DemoBusinessProfile, WebsiteCopy, WebsiteStrategy } from "./types";
import { describeProfileForPrompt } from "./prompt-context";

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
  },
  required: [
    "navigation_labels", "hero_eyebrow", "hero_headline", "hero_supporting_text", "primary_cta",
    "secondary_cta", "trust_bar_text", "services_intro", "service_cards", "about", "why_choose_us",
    "gallery_intro", "testimonials_heading", "service_area_content", "faq", "final_cta_heading",
    "final_cta_body", "contact_content", "footer_content", "seo_title", "seo_description",
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

export async function generateWebsiteCopy(
  profile: DemoBusinessProfile,
  strategy: WebsiteStrategy
): Promise<WebsiteCopy> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured — cannot generate website copy.");
  }

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
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
          `- Do not use these exact clichés unless the wording comes directly from the business itself: ` +
          `${BANNED_PHRASES.map((p) => `"${p}"`).join(", ")}.\n` +
          `- service_cards should reflect priority_services from the strategy; keep names short and descriptions to one sentence.\n` +
          `- faq should be 3-5 realistic questions a prospective customer in this trade would ask, answered generically ` +
          `and honestly (no invented turnaround times, prices, or guarantees).\n` +
          `- If service_area_content or testimonials_heading don't make sense given missing data, return null for them.`,
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

  return JSON.parse(textBlock.text) as WebsiteCopy;
}
