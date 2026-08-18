import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, FloatingTrustCard, PrimaryButton, SecondaryButton, phoneHref } from "./primitives";
import type { HeroVariant } from "@/lib/demo/types";

// Three deliberately strong variants (was 5 weaker ones — V2.2 consolidation).
// Heroes were the weakest part of V2.1: a heading floating in an empty
// container. Every variant here composes with real imagery and/or a
// floating trust element rather than being text-only by default.
export function Hero({ ctx, variant }: { ctx: DemoRenderContext; variant: HeroVariant }) {
  const heroAsset = ctx.assets.find((a) => a.type === "hero") ?? ctx.assets[0];
  const phone = factValue(ctx.profile.phone);
  const townCity = factValue(ctx.profile.town_city);

  const cta = (
    <div className="mt-8 flex flex-wrap gap-3">
      {phone ? (
        <PrimaryButton href={phoneHref(phone)}>{ctx.copy.primary_cta}</PrimaryButton>
      ) : (
        <PrimaryButton href="#contact">{ctx.copy.primary_cta}</PrimaryButton>
      )}
      {ctx.copy.secondary_cta && <SecondaryButton href="#services">{ctx.copy.secondary_cta}</SecondaryButton>}
    </div>
  );

  const eyebrow = ctx.copy.hero_eyebrow && (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--demo-accent)]">
      {ctx.copy.hero_eyebrow}
    </p>
  );

  const locality = townCity && (
    <p className="mt-6 text-sm text-[var(--demo-text-muted)]">Serving {townCity} and the surrounding area</p>
  );

  if (variant === "professional-authority") {
    return (
      <section className="bg-[var(--demo-bg)] py-28">
        <Container className="max-w-2xl">
          {eyebrow}
          <h1
            style={{ fontFamily: "var(--demo-font-heading)" }}
            className="text-5xl font-normal leading-[1.15] text-[var(--demo-text)] sm:text-6xl"
          >
            {ctx.copy.hero_headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--demo-text-muted)]">{ctx.copy.hero_supporting_text}</p>
          {cta}
          {locality}
        </Container>
      </section>
    );
  }

  if (variant === "cinematic") {
    return (
      <section className="relative flex min-h-[85vh] items-end overflow-hidden">
        <DemoAssetImage asset={heroAsset} alt={factValue(ctx.profile.business_name) ?? "Business"} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
        <Container className="relative z-10 grid gap-10 pb-16 md:grid-cols-[1fr_auto] md:items-end">
          <div className="text-white [&_p]:text-white/85">
            {ctx.copy.hero_eyebrow && (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/90">{ctx.copy.hero_eyebrow}</p>
            )}
            <h1
              style={{ fontFamily: "var(--demo-font-heading)" }}
              className="max-w-2xl text-5xl font-normal leading-[1.1] sm:text-6xl"
            >
              {ctx.copy.hero_headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg">{ctx.copy.hero_supporting_text}</p>
            {cta}
          </div>
          <div className="hidden md:block">
            <FloatingTrustCard profile={ctx.profile} />
          </div>
        </Container>
      </section>
    );
  }

  // editorial-split
  return (
    <section className="bg-[var(--demo-bg)] py-16 sm:py-24">
      <Container className="grid items-center gap-12 md:grid-cols-2">
        <div>
          {eyebrow}
          <h1
            style={{ fontFamily: "var(--demo-font-heading)" }}
            className="text-5xl font-normal leading-[1.1] text-[var(--demo-text)] sm:text-6xl"
          >
            {ctx.copy.hero_headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--demo-text-muted)]">{ctx.copy.hero_supporting_text}</p>
          {cta}
          {locality}
        </div>
        <div className="relative">
          <DemoAssetImage
            asset={heroAsset}
            alt={factValue(ctx.profile.business_name) ?? "Business"}
            className="aspect-[4/5] w-full rounded-[var(--demo-radius)] object-cover shadow-xl"
          />
          <div className="absolute -bottom-6 -left-6 hidden sm:block">
            <FloatingTrustCard profile={ctx.profile} />
          </div>
        </div>
      </Container>
    </section>
  );
}
