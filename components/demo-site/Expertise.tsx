import type { DemoRenderContext } from "@/lib/demo/render-context";
import { SectionHeading } from "./primitives";
import { Section, SplitContainer } from "./section-primitives";
import type { ExpertiseVariant } from "@/lib/demo/types";

export function Expertise({ ctx, variant }: { ctx: DemoRenderContext; variant: ExpertiseVariant }) {
  const items = ctx.copy.expertise_items;
  // A single item is almost always just the marketing category restated
  // (nothing to say without real service data) — not worth its own section.
  if (items.length < 2) return null;

  const { spacingScale, align, sectionWidth } = ctx.config.compositionProfile;
  const width = sectionWidth.expertise ?? "contained";

  if (variant === "editorial-list") {
    // Asymmetric two-column: heading/intro in a narrower left column,
    // numbered items in the wider right column — the Boutique Advisory/
    // Editorial Authority answer to "two genuine expertise areas
    // shouldn't automatically become two generic cards."
    return (
      <Section spacing={spacingScale} width={width}>
        <SplitContainer
          ratio="2:3"
          left={<SectionHeading eyebrow="Expertise" heading="Areas of Expertise" subheading={ctx.copy.expertise_intro} align="left" />}
          right={
            <ol className="space-y-6">
              {items.map((item, i) => (
                <li key={item} className="flex gap-5 border-b border-[var(--demo-border)] pb-6 last:border-b-0">
                  <span style={{ fontFamily: "var(--demo-font-heading)" }} className="text-2xl font-medium text-[var(--demo-accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="pt-1 text-lg text-[var(--demo-text)]">{item}</p>
                </li>
              ))}
            </ol>
          }
        />
      </Section>
    );
  }

  return (
    <Section spacing={spacingScale} width={width}>
      <SectionHeading eyebrow="Expertise" heading="Areas of Expertise" subheading={ctx.copy.expertise_intro} align={align} />

      {variant === "cards" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-[var(--demo-radius)] bg-[var(--demo-surface)] p-6">
              <p className="text-sm font-medium text-[var(--demo-text)]">{item}</p>
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-[var(--demo-border)] pb-3 text-[var(--demo-text)]">
              <span className="mt-0.5 text-[var(--demo-accent)]" aria-hidden>•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
