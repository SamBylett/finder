// Shared building blocks for demo-site section components. All styling
// references CSS custom properties set by ThemeProvider (see themes.ts) via
// static arbitrary-value Tailwind classes — never dynamically-built class
// strings, which Tailwind's production build would purge.

import type { DemoAsset } from "@/lib/demo/types";

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full px-6 [max-width:var(--demo-container-max)] ${className}`}>
      {children}
    </div>
  );
}

const PLACEHOLDER_GRADIENTS: Record<string, string> = {
  trades: "linear-gradient(135deg,#334155,#0f172a)",
  outdoor: "linear-gradient(135deg,#166534,#052e16)",
  professional: "linear-gradient(135deg,#1e3a5f,#0f1f33)",
  automotive: "linear-gradient(135deg,#7c2d12,#1c1917)",
  generic: "linear-gradient(135deg,#475569,#1e293b)",
}

// Renders either a real business photo (business_owned) or a clearly
// distinguishable placeholder treatment — never presents placeholder art as
// the client's own work.
export function DemoAssetImage({ asset, className = "", alt }: { asset: DemoAsset | undefined; className?: string; alt: string }) {
  if (!asset || asset.placeholder) {
    const label = asset?.url.split(":")[1] ?? "generic";
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden ${className}`}
        style={{ background: PLACEHOLDER_GRADIENTS[label] ?? PLACEHOLDER_GRADIENTS.generic }}
      >
        <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium tracking-wide text-white/80">
          Concept imagery
        </span>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- external/proxied source, no static domain list to configure
  return <img src={asset.url} alt={alt} className={className} loading="lazy" />;
}

export function SectionHeading({ eyebrow, heading, subheading }: { eyebrow?: string | null; heading: string; subheading?: string | null }) {
  return (
    <div className="mb-10 max-w-2xl">
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--demo-accent)]">{eyebrow}</p>
      )}
      <h2
        style={{ fontFamily: "var(--demo-font-heading)" }}
        className="text-4xl font-normal leading-tight text-[var(--demo-text)] sm:text-5xl"
      >
        {heading}
      </h2>
      <div className="mt-4 h-px w-10 bg-[var(--demo-accent)]" />
      {subheading && <p className="mt-4 text-[var(--demo-text-muted)]">{subheading}</p>}
    </div>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-[var(--demo-radius)] bg-[var(--demo-accent)] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-accent-text)] transition hover:bg-[var(--demo-accent-hover)]"
    >
      {children}
    </a>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-[var(--demo-radius)] border border-[var(--demo-border)] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-text)] transition hover:bg-[var(--demo-surface)]"
    >
      {children}
    </a>
  );
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}
