import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, SectionHeading } from "./primitives";
import { DemoContactForm } from "./DemoContactForm";
import type { ContactVariant } from "@/lib/demo/types";

export function Contact({ ctx, variant }: { ctx: DemoRenderContext; variant: ContactVariant }) {
  const phone = factValue(ctx.profile.phone);
  const email = factValue(ctx.profile.email);
  const address = factValue(ctx.profile.address);

  const details = (
    <div className="space-y-2 text-sm text-[var(--demo-text)]">
      {phone && <p><span className="font-semibold">Phone:</span> {phone}</p>}
      {email && <p><span className="font-semibold">Email:</span> {email}</p>}
      {address && <p><span className="font-semibold">Address:</span> {address}</p>}
    </div>
  );

  if (variant === "compact") {
    return (
      <section id="contact" className="bg-[var(--demo-surface)] py-16">
        <Container className="max-w-xl text-center">
          <SectionHeading heading="Get in touch" subheading={ctx.copy.contact_content} />
          {details}
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
        <div className="mt-6">
          <DemoContactForm archetype={ctx.profile.business_archetype} />
        </div>
      </Container>
    </section>
  );
}
