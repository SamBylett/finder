// WebsiteStrategyGenerator — first of three explicit, separately-triggered
// Claude calls in the demo pipeline (strategy -> copy -> site director).
// Grounded strictly in confirmed_services/website_weaknesses/etc from the
// DemoBusinessProfile; the prompt explicitly forbids inventing facts.

import Anthropic from "@anthropic-ai/sdk";
import type { DemoBusinessProfile, WebsiteStrategy } from "./types";
import { describeProfileForPrompt } from "./prompt-context";
import { archetypeMeta } from "./industry";
import { stripEmDashesFromString } from "./copy";

const MODEL = "claude-sonnet-5";

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    positioning: { type: "string" },
    target_customer: { type: "string" },
    primary_conversion_goal: { type: "string" },
    primary_cta: { type: "string" },
    secondary_cta: { type: ["string", "null"] },
    trust_signals: { type: "array", items: { type: "string" } },
    priority_services: { type: "array", items: { type: "string" } },
    visitor_questions: { type: "array", items: { type: "string" } },
    messaging_angle: { type: "string" },
    page_structure_recommendation: { type: "string" },
    tone: { type: "string" },
    visual_direction: { type: "string" },
    local_seo_focus: { type: "string" },
    seo_title: { type: "string" },
    seo_description: { type: "string" },
  },
  required: [
    "positioning", "target_customer", "primary_conversion_goal", "primary_cta",
    "secondary_cta", "trust_signals", "priority_services", "visitor_questions",
    "messaging_angle", "page_structure_recommendation", "tone", "visual_direction",
    "local_seo_focus", "seo_title", "seo_description",
  ],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function generateWebsiteStrategy(profile: DemoBusinessProfile): Promise<WebsiteStrategy> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured — cannot generate a website strategy.");
  }

  const meta = archetypeMeta(profile.business_archetype);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1200,
    output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `You are planning a website strategy for a speculative demo website built for a UK local service business, ` +
          `as a sales asset to show them what a modern website could look like. This business has NOT commissioned this site — ` +
          `it is being prepared to pitch to them, so credibility and restraint matter more than hype.\n\n` +
          `Only use facts explicitly given below. Do not invent years of experience, certifications, awards, team size, ` +
          `customer counts, prices, or any claim not present in the data. If information is missing, work around it — ` +
          `do not guess it.\n\n` +
          `Business data:\n${describeProfileForPrompt(profile)}\n\n` +
          `The conversion model for this business is "${profile.conversion_model.replace(/_/g, " ")}" — primary_cta and ` +
          `secondary_cta MUST fit that action, not a generic "get a quote". Example wording that fits this business type: ` +
          `primary ~"${meta.ctaLibrary.hero}", secondary ~"${meta.ctaLibrary.form}". Use these as a tone guide, not verbatim ` +
          `requirements — adapt naturally to the business.\n` +
          (meta.professionalSections
            ? `This is a professional-services business — do NOT use trades language ("quote", "call-out", "job"). Use ` +
              `consultation/enquiry language instead.\n`
            : ``) +
          `Avoid unnecessary adjectives such as "trusted", "leading", "expert", "premier", or "exceptional" unless directly ` +
          `supported by the data (a strong confirmed rating/review count can justify "highly-rated", nothing else).\n` +
          `The Google rating/review count is valuable trust proof but will already be shown prominently in its own section — ` +
          `don't plan for it to be repeated in multiple places; mention it as trust_signals once, not as a refrain.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Website strategy generation was refused by the model.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Website strategy generation returned no content.");
  }

  const parsed = JSON.parse(textBlock.text) as WebsiteStrategy;
  const clean = (v: string) => stripEmDashesFromString(v);
  return {
    ...parsed,
    positioning: clean(parsed.positioning),
    target_customer: clean(parsed.target_customer),
    primary_conversion_goal: clean(parsed.primary_conversion_goal),
    primary_cta: clean(parsed.primary_cta),
    secondary_cta: parsed.secondary_cta ? clean(parsed.secondary_cta) : parsed.secondary_cta,
    trust_signals: parsed.trust_signals.map(clean),
    priority_services: parsed.priority_services.map(clean),
    visitor_questions: parsed.visitor_questions.map(clean),
    messaging_angle: clean(parsed.messaging_angle),
    page_structure_recommendation: clean(parsed.page_structure_recommendation),
    tone: clean(parsed.tone),
    visual_direction: clean(parsed.visual_direction),
    local_seo_focus: clean(parsed.local_seo_focus),
    seo_title: clean(parsed.seo_title),
    seo_description: clean(parsed.seo_description),
  };
}
