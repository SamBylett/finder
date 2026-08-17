import type { DemoRenderContext } from "@/lib/demo/render-context";
import { factValue } from "@/lib/demo/render-context";
import { Container } from "./primitives";
import type { FooterVariant } from "@/lib/demo/types";

export function Footer({ ctx, variant }: { ctx: DemoRenderContext; variant: FooterVariant }) {
  const name = factValue(ctx.profile.business_name) ?? "Business";
  const year = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <footer className="border-t border-[var(--demo-border)] py-6 text-center text-xs text-[var(--demo-text-muted)]">
        <Container>© {year} {name}</Container>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[var(--demo-border)] bg-[var(--demo-surface)] py-10 text-sm text-[var(--demo-text-muted)]">
      <Container className="space-y-2">
        <p className="font-semibold text-[var(--demo-text)]">{name}</p>
        <p>{ctx.copy.footer_content}</p>
        <p className="pt-4 text-xs">© {year} {name}. All rights reserved.</p>
      </Container>
    </footer>
  );
}
