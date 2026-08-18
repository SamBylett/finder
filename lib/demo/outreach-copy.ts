// Outreach message generator (V2.5). One AI call handles every channel/kind
// combination via parameters rather than 6 near-identical calls. Never runs
// automatically — only from an explicit per-message "Generate"/"Regenerate"
// click, and the result is persisted (demos.outreach_messages) so
// revisiting the page never re-calls Claude. This generates copy only —
// it never sends anything.

import Anthropic from "@anthropic-ai/sdk";
import type { DemoBusinessProfile, OutreachChannel, OutreachKind, OutreachMessage } from "./types";
import { stripEmDashesFromString } from "./copy";
import { archetypeMeta } from "./industry";

const MODEL = "claude-sonnet-5";

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    subject: { type: ["string", "null"] },
    body: { type: "string" },
  },
  required: ["subject", "body"],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const CHANNEL_TONE: Record<OutreachChannel, string> = {
  email: "Email: subject required, short (2-4 words, vary the style each time — e.g. \"website idea\", \"quick idea\", " +
    "\"site concept\" are examples, not a fixed list, never reuse the exact same subject style every time). Body 40-90 words.",
  whatsapp: "WhatsApp: no subject. Extremely natural and short, like a real person texting, not a business message. " +
    "1-3 short sentences.",
  facebook: "Facebook DM: no subject. Short, casual, friendly. 1-3 short sentences. Do not over-personalise with a large " +
    "amount of scraped detail — one specific observation is enough.",
  instagram: "Instagram DM: no subject. Same register as Facebook — short, casual, one specific observation.",
  linkedin: "LinkedIn message: no subject. Professional but warm register, slightly more formal than WhatsApp/social DMs.",
};

const KIND_INSTRUCTIONS: Record<OutreachKind, string> = {
  first_contact:
    "This is the FIRST message to this business. The objective is curiosity, not explaining the full offer. Do not " +
    "pitch pricing or any named service/package. Reference one specific, genuine observation about the business " +
    "(industry, location, or a real signal from the data below) then mention a website concept was put together for " +
    "them, and ask if they'd like to see it. Do not claim to have found them via a specific channel unless that's " +
    "actually true of how this message is being sent.",
  demo_link:
    "The business has already said yes to seeing the demo. Share the demo URL, briefly note it was built from public " +
    "information so it can obviously be adjusted around their real services/branding/content, and invite their " +
    "thoughts. Include the literal URL in the body.",
  follow_up:
    "This is ONE light, low-pressure check-in after the demo was already sent — NOT a sales sequence. Ask if they had " +
    "a chance to look, and offer to adjust it if there's a direction they'd prefer. Keep it brief and non-pushy.",
};

export async function generateOutreachMessage(
  profile: DemoBusinessProfile,
  kind: OutreachKind,
  channel: OutreachChannel,
  demoUrl?: string | null
): Promise<OutreachMessage> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured — cannot generate outreach copy.");
  }
  if (kind === "demo_link" && !demoUrl) {
    throw new Error("A demo URL is required to generate a demo-link message.");
  }

  const meta = archetypeMeta(profile.business_archetype);
  const businessName = profile.business_name.value ?? "the business";
  const townCity = profile.town_city.value ?? "the area";
  const rating = profile.google_rating.status !== "UNKNOWN" ? profile.google_rating.value : null;
  const reviewCount = profile.google_review_count.status !== "UNKNOWN" ? profile.google_review_count.value : null;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 600,
    output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          `Write a short, natural cold-outreach message from Sam to a UK local business owner. This message will be sent ` +
          `MANUALLY by a human, not automated — write it as a real person would write it, not sales copy.\n\n` +
          `Business: ${businessName}, a ${meta.marketingCategoryLabel.toLowerCase()} in ${townCity}.\n` +
          (rating !== null ? `Google rating: ${rating}/5${reviewCount !== null ? ` from ${reviewCount} reviews` : ""}.\n` : "") +
          `Website weaknesses found: ${profile.website_weaknesses.length > 0 ? profile.website_weaknesses.join("; ") : "no website found"}.\n` +
          (demoUrl ? `Demo URL to share: ${demoUrl}\n` : "") +
          `\nChannel: ${CHANNEL_TONE[channel]}\n\n` +
          `Message purpose: ${KIND_INSTRUCTIONS[kind]}\n\n` +
          `Rules: British English. No em dashes. No AI cliches ("trusted partner", "unparalleled", "revolutionize", etc). ` +
          `No pricing. Do not name or describe any named service/package/offer. Sign off as "Sam" only for email; no ` +
          `signature needed for WhatsApp/DM/LinkedIn unless it reads more natural with one. Set "subject" to null for ` +
          `every channel except email.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Outreach message generation was refused by the model.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Outreach message generation returned no content.");
  }

  const parsed = JSON.parse(textBlock.text) as { subject: string | null; body: string };
  return {
    subject: parsed.subject ? stripEmDashesFromString(parsed.subject) : null,
    body: stripEmDashesFromString(parsed.body),
    channel,
    kind,
    generatedAt: new Date().toISOString(),
  };
}
