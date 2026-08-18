import type { DemoRenderContext } from "@/lib/demo/render-context";
import { Container, SectionHeading } from "./primitives";
import type { ExpertiseVariant } from "@/lib/demo/types";

export function Expertise({ ctx, variant }: { ctx: DemoRenderContext; variant: ExpertiseVariant }) {
  const items = ctx.copy.expertise_items;
  // A single item is almost always just the marketing category restated
  // (nothing to say without real service data) — not worth its own section.
  if (items.length < 2) return null;

  return (
    <section className="bg-[var(--demo-bg)] py-20">
      <Container>
        <SectionHeading eyebrow="Expertise" heading="Areas of Expertise" subheading={ctx.copy.expertise_intro} />

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
      </Container>
    </section>
  );
}
