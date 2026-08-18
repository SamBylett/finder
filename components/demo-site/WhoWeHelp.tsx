import type { DemoRenderContext } from "@/lib/demo/render-context";
import { SectionHeading } from "./primitives";
import { Section } from "./section-primitives";
import type { WhoWeHelpVariant } from "@/lib/demo/types";

export function WhoWeHelp({ ctx, variant }: { ctx: DemoRenderContext; variant: WhoWeHelpVariant }) {
  const audiences = ctx.copy.who_we_help_audiences;
  if (audiences.length === 0) return null;
  const { spacingScale, align } = ctx.config.compositionProfile;

  return (
    <Section spacing={spacingScale} background="bg-[var(--demo-surface)]">
      <SectionHeading eyebrow="Who we help" heading="Who We Work With" subheading={ctx.copy.who_we_help_intro} align={align} />

      {variant === "audience-cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <div key={a} className="rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] p-6 text-center">
              <p style={{ fontFamily: "var(--demo-font-heading)" }} className="text-lg font-medium text-[var(--demo-text)]">
                {a}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {audiences.map((a) => (
            <p key={a} style={{ fontFamily: "var(--demo-font-heading)" }} className="text-xl font-medium text-[var(--demo-text)]">
              {a}
            </p>
          ))}
        </div>
      )}
    </Section>
  );
}
