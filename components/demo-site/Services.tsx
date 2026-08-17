import type { DemoRenderContext } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, SectionHeading } from "./primitives";
import type { ServicesVariant } from "@/lib/demo/types";

export function Services({ ctx, variant }: { ctx: DemoRenderContext; variant: ServicesVariant }) {
  const cards = ctx.copy.service_cards;
  if (cards.length === 0) return null;

  const galleryAssets = ctx.assets.filter((a) => a.type === "gallery" || a.type === "project");

  return (
    <section id="services" className="bg-[var(--demo-bg)] py-20">
      <Container>
        <SectionHeading heading="Services" subheading={ctx.copy.services_intro} />

        {variant === "alternating-rows" && (
          <div className="space-y-10">
            {cards.map((c, i) => (
              <div key={c.name} className={`flex flex-col gap-6 md:flex-row md:items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                <DemoAssetImage asset={galleryAssets[i % Math.max(galleryAssets.length, 1)]} alt={c.name} className="aspect-video w-full rounded-[var(--demo-radius)] object-cover md:w-1/2" />
                <div className="md:w-1/2">
                  <h3 className="text-xl font-semibold text-[var(--demo-text)]">{c.name}</h3>
                  <p className="mt-2 text-[var(--demo-text-muted)]">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === "image-cards" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => (
              <div key={c.name} className="overflow-hidden rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)]">
                <DemoAssetImage asset={galleryAssets[i % Math.max(galleryAssets.length, 1)]} alt={c.name} className="aspect-video w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-semibold text-[var(--demo-text)]">{c.name}</h3>
                  <p className="mt-1 text-sm text-[var(--demo-text-muted)]">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === "compact-grid" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.name} className="rounded-[var(--demo-radius)] border border-[var(--demo-border)] p-4">
                <h3 className="font-semibold text-[var(--demo-text)]">{c.name}</h3>
                <p className="mt-1 text-xs text-[var(--demo-text-muted)]">{c.description}</p>
              </div>
            ))}
          </div>
        )}

        {variant === "clean-cards" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <div key={c.name} className="rounded-[var(--demo-radius)] bg-[var(--demo-surface)] p-6 shadow-[var(--demo-shadow)]">
                <h3 className="font-semibold text-[var(--demo-text)]">{c.name}</h3>
                <p className="mt-2 text-sm text-[var(--demo-text-muted)]">{c.description}</p>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
