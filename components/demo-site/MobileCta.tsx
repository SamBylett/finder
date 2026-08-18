import { factValue } from "@/lib/demo/render-context";
import type { DemoBusinessProfile } from "@/lib/demo/types";
import { phoneHref } from "./primitives";
import { archetypeMeta } from "@/lib/demo/industry";

export function MobileCta({ profile }: { profile: DemoBusinessProfile }) {
  const phone = factValue(profile.phone);
  if (!phone) return null;
  const meta = archetypeMeta(profile.business_archetype);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--demo-border)] bg-[var(--demo-bg)] shadow-[0_-2px_10px_rgba(0,0,0,0.08)] md:hidden">
      <a href={phoneHref(phone)} className="flex-1 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-text)]">
        {meta.ctaLibrary.phone}
      </a>
      <a href="#contact" className="flex-1 bg-[var(--demo-accent)] py-3.5 text-center text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-accent-text)]">
        {meta.ctaLibrary.form}
      </a>
    </div>
  );
}
