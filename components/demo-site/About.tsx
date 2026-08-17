import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, SectionHeading } from "./primitives";
import type { AboutVariant } from "@/lib/demo/types";

export function About({ ctx, variant }: { ctx: DemoRenderContext; variant: AboutVariant }) {
  const name = factValue(ctx.profile.business_name) ?? "Business";
  const asset = ctx.assets.find((a) => a.type === "hero" || a.type === "gallery");

  if (variant === "trust-led") {
    return (
      <section className="bg-[var(--demo-bg)] py-20">
        <Container className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <SectionHeading heading={`About ${name}`} />
            <p className="text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
          </div>
          <ul className="space-y-3">
            {ctx.copy.why_choose_us.map((point) => (
              <li key={point} className="rounded-[var(--demo-radius)] bg-[var(--demo-surface)] p-4 text-sm font-medium text-[var(--demo-text)]">
                {point}
              </li>
            ))}
          </ul>
        </Container>
      </section>
    );
  }

  if (variant === "text-focused") {
    return (
      <section className="bg-[var(--demo-bg)] py-20">
        <Container className="max-w-3xl">
          <SectionHeading heading={`About ${name}`} />
          <p className="text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
          {ctx.copy.why_choose_us.length > 0 && (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {ctx.copy.why_choose_us.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-[var(--demo-text)]">
                  <span className="mt-0.5 text-[var(--demo-accent)]">✓</span>{point}
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>
    );
  }

  // split-image
  return (
    <section className="bg-[var(--demo-bg)] py-20">
      <Container className="grid items-center gap-10 md:grid-cols-2">
        <DemoAssetImage asset={asset} alt={name} className="aspect-[4/3] w-full rounded-[var(--demo-radius)] object-cover" />
        <div>
          <SectionHeading heading={`About ${name}`} />
          <p className="text-[var(--demo-text-muted)]">{ctx.copy.about}</p>
          {ctx.copy.why_choose_us.length > 0 && (
            <ul className="mt-6 space-y-2">
              {ctx.copy.why_choose_us.map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-[var(--demo-text)]">
                  <span className="mt-0.5 text-[var(--demo-accent)]">✓</span>{point}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </section>
  );
}
