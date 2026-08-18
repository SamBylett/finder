import type { DemoRenderContext } from "@/lib/demo/render-context";
import { SectionHeading } from "./primitives";
import { Section } from "./section-primitives";
import type { ProcessVariant } from "@/lib/demo/types";

export function Process({ ctx, variant }: { ctx: DemoRenderContext; variant: ProcessVariant }) {
  const steps = ctx.copy.process_steps;
  if (steps.length === 0) return null;
  const { spacingScale, align } = ctx.config.compositionProfile;

  return (
    <Section spacing={spacingScale} background="bg-[var(--demo-surface)]">
      <SectionHeading eyebrow="How it works" heading="Getting Started" subheading={ctx.copy.process_intro} align={align} />

      <div className={variant === "numbered" ? "mx-auto max-w-xl space-y-6" : "grid gap-8 sm:grid-cols-3"}>
        {steps.map((step, i) => (
          <div key={step} className={variant === "numbered" ? "flex items-start gap-4" : "text-center sm:text-left"}>
            <span
              style={{ fontFamily: "var(--demo-font-heading)" }}
              className="block text-3xl font-medium text-[var(--demo-accent)]"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className={`text-[var(--demo-text)] ${variant === "numbered" ? "mt-1" : "mt-3"}`}>{step}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
