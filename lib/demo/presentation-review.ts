// PresentationQualityReview (V2.3) — the second half of the "Ready to Send"
// guardrail. TechnicalQualityCheck (lib/demo/quality-check.ts) catches
// objective defects; this catches the thing visual review of V2.2 actually
// found: five demos that all passed every objective check while some still
// looked template-driven or weaker than the target quality bar.
//
// This is a bounded Claude call over the STRUCTURED site config/copy only —
// never the rendered page, never code. It returns a score + findings, never
// modifies anything. The "AIAppearanceAudit" concept from the spec is
// folded into ai_appearance_findings on the same response rather than a
// separate call (see the comment on PresentationQualityReview in types.ts).
//
// Judged against data richness, not feature count (spec #23): the prompt
// explicitly asks "did the design make good use of what's actually
// available" rather than rewarding longer/denser pages.

import Anthropic from "@anthropic-ai/sdk";
import type { DemoBusinessProfile, PresentationQualityReview, SiteDirectorConfig, WebsiteCopy } from "./types";
import { archetypeMeta } from "./industry";

const MODEL = "claude-sonnet-5";

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    score: { type: "integer" },
    strengths: { type: "array", items: { type: "string" } },
    findings: { type: "array", items: { type: "string" } },
    ai_appearance_findings: { type: "array", items: { type: "string" } },
  },
  required: ["score", "strengths", "findings", "ai_appearance_findings"],
  additionalProperties: false,
};

function clampScore(score: unknown): number {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

// Deterministic fallback if the API key is missing or the call fails —
// generation must never hard-fail because this advisory review couldn't
// run. Mid-range score keeps SendReadiness at NEEDS_VISUAL_REVIEW rather
// than silently claiming READY_TO_SEND with no review having happened.
function fallbackReview(): PresentationQualityReview {
  return {
    score: 50,
    strengths: [],
    findings: ["Presentation review could not run — treat this demo as unreviewed and check it visually before sending."],
    ai_appearance_findings: [],
    checkedAt: new Date().toISOString(),
  };
}

export async function runPresentationQualityReview(
  profile: DemoBusinessProfile,
  copy: WebsiteCopy,
  config: SiteDirectorConfig
): Promise<PresentationQualityReview> {
  if (!process.env.ANTHROPIC_API_KEY) return fallbackReview();

  const meta = archetypeMeta(profile.business_archetype);
  const sectionSummary = config.sections.map((s) => `${s.type}:${s.variant}`).join(", ");
  const cardShapedSections = config.sections.filter((s) =>
    (s.type === "expertise" && s.variant === "cards") ||
    (s.type === "who-we-help" && s.variant === "audience-cards") ||
    (s.type === "services" && s.variant === "grid")
  ).length;

  try {
    const response = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1200,
      output_config: { effort: "low", format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            `You are reviewing a speculative demo website's STRUCTURE and COPY (not rendered HTML) to judge whether it would ` +
            `convincingly look like a professionally designed £1,000-3,000 local-business website, or whether it reads as an ` +
            `AI-generated template. This is for "${profile.business_name.value}", a ${meta.marketingCategoryLabel} business.\n\n` +
            `Data richness tier: ${profile.content_richness} (score ${profile.data_richness_score}/100). Composition family: ` +
            `${config.compositionFamily}. Section order/variants: ${sectionSummary}. Card-shaped sections: ${cardShapedSections}.\n\n` +
            `Copy (JSON):\n${JSON.stringify(copy, null, 2)}\n\n` +
            `IMPORTANT: judge appropriateness for the available data, not feature count. A concise 4-6 section site for a ` +
            `SPARSE business that uses everything confirmed well should score HIGH. A longer site for a RICH business that ` +
            `barely uses its available imagery/services should score LOW. Do not penalise brevity that's justified by sparse ` +
            `data; do penalise padding, filler, or generic copy regardless of data richness.\n\n` +
            `Check specifically for signs of AI-generated appearance: repetitive sentence structures, vague marketing claims, ` +
            `every section following the same eyebrow+heading+paragraph+cards shape, generic "Who We Help"/expertise content ` +
            `with little substance, repeated CTA wording, repeated Google-review mentions, generic filler FAQs, sections that ` +
            `exist with nothing real to say. Put these specifically in ai_appearance_findings.\n\n` +
            `Put other presentation issues (weak hierarchy, industry mismatch, poor use of available imagery, wrong tone for ` +
            `a ${meta.professionalSections ? "professional-services" : "trades/local-service"} business) in findings. Put ` +
            `genuine strengths in strengths. Score 0-100: 80+ = confidently send to the business owner as-is; 50-79 = needs a ` +
            `visual pass first; below 50 = not ready.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return fallbackReview();
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallbackReview();

    const parsed = JSON.parse(textBlock.text) as Omit<PresentationQualityReview, "checkedAt">;
    return { ...parsed, score: clampScore(parsed.score), checkedAt: new Date().toISOString() };
  } catch (err) {
    console.error("PresentationQualityReview call failed:", err instanceof Error ? err.message : err);
    return fallbackReview();
  }
}
