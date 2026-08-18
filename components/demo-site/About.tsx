import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, SectionHeading } from "./primitives";
import type { AboutVariant } from "@/lib/demo/types";

// Three variants: trust-led (confirmed facts as a polished checklist, not
// plain grey boxes — V2.2 fix), editorial (image-led, for richer content),
// compact-story (no grid at all — for sparse businesses where padding a
// three-box layout would just expose how little we know).
export function About({ ctx, variant }: { ctx: DemoRenderContext; variant: AboutVariant }) {
  const name = factValue(ctx.profile.business_name) ?? "Business";
  const asset = ctx.assets.find((a) => a.type === "hero" || a.type === "gallery");

  if (variant === "compact-story") {
    return (
      <section className="bg-[var(--demo-surface)] py-20">
        <Container className="max-w-2xl text-center">
          <SectionHeading heading={`About ${name}`} align="center" />
          <p className="text-lg text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
        </Container>
      </section>
    );
  }

  if (variant === "trust-led") {
    return (
      <section className="bg-[var(--demo-bg)] py-20 sm:py-28">
        <Container className="grid gap-12 md:grid-cols-3">
          <div className="md:col-span-2">
            <SectionHeading heading={`About ${name}`} />
            <p className="text-lg text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
          </div>
          {ctx.copy.why_choose_us.length > 0 && (
            <ul className="space-y-4 self-start rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)] p-6">
              {ctx.copy.why_choose_us.map((point, i) => (
                <li key={point} className={`flex items-start gap-3 text-sm font-medium text-[var(--demo-text)] ${i > 0 ? "border-t border-[var(--demo-border)] pt-4" : ""}`}>
                  <span
                    style={{ fontFamily: "var(--demo-font-heading)" }}
                    className="text-lg leading-none text-[var(--demo-accent)]"
                  >
                    ✓
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    );
  }

  // editorial
  return (
    <section className="bg-[var(--demo-bg)] py-20 sm:py-28">
      <Container className="grid items-center gap-12 md:grid-cols-2">
        <DemoAssetImage asset={asset} alt={name} className="aspect-[4/3] w-full rounded-[var(--demo-radius)] object-cover shadow-lg" />
        <div>
          <SectionHeading heading={`About ${name}`} />
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
      </Container>
    </section>
  );
}
