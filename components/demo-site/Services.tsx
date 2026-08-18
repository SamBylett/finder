import type { DemoRenderContext } from "@/lib/demo/render-context";
import { Card, Container, DemoAssetImage, SectionHeading } from "./primitives";
import type { ServicesVariant } from "@/lib/demo/types";

// Three deliberately distinct presentations (was 4 near-identical card
// grids) chosen by the Site Director based on service count/density —
// "feature-panels" specifically fixes V2.1's problem of stretching 1-2
// confirmed services across a grid built for six.
export function Services({ ctx, variant }: { ctx: DemoRenderContext; variant: ServicesVariant }) {
  const cards = ctx.copy.service_cards;
  if (cards.length === 0) return null;

  const galleryAssets = ctx.assets.filter((a) => a.type === "gallery" || a.type === "project");

  return (
    <section id="services" className="bg-[var(--demo-bg)] py-20 sm:py-28">
      <Container>
        <SectionHeading eyebrow="What we do" heading="Services" subheading={ctx.copy.services_intro} />

        {variant === "editorial-rows" && (
          <div className="space-y-16">
            {cards.map((c, i) => (
              <div key={c.name} className={`group flex flex-col gap-8 md:flex-row md:items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                <div className="w-full overflow-hidden rounded-[var(--demo-radius)] shadow-lg md:w-1/2">
                  <DemoAssetImage
                    asset={galleryAssets[i % Math.max(galleryAssets.length, 1)]}
                    alt={c.name}
                    zoom
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="md:w-1/2">
                  <h3 style={{ fontFamily: "var(--demo-font-heading)" }} className="text-3xl font-normal text-[var(--demo-text)]">
                    {c.name}
                  </h3>
                  <div className="mt-4 mb-4 h-px w-8 bg-[var(--demo-accent)]" />
                  <p className="text-lg text-[var(--demo-text-muted)]">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === "feature-panels" && (
          <div className={`grid gap-6 ${cards.length === 1 ? "" : "sm:grid-cols-2"}`}>
            {cards.map((c, i) => (
              <div key={c.name} className="group relative overflow-hidden rounded-[var(--demo-radius)] shadow-lg">
                <DemoAssetImage
                  asset={galleryAssets[i % Math.max(galleryAssets.length, 1)]}
                  alt={c.name}
                  zoom
                  className="aspect-[4/5] w-full object-cover sm:aspect-[3/4]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <h3 style={{ fontFamily: "var(--demo-font-heading)" }} className="text-2xl font-normal text-white">
                    {c.name}
                  </h3>
                  <p className="mt-2 text-sm text-white/85">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {variant === "grid" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => (
              <Card key={c.name} className="overflow-hidden p-0">
                <div className="group overflow-hidden">
                  <DemoAssetImage
                    asset={galleryAssets[i % Math.max(galleryAssets.length, 1)]}
                    alt={c.name}
                    zoom
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 style={{ fontFamily: "var(--demo-font-heading)" }} className="text-lg font-normal text-[var(--demo-text)]">
                    {c.name}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--demo-text-muted)]">{c.description}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
