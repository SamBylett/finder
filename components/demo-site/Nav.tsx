import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container, PrimaryButton, phoneHref } from "./primitives";
import type { NavVariant } from "@/lib/demo/types";

export function Nav({ ctx, variant }: { ctx: DemoRenderContext; variant: NavVariant }) {
  const name = factValue(ctx.profile.business_name) ?? "Business";
  const phone = factValue(ctx.profile.phone);
  const labels = ctx.copy.navigation_labels.slice(0, 5);

  const overlay = variant === "transparent-overlay";
  const compact = variant === "compact";

  return (
    <header
      className={`sticky top-0 z-30 w-full border-b border-[var(--demo-border)] bg-[var(--demo-nav-bg)] text-[var(--demo-nav-text)] ${
        overlay ? "backdrop-blur" : ""
      }`}
    >
      <Container className={`flex items-center justify-between ${compact ? "py-2" : "py-4"}`}>
        <span className="text-lg font-bold">{name}</span>
        <nav className="hidden gap-6 text-sm font-medium md:flex">
          {labels.map((label) => (
            <span key={label} className="opacity-80">{label}</span>
          ))}
        </nav>
        {phone ? (
          <PrimaryButton href={phoneHref(phone)}>Call {phone}</PrimaryButton>
        ) : (
          <PrimaryButton href="#contact">{ctx.copy.primary_cta}</PrimaryButton>
        )}
      </Container>
    </header>
  );
}
