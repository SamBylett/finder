import type { DemoRenderContext } from "@/lib/demo/render-context";
import { Container } from "./primitives";
import type { TrustBarVariant } from "@/lib/demo/types";

export function TrustBar({ ctx, variant }: { ctx: DemoRenderContext; variant: TrustBarVariant }) {
  const rating = ctx.profile.google_rating.status !== "UNKNOWN" ? ctx.profile.google_rating.value : null;
  const reviewCount = ctx.profile.google_review_count.status !== "UNKNOWN" ? ctx.profile.google_review_count.value : null;

  if (rating === null && reviewCount === null && !ctx.copy.trust_bar_text) return null;

  if (variant === "simple") {
    return (
      <div className="border-y border-[var(--demo-border)] bg-[var(--demo-surface)] py-3 text-center text-sm text-[var(--demo-text-muted)]">
        {ctx.copy.trust_bar_text ?? `${rating ?? "—"} from ${reviewCount ?? 0} Google reviews`}
      </div>
    );
  }

  if (variant === "review-stats") {
    return (
      <div className="border-y border-[var(--demo-border)] bg-[var(--demo-surface)] py-6">
        <Container className="flex flex-wrap justify-center gap-10 text-center">
          {rating !== null && (
            <div>
              <p className="text-2xl font-bold text-[var(--demo-text)]">{rating}/5</p>
              <p className="text-xs uppercase tracking-wide text-[var(--demo-text-muted)]">Google rating</p>
            </div>
          )}
          {reviewCount !== null && (
            <div>
              <p className="text-2xl font-bold text-[var(--demo-text)]">{reviewCount}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--demo-text-muted)]">Reviews</p>
            </div>
          )}
        </Container>
      </div>
    );
  }

  // google-rating
  return (
    <div className="border-y border-[var(--demo-border)] bg-[var(--demo-surface)] py-4">
      <Container className="flex items-center justify-center gap-2 text-center text-sm font-medium text-[var(--demo-text)]">
        <span className="text-[var(--demo-accent)]">★★★★★</span>
        <span>{rating ?? "—"}/5 from {reviewCount ?? 0} Google reviews</span>
      </Container>
    </div>
  );
}
