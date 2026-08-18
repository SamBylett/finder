// V2.4 primitive layer. The design audit that preceded this file found the
// single biggest cause of visual sameness across generated demos: every
// section used the identical Container (one max-width, one padding) and an
// almost-identical hardcoded py-20, regardless of what the deterministic
// composition layer decided. These primitives are what CompositionProfile
// (lib/demo/types.ts) actually controls — width, rhythm, and split ratio
// are now real per-section decisions instead of literals copy-pasted into
// every component.
//
// Every class string here is a static literal (never built via string
// interpolation) so Tailwind's production build can see and keep it.

import type { SectionWidth, SpacingScale } from "@/lib/demo/types";

const WIDTH_CLASS: Record<SectionWidth, string> = {
  contained: "mx-auto w-full px-6 [max-width:var(--demo-container-max)]",
  wide: "mx-auto w-full px-6 [max-width:min(88rem,94vw)]",
  "full-bleed": "w-full",
};

const SPACING_CLASS: Record<SpacingScale, string> = {
  compact: "py-12 sm:py-16",
  standard: "py-16 sm:py-20",
  generous: "py-24 sm:py-32",
};

export function Section({
  children, width = "contained", spacing = "standard", background = "", className = "", id,
}: {
  children: React.ReactNode;
  width?: SectionWidth;
  spacing?: SpacingScale;
  background?: string; // e.g. "bg-[var(--demo-surface)]" — literal, caller-supplied
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`${background} ${SPACING_CLASS[spacing]}`}>
      <div className={`${WIDTH_CLASS[width]} ${className}`}>{children}</div>
    </section>
  );
}

export type SplitRatio = "1:1" | "3:2" | "2:3" | "2:1" | "1:2";

const RATIO_CLASS: Record<SplitRatio, string> = {
  "1:1": "md:grid-cols-2",
  "3:2": "md:grid-cols-[3fr_2fr]",
  "2:3": "md:grid-cols-[2fr_3fr]",
  "2:1": "md:grid-cols-[2fr_1fr]",
  "1:2": "md:grid-cols-[1fr_2fr]",
};

// Asymmetric two-column layout — the design audit found every existing grid
// was a plain 50/50 md:grid-cols-2 (bar one 2/3+1/3 exception). This is what
// lets Boutique Advisory's information rail or Editorial Authority's
// expertise column actually read as considered proportion, not a default.
export function SplitContainer({
  left, right, ratio = "1:1", reverse = false, gapClassName = "gap-12",
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  ratio?: SplitRatio;
  reverse?: boolean; // right content visually first on desktop
  gapClassName?: string;
}) {
  return (
    <div className={`grid items-start ${gapClassName} ${RATIO_CLASS[ratio]}`}>
      <div className={reverse ? "md:order-2" : ""}>{left}</div>
      <div className={reverse ? "md:order-1" : ""}>{right}</div>
    </div>
  );
}

// Large-format typographic centerpiece — an alternative to SectionHeading
// (primitives.tsx) for compositions where typography itself is the visual
// weight of the section, not a lead-in to cards/imagery. Used by
// typographyEmphasis: "display" sections in professional-services families.
export function DisplayHeading({
  eyebrow, heading, subheading, align = "left", rule = true,
}: {
  eyebrow?: string | null;
  heading: string;
  subheading?: string | null;
  align?: "left" | "center";
  rule?: boolean;
}) {
  const alignClass = align === "center" ? "mx-auto text-center" : "";
  return (
    <div className={`max-w-3xl ${alignClass}`}>
      {eyebrow && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--demo-accent)]">{eyebrow}</p>
      )}
      <h1
        style={{ fontFamily: "var(--demo-font-heading)" }}
        className="text-5xl font-medium leading-[1.08] text-[var(--demo-text)] sm:text-6xl lg:text-7xl"
      >
        {heading}
      </h1>
      {rule && <div className={`mt-6 h-px w-14 bg-[var(--demo-accent)] ${align === "center" ? "mx-auto" : ""}`} />}
      {subheading && <p className={`mt-6 max-w-xl text-lg text-[var(--demo-text-muted)] ${align === "center" ? "mx-auto" : ""}`}>{subheading}</p>}
    </div>
  );
}

// A short list of confirmed facts presented as a narrow sidebar rather than
// a floating card or a grid of boxes — the Boutique Advisory family's
// answer to "what replaces the floating trust card when there's no hero
// image to float it over."
export function InfoRail({ items }: { items: { label: string; value: string }[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="space-y-5 border-l border-[var(--demo-border)] pl-6">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-text-muted)]">{item.label}</dt>
          <dd className="mt-1 text-sm text-[var(--demo-text)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
