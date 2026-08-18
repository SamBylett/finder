import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, SectionHeading } from "./primitives";
import { DemoContactForm } from "./DemoContactForm";
import type { ContactVariant } from "@/lib/demo/types";

export function Contact({ ctx, variant }: { ctx: DemoRenderContext; variant: ContactVariant }) {
  const phone = factValue(ctx.profile.phone);
  const email = factValue(ctx.profile.email);
  const address = factValue(ctx.profile.address);
  const townCity = factValue(ctx.profile.town_city);

  // V2.3 location intelligence: only a premises-based business (confirmed
  // physical_location) shows its exact address/directions here — a
  // service-area trade shows coverage wording instead, since its Google
  // listing is very often a home/registered address rather than a
  // customer-facing premises (see lib/demo/profile.ts resolveLocationMode).
  const showAddress = ctx.profile.location_mode === "physical_location" && address;

  const details = (
    <div className="space-y-2 text-sm text-[var(--demo-text)]">
      {phone && <p><span className="font-semibold">Phone:</span> {phone}</p>}
      {email && <p><span className="font-semibold">Email:</span> {email}</p>}
      {showAddress && <p><span className="font-semibold">Address:</span> {address}</p>}
      {!showAddress && ctx.profile.location_mode === "service_area" && townCity && (
        <p><span className="font-semibold">Covering:</span> {townCity} and the surrounding area</p>
      )}
    </div>
  );

  const directions = showAddress && (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--demo-accent)] hover:underline"
    >
      Get directions →
    </a>
  );

  if (variant === "compact") {
    return (
      <section id="contact" className="bg-[var(--demo-surface)] py-16">
        <Container className="max-w-xl text-center">
          <SectionHeading heading="Get in touch" subheading={ctx.copy.contact_content} />
          {details}
          {directions}
        </Container>
      </section>
    );
  }

  if (variant === "split") {
    return (
      <section id="contact" className="bg-[var(--demo-surface)] py-20">
        <Container className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeading heading="Get in touch" subheading={ctx.copy.contact_content} />
            {details}
            {directions}
          </div>
          <DemoContactForm archetype={ctx.profile.business_archetype} />
        </Container>
      </section>
    );
  }

  // standard
  return (
    <section id="contact" className="bg-[var(--demo-surface)] py-20">
      <Container className="max-w-xl">
        <SectionHeading heading="Get in touch" subheading={ctx.copy.contact_content} />
        {details}
        {directions}
        <div className="mt-6">
          <DemoContactForm archetype={ctx.profile.business_archetype} />
        </div>
      </Container>
    </section>
  );
}
