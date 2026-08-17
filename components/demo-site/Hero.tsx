import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, PrimaryButton, SecondaryButton, phoneHref } from "./primitives";
import type { HeroVariant } from "@/lib/demo/types";

export function Hero({ ctx, variant }: { ctx: DemoRenderContext; variant: HeroVariant }) {
  const heroAsset = ctx.assets.find((a) => a.type === "hero") ?? ctx.assets[0];
  const phone = factValue(ctx.profile.phone);
  const townCity = factValue(ctx.profile.town_city);

  const heading = (
    <>
      {ctx.copy.hero_eyebrow && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--demo-accent)]">
          {ctx.copy.hero_eyebrow}
        </p>
      )}
      <h1
        style={{ fontFamily: "var(--demo-font-heading)" }}
        className="text-5xl font-normal leading-[1.1] text-[var(--demo-text)] sm:text-6xl"
      >
        {ctx.copy.hero_headline}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-[var(--demo-text-muted)]">{ctx.copy.hero_supporting_text}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {phone ? (
          <PrimaryButton href={phoneHref(phone)}>{ctx.copy.primary_cta}</PrimaryButton>
        ) : (
          <PrimaryButton href="#contact">{ctx.copy.primary_cta}</PrimaryButton>
        )}
        {ctx.copy.secondary_cta && <SecondaryButton href="#services">{ctx.copy.secondary_cta}</SecondaryButton>}
      </div>
      {townCity && <p className="mt-6 text-sm text-[var(--demo-text-muted)]">Serving {townCity} and the surrounding area</p>}
    </>
  );

  if (variant === "minimal") {
    return (
      <section className="bg-[var(--demo-surface)] py-20">
        <Container className="max-w-3xl text-center">
          <div className="mx-auto">{heading}</div>
        </Container>
      </section>
    );
  }

  if (variant === "trust-focused") {
    return (
      <section className="bg-[var(--demo-bg)] py-20">
        <Container className="grid items-center gap-10 md:grid-cols-2">
          <div>{heading}</div>
          <div className="rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)] p-8">
            {ctx.profile.google_rating.status !== "UNKNOWN" && (
              <p className="text-5xl font-bold text-[var(--demo-accent)]">
                {ctx.profile.google_rating.value}<span className="text-xl text-[var(--demo-text-muted)]">/5</span>
              </p>
            )}
            {ctx.profile.google_review_count.status !== "UNKNOWN" && (
              <p className="mt-2 text-[var(--demo-text-muted)]">from {ctx.profile.google_review_count.value} Google reviews</p>
            )}
          </div>
        </Container>
      </section>
    );
  }

  if (variant === "split-image") {
    return (
      <section className="bg-[var(--demo-bg)] py-16">
        <Container className="grid items-center gap-10 md:grid-cols-2">
          <div>{heading}</div>
          <DemoAssetImage asset={heroAsset} alt={factValue(ctx.profile.business_name) ?? "Business"} className="aspect-[4/3] w-full rounded-[var(--demo-radius)] object-cover" />
        </Container>
      </section>
    );
  }

  // full-image
  return (
    <section className="relative flex min-h-[70vh] items-end overflow-hidden">
      <DemoAssetImage asset={heroAsset} alt={factValue(ctx.profile.business_name) ?? "Business"} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <Container className="relative z-10 pb-16 text-white [&_h1]:text-white [&_p]:text-white/85">{heading}</Container>
    </section>
  );
}
