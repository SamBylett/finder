import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, DemoAssetImage, PrimaryButton, phoneHref } from "./primitives";
import type { CtaVariant } from "@/lib/demo/types";

export function Cta({ ctx, variant }: { ctx: DemoRenderContext; variant: CtaVariant }) {
  const phone = factValue(ctx.profile.phone);
  const href = phone ? phoneHref(phone) : "#contact";
  const asset = ctx.assets.find((a) => a.type === "hero");

  if (variant === "image-background") {
    return (
      <section className="relative overflow-hidden py-24">
        <DemoAssetImage asset={asset} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/70" />
        <Container className="relative z-10 max-w-2xl text-center text-white">
          <h2 className="text-3xl font-bold">{ctx.copy.final_cta_heading}</h2>
          <p className="mt-3 text-white/85">{ctx.copy.final_cta_body}</p>
          <div className="mt-8">
            <PrimaryButton href={href}>{ctx.copy.primary_cta}</PrimaryButton>
          </div>
        </Container>
      </section>
    );
  }

  if (variant === "simple") {
    return (
      <section className="border-t border-[var(--demo-border)] py-16">
        <Container className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--demo-text)]">{ctx.copy.final_cta_heading}</h2>
            <p className="mt-1 text-[var(--demo-text-muted)]">{ctx.copy.final_cta_body}</p>
          </div>
          <PrimaryButton href={href}>{ctx.copy.primary_cta}</PrimaryButton>
        </Container>
      </section>
    );
  }

  // full-width
  return (
    <section className="bg-[var(--demo-accent)] py-16 text-[var(--demo-accent-text)]">
      <Container className="max-w-2xl text-center">
        <h2 className="text-3xl font-bold">{ctx.copy.final_cta_heading}</h2>
        <p className="mt-3 opacity-90">{ctx.copy.final_cta_body}</p>
        <div className="mt-8">
          <a href={href} className="inline-flex items-center justify-center rounded-[var(--demo-radius)] bg-[var(--demo-accent-text)] px-6 py-3 text-sm font-semibold text-[var(--demo-accent)]">
            {ctx.copy.primary_cta}
          </a>
        </div>
      </Container>
    </section>
  );
}
