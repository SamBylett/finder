// Lovable prompt generator — V2.5's single new AI call for the demo-prep
// workflow. Follows lib/demo/strategy.ts's exact established pattern
// (singleton client, claude-sonnet-5, output_config.format: json_schema,
// explicit ANTHROPIC_API_KEY check, refusal check, stripEmDashesFromString
// on every output string) rather than inventing a new one.

import Anthropic from "@anthropic-ai/sdk";
import type { DemoAsset, DemoBusinessProfile, LovableBrief } from "./types";
import { describeProfileForPrompt } from "./prompt-context";
import { archetypeMeta } from "./industry";
import { stripEmDashesFromString } from "./copy";

const MODEL = "claude-sonnet-5";

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    business_facts_block: { type: "string" },
    factual_guardrails: { type: "array", items: { type: "string" } },
    design_direction: { type: "string" },
    copy_rules: { type: "array", items: { type: "string" } },
    page_structure: { type: "array", items: { type: "string" } },
    conversion_goal: { type: "string" },
    imagery_instructions: { type: "string" },
    mobile_instructions: { type: "string" },
    final_qa_instructions: { type: "string" },
    full_prompt: { type: "string" },
  },
  required: [
    "business_facts_block", "factual_guardrails", "design_direction", "copy_rules", "page_structure",
    "conversion_goal", "imagery_instructions", "mobile_instructions", "final_qa_instructions", "full_prompt",
  ],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function generateLovablePrompt(
  profile: DemoBusinessProfile,
  assets: DemoAsset[]
): Promise<LovableBrief> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured — cannot generate a Lovable prompt.");
  }

  const meta = archetypeMeta(profile.business_archetype);
  const realAssets = assets.filter((a) => a.business_owned && !a.placeholder);

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 6000,
    output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `Prepare a detailed website-build prompt for a human to paste directly into Lovable.dev to manually build a real ` +
          `website for this UK local service business. You are not writing the website copy yourself — you are writing ` +
          `INSTRUCTIONS for Lovable's AI builder, grounded strictly in the confirmed facts below.\n\n` +
          `Business data:\n${describeProfileForPrompt(profile)}\n\n` +
          `Available real business imagery: ${realAssets.length > 0
            ? `${realAssets.length} real photo(s) from ${realAssets[0].source_provider}. Tell Lovable to prioritise real ` +
              `imagery over generic stock photos and to treat these as the actual business, not placeholder content.`
            : "None. Tell Lovable there is no real business photography available and it should NOT invent or imply " +
              "specific project photos — use tasteful generic/abstract visual treatment instead, especially important " +
              "for a professional-services business which can look excellent with little or no imagery."}\n\n` +
          `Write each field as follows:\n` +
          `- business_facts_block: a clean bullet-style list of every confirmed fact above (name, location, phone, rating, ` +
          `confirmed services, credentials, etc.) — nothing not listed above.\n` +
          `- factual_guardrails: an explicit list of what Lovable must NOT invent — always include services, years of ` +
          `experience, reviews/testimonials, guarantees, qualifications, accreditations, service areas, awards, team size, ` +
          `response times, and pricing, UNLESS that specific fact is confirmed above (in which case state the confirmed ` +
          `value instead of banning it).\n` +
          `- design_direction: specific to this business's archetype (${profile.business_archetype.replace(/_/g, " ")}) and ` +
          `whether real imagery exists — e.g. a roofer with real photos should be image-led/project-proof-led; an ` +
          `accountant should be editorial/restrained/authority-led regardless of imagery. Do not give generic advice — ` +
          `name specific typographic/layout choices appropriate to this exact business.\n` +
          `- copy_rules: British English, no em dashes, no AI clichés ("trusted partner", "unparalleled", etc.), no ` +
          `unsupported claims, natural wording a real small business would actually use.\n` +
          `- page_structure: a recommended one-page section order appropriate to THIS business's data richness (` +
          `${profile.content_richness}) and archetype — do not default to a generic template list; a sparse business should ` +
          `get fewer, more considered sections than a rich one.\n` +
          `- conversion_goal: matching this business's conversion model ("${profile.conversion_model.replace(/_/g, " ")}"), ` +
          `phrased naturally (reference examples: hero="${meta.ctaLibrary.hero}", form="${meta.ctaLibrary.form}" as a tone ` +
          `guide, not verbatim).\n` +
          `- imagery_instructions: state exactly how many real images are available and where they came from (or that none ` +
          `exist), and instruct Lovable accordingly (never pretend placeholders are genuine project photos).\n` +
          `- mobile_instructions: explicit, specific mobile-quality requirements (headline wrapping, CTA size/placement, ` +
          `image cropping, nav).\n` +
          `- final_qa_instructions: ask Lovable to critically self-review the result against the factual guardrails and ` +
          `copy rules before finishing.\n` +
          `- full_prompt: assemble ALL of the above into one complete, well-formatted, paste-ready prompt a human can copy ` +
          `directly into Lovable with no further editing needed.\n\n` +
          `Do not use em dashes anywhere. Never invent a fact not present in the business data above.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Lovable prompt generation was refused by the model.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Lovable prompt generation returned no content.");
  }

  const parsed = JSON.parse(textBlock.text) as Omit<LovableBrief, "generatedAt">;
  const clean = (s: string) => stripEmDashesFromString(s);

  return {
    business_facts_block: clean(parsed.business_facts_block),
    factual_guardrails: parsed.factual_guardrails.map(clean),
    design_direction: clean(parsed.design_direction),
    copy_rules: parsed.copy_rules.map(clean),
    page_structure: parsed.page_structure.map(clean),
    conversion_goal: clean(parsed.conversion_goal),
    imagery_instructions: clean(parsed.imagery_instructions),
    mobile_instructions: clean(parsed.mobile_instructions),
    final_qa_instructions: clean(parsed.final_qa_instructions),
    full_prompt: clean(parsed.full_prompt),
    generatedAt: new Date().toISOString(),
  };
}
