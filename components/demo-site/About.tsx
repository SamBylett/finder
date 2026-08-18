import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { DemoAssetImage, SectionHeading } from "./primitives";
import { Section, SplitContainer } from "./section-primitives";
import type { AboutVariant } from "@/lib/demo/types";

// Three variants: trust-led (confirmed facts as a checklist), editorial
// (image-led, for richer content), compact-story (no grid at all — for
// sparse businesses where padding a three-box layout would just expose how
// little we know). trust-led's checklist drops its card/box treatment in
// favour of a plain rail when cardPolicy is "minimal" — a boxed card reads
// generically confident; a rail reads as considered restraint, which suits
// the professional-services families that mostly use this variant.
export function About({ ctx, variant }: { ctx: DemoRenderContext; variant: AboutVariant }) {
  const name = factValue(ctx.profile.business_name) ?? "Business";
  const asset = ctx.assets.find((a) => a.type === "hero" || a.type === "gallery");
  const { spacingScale, align, cardPolicy, sectionWidth } = ctx.config.compositionProfile;
  const width = sectionWidth.about ?? "contained";

  if (variant === "compact-story") {
    return (
      <Section spacing={spacingScale} width={width} background="bg-[var(--demo-surface)]" className="max-w-2xl">
        <SectionHeading heading={`About ${name}`} align={align === "center" ? "center" : "center"} />
        <p className="text-lg text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
      </Section>
    );
  }

  if (variant === "trust-led") {
    const checklist = ctx.copy.why_choose_us;
    return (
      <Section spacing={spacingScale} width={width}>
        <SplitContainer
          ratio="2:1"
          left={
            <div>
              <SectionHeading heading={`About ${name}`} align={align} />
              <p className="text-lg text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
            </div>
          }
          right={
            checklist.length > 0 ? (
              cardPolicy === "minimal" ? (
                <ul className="space-y-4 self-start border-l border-[var(--demo-border)] pl-6">
                  {checklist.map((point) => (
                    <li key={point} className="text-sm font-medium text-[var(--demo-text)]">{point}</li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-4 self-start rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)] p-6">
                  {checklist.map((point, i) => (
                    <li key={point} className={`flex items-start gap-3 text-sm font-medium text-[var(--demo-text)] ${i > 0 ? "border-t border-[var(--demo-border)] pt-4" : ""}`}>
                      <span style={{ fontFamily: "var(--demo-font-heading)" }} className="text-lg leading-none text-[var(--demo-accent)]">✓</span>
                      {point}
                    </li>
                  ))}
                </ul>
              )
            ) : null
          }
        />
      </Section>
    );
  }

  // editorial
  return (
    <Section spacing={spacingScale} width={width}>
      <SplitContainer
        ratio="1:1"
        left={<DemoAssetImage asset={asset} alt={name} className="aspect-[4/3] w-full rounded-[var(--demo-radius)] object-cover shadow-lg" />}
        right={
          <div>
            <SectionHeading heading={`About ${name}`} align={align} />
            <p className="text-lg text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
            {ctx.copy.why_choose_us.length > 0 && (
              <ul className="mt-6 space-y-3">
                {ctx.copy.why_choose_us.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[var(--demo-text)]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--demo-accent)]" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />
    </Section>
  );
}
