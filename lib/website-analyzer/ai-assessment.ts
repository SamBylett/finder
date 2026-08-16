// AI-assisted subjective design assessment. Separate from the objective,
// deterministic checks in live.ts on purpose — this is a qualitative read
// ("does this look dated/trustworthy") that we can't determine programmatically,
// so it's explicitly called out as AI opinion, not a hard signal.
//
// Only called when ANTHROPIC_API_KEY is set; falls back to the stub
// (available: false) otherwise, so the app works with zero AI cost by default.

import Anthropic from "@anthropic-ai/sdk";
import type { SubjectiveWebsiteAssessment } from "./types";

// Sonnet 5 is used here rather than Opus 5: this is a short, structured
// qualitative read from page text, not deep multi-step reasoning, and
// Sonnet 5 is meaningfully cheaper per call at effectively the same quality
// for this task.
const MODEL = "claude-sonnet-5";

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    overallImpression: {
      type: "string",
      description: "One or two sentences on the overall impression a prospective customer would get from this site.",
    },
    designQualityNotes: {
      type: "string",
      description: "One or two sentences on specific design quality issues or strengths (dated look, trust signals, visual polish).",
    },
  },
  required: ["overallImpression", "designQualityNotes"],
  additionalProperties: false,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function assessDesignQuality(input: {
  url: string;
  visibleText: string;
  objectiveSummary: string;
}): Promise<SubjectiveWebsiteAssessment> {
  const stub: SubjectiveWebsiteAssessment = {
    available: false,
    overallImpression: null,
    designQualityNotes: null,
  };

  if (!process.env.ANTHROPIC_API_KEY) return stub;

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 400,
      output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            `You're assessing a UK local service business website as a prospect for a web design upsell. ` +
            `Give a brief, honest qualitative read — this supplements automated checks, so focus on things a script can't detect (visual polish, trustworthiness, how dated it feels).\n\n` +
            `URL: ${input.url}\n` +
            `Automated checks found: ${input.objectiveSummary}\n\n` +
            `Visible page text (truncated):\n${input.visibleText.slice(0, 3000)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return stub;

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return stub;

    const parsed = JSON.parse(textBlock.text) as {
      overallImpression: string;
      designQualityNotes: string;
    };

    return {
      available: true,
      overallImpression: parsed.overallImpression,
      designQualityNotes: parsed.designQualityNotes,
    };
  } catch {
    // AI assessment is best-effort — never let it break the analysis pipeline.
    return stub;
  }
}
