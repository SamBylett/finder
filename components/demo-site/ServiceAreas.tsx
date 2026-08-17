import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, SectionHeading } from "./primitives";
import type { ServiceAreasVariant } from "@/lib/demo/types";

export function ServiceAreas({ ctx, variant }: { ctx: DemoRenderContext; variant: ServiceAreasVariant }) {
  const townCity = factValue(ctx.profile.town_city);
  const areas = ctx.profile.service_areas.length > 0 ? ctx.profile.service_areas : townCity ? [townCity] : [];
  if (areas.length === 0) return null;

  if (variant === "compact") {
    return (
      <section className="bg-[var(--demo-surface)] py-10">
        <Container className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--demo-text-muted)]">Service area</p>
          <p className="mt-2 text-[var(--demo-text)]">{areas.join(" · ")}</p>
        </Container>
      </section>
    );
  }

  if (variant === "map-style") {
    return (
      <section className="bg-[var(--demo-surface)] py-16">
        <Container className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <SectionHeading heading="Where we work" subheading={ctx.copy.service_area_content} />
            <p className="text-[var(--demo-text)]">{areas.join(" · ")}</p>
          </div>
          <div className="flex aspect-square items-center justify-center rounded-[var(--demo-radius)] border border-dashed border-[var(--demo-border)] bg-[var(--demo-bg)] text-sm text-[var(--demo-text-muted)]">
            Service area map
          </div>
        </Container>
      </section>
    );
  }

  // list
  return (
    <section className="bg-[var(--demo-surface)] py-16">
      <Container>
        <SectionHeading heading="Where we work" subheading={ctx.copy.service_area_content} />
        <ul className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <li key={area} className="rounded-full border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-1.5 text-sm text-[var(--demo-text)]">
              {area}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
