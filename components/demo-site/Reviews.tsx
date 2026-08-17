// Only renders when we actually possess review text (DemoReview records) —
// per spec, never fabricate testimonial quotes. In V2.0 this is always empty
// (see lib/demo/reviews.ts), so the section is simply omitted and the
// aggregate Google rating is left to the trust bar. Wired up for when real
// review import ships.

import type { DemoRenderContext } from "@/lib/demo/render-context";
import { Container, SectionHeading } from "./primitives";
import type { ReviewsVariant } from "@/lib/demo/types";

export function Reviews({ ctx, variant }: { ctx: DemoRenderContext; variant: ReviewsVariant }) {
  if (ctx.reviews.length === 0) return null;

  const cardClasses =
    variant === "featured-grid"
      ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      : variant === "simple-carousel"
      ? "flex gap-4 overflow-x-auto pb-2"
      : "grid gap-4 sm:grid-cols-2";

  return (
    <section className="bg-[var(--demo-bg)] py-20">
      <Container>
        <SectionHeading heading={ctx.copy.testimonials_heading ?? "What customers say"} />
        <div className={cardClasses}>
          {ctx.reviews.slice(0, 6).map((r) => (
            <div key={r.id} className="min-w-[16rem] rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)] p-5">
              {r.rating !== null && <p className="text-[var(--demo-accent)]">{"★".repeat(Math.round(r.rating))}</p>}
              {r.review_text && <p className="mt-2 text-sm text-[var(--demo-text)]">&ldquo;{r.review_text}&rdquo;</p>}
              {r.reviewer_name && <p className="mt-3 text-xs font-medium text-[var(--demo-text-muted)]">{r.reviewer_name}</p>}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
