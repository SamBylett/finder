import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { DemoAssetImage, FloatingTrustCard, PrimaryButton, SecondaryButton, phoneHref } from "./primitives";
import { Section } from "./section-primitives";
import type { HeroVariant } from "@/lib/demo/types";

// Three deliberately strong variants. Heroes carry the integrated trust/
// reputation line that used to be the standalone TrustBar section (removed
// V2.4 — a cosmetic-only strip that read identically regardless of variant).
// cinematic/editorial-split fold proof into the FloatingTrustCard already
// sitting over the image; professional-authority (no image) shows a plain
// inline stat line instead, since there's nothing to float it over.
export function Hero({ ctx, variant }: { ctx: DemoRenderContext; variant: HeroVariant }) {
  const heroAsset = ctx.assets.find((a) => a.type === "hero") ?? ctx.assets[0];
  const phone = factValue(ctx.profile.phone);
  const townCity = factValue(ctx.profile.town_city);
  const rating = ctx.profile.google_rating.status !== "UNKNOWN" ? ctx.profile.google_rating.value : null;
  const reviewCount = ctx.profile.google_review_count.status !== "UNKNOWN" ? ctx.profile.google_review_count.value : null;
  const { spacingScale, sectionWidth } = ctx.config.compositionProfile;
  const width = sectionWidth.hero ?? "contained";

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
      <Section spacing={spacingScale === "compact" ? "standard" : spacingScale} width={width} className="max-w-2xl">
        {eyebrow}
        <h1
          style={{ fontFamily: "var(--demo-font-heading)" }}
          className="text-5xl font-medium leading-[1.15] text-[var(--demo-text)] sm:text-6xl"
        >
          {ctx.copy.hero_headline}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--demo-text-muted)]">{ctx.copy.hero_supporting_text}</p>
        {cta}
        {locality}
        {rating !== null && (
          <p className="mt-6 text-sm text-[var(--demo-text-muted)]">
            <span className="font-semibold text-[var(--demo-text)]">{rating}/5</span> on Google
            {reviewCount !== null && ` · ${reviewCount} reviews`}
          </p>
        )}
      </Section>
    );
  }

  if (variant === "cinematic") {
    return (
      <section className="relative flex min-h-[85vh] items-end overflow-hidden">
        <DemoAssetImage asset={heroAsset} alt={factValue(ctx.profile.business_name) ?? "Business"} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 md:grid-cols-[1fr_auto] md:items-end">
          <div className="text-white [&_p]:text-white/85">
            {ctx.copy.hero_eyebrow && (
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/90">{ctx.copy.hero_eyebrow}</p>
            )}
            <h1
              style={{ fontFamily: "var(--demo-font-heading)" }}
              className="max-w-2xl text-5xl font-medium leading-[1.1] sm:text-6xl"
            >
              {ctx.copy.hero_headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg">{ctx.copy.hero_supporting_text}</p>
            {cta}
          </div>
          <div className="hidden md:block">
            <FloatingTrustCard profile={ctx.profile} />
          </div>
        </div>
      </section>
    );
  }

  // editorial-split
  return (
    <Section spacing={spacingScale === "compact" ? "standard" : spacingScale} width={width} className="grid items-center gap-12 md:grid-cols-2">
      <div>
        {eyebrow}
        <h1
          style={{ fontFamily: "var(--demo-font-heading)" }}
          className="text-5xl font-medium leading-[1.1] text-[var(--demo-text)] sm:text-6xl"
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
    </Section>
  );
}
