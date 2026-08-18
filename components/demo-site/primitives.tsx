// Shared building blocks for demo-site section components. All styling
// references CSS custom properties set by ThemeProvider (see themes.ts) via
// static arbitrary-value Tailwind classes — never dynamically-built class
// strings, which Tailwind's production build would purge.

import type { DemoAsset } from "@/lib/demo/types";
import { factValue } from "@/lib/demo/render-context";
import type { DemoBusinessProfile } from "@/lib/demo/types";

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
};

// Renders either a real business photo (business_owned) or a clearly
// distinguishable placeholder treatment — never presents placeholder art as
// the client's own work. `zoom` adds a restrained hover scale — parent must
// have `overflow-hidden` (and ideally `group`) for it to read correctly.
export function DemoAssetImage({
  asset, className = "", alt, zoom = false,
}: { asset: DemoAsset | undefined; className?: string; alt: string; zoom?: boolean }) {
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

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external/proxied source, no static domain list to configure
    <img
      src={asset.url}
      alt={alt}
      loading="lazy"
      className={`${className} ${zoom ? "transition-transform duration-700 ease-out motion-safe:group-hover:scale-105" : ""}`}
    />
  );
}

export function SectionHeading({
  eyebrow, heading, subheading, align = "left",
}: { eyebrow?: string | null; heading: string; subheading?: string | null; align?: "left" | "center" }) {
  return (
    <div className={`mb-12 max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--demo-accent)]">{eyebrow}</p>
      )}
      <h2
        style={{ fontFamily: "var(--demo-font-heading)" }}
        className="text-4xl font-normal leading-tight text-[var(--demo-text)] sm:text-5xl"
      >
        {heading}
      </h2>
      <div className={`mt-4 h-px w-10 bg-[var(--demo-accent)] ${align === "center" ? "mx-auto" : ""}`} />
      {subheading && <p className="mt-4 text-[var(--demo-text-muted)]">{subheading}</p>}
    </div>
  );
}

export function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-[var(--demo-radius)] bg-[var(--demo-accent)] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-accent-text)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--demo-accent-hover)] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {children}
    </a>
  );
}

export function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-[var(--demo-radius)] border border-[var(--demo-border)] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-text)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--demo-surface)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {children}
    </a>
  );
}

// Consistent card treatment used across Services/WhoWeHelp/Expertise —
// deliberate padding/border/shadow/hover so nothing reads as a plain white
// rectangle with a border.
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] p-6 shadow-[var(--demo-shadow)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${className}`}
    >
      {children}
    </div>
  );
}

// Floating rating card designed to sit over/beside hero imagery — the
// "hero-integrated proof" treatment instead of repeating the rating in
// every section (see V2.2 trust-proof-repetition guidance).
export function FloatingTrustCard({ profile }: { profile: DemoBusinessProfile }) {
  const rating = profile.google_rating.status !== "UNKNOWN" ? profile.google_rating.value : null;
  const reviewCount = profile.google_review_count.status !== "UNKNOWN" ? profile.google_review_count.value : null;
  if (rating === null) return null;

  return (
    <div className="inline-flex items-center gap-3 rounded-[var(--demo-radius)] bg-[var(--demo-bg)] px-5 py-4 shadow-lg">
      <span className="text-2xl font-semibold text-[var(--demo-text)]">{rating}<span className="text-sm text-[var(--demo-text-muted)]">/5</span></span>
      <div className="h-8 w-px bg-[var(--demo-border)]" />
      <div className="text-xs leading-tight text-[var(--demo-text-muted)]">
        <span className="text-[var(--demo-accent)]">★★★★★</span>
        <br />
        {reviewCount ?? 0} Google reviews
      </div>
    </div>
  );
}

// Business names must render naturally — no forced uppercase/wide tracking,
// which reads as broken on short names (e.g. "J and A" -> "J AND A" with
// letters floating apart). See V2.2 typography fix.
export function BusinessName({ profile, className = "" }: { profile: DemoBusinessProfile; className?: string }) {
  const name = factValue(profile.business_name) ?? "Business";
  return <span className={className}>{name}</span>;
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}
