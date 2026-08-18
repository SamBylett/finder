// Only renders when we actually possess review text (DemoReview records) —
// per spec, never fabricate testimonial quotes. In V2.0 this is always empty
// (see lib/demo/reviews.ts), so the section is simply omitted. Wired up for
// when real review import ships.

import type { DemoRenderContext } from "@/lib/demo/render-context";
import { SectionHeading } from "./primitives";
import { Section } from "./section-primitives";
import type { ReviewsVariant } from "@/lib/demo/types";

export function Reviews({ ctx, variant }: { ctx: DemoRenderContext; variant: ReviewsVariant }) {
  if (ctx.reviews.length === 0) return null;
  const { spacingScale, align } = ctx.config.compositionProfile;

  if (variant === "featured") {
    const r = ctx.reviews[0];
    return (
      <Section spacing={spacingScale} className="max-w-2xl">
        <SectionHeading heading={ctx.copy.testimonials_heading ?? "What customers say"} align={align} />
        {r.rating !== null && <p className="text-[var(--demo-accent)]">{"★".repeat(Math.round(r.rating))}</p>}
        {r.review_text && (
          <p style={{ fontFamily: "var(--demo-font-heading)" }} className="mt-4 text-2xl font-medium leading-snug text-[var(--demo-text)]">
            &ldquo;{r.review_text}&rdquo;
          </p>
        )}
        {r.reviewer_name && <p className="mt-4 text-sm font-medium text-[var(--demo-text-muted)]">{r.reviewer_name}</p>}
      </Section>
    );
  }

  return (
    <Section spacing={spacingScale}>
      <SectionHeading heading={ctx.copy.testimonials_heading ?? "What customers say"} align={align} />
      <div className="grid gap-4 sm:grid-cols-2">
        {ctx.reviews.slice(0, 6).map((r) => (
          <div key={r.id} className="min-w-[16rem] rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)] p-5">
            {r.rating !== null && <p className="text-[var(--demo-accent)]">{"★".repeat(Math.round(r.rating))}</p>}
            {r.review_text && <p className="mt-2 text-sm text-[var(--demo-text)]">&ldquo;{r.review_text}&rdquo;</p>}
            {r.reviewer_name && <p className="mt-3 text-xs font-medium text-[var(--demo-text-muted)]">{r.reviewer_name}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}
