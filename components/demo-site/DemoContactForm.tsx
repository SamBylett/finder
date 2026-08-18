"use client";

// Demo-safe: never actually sends an enquiry. Speculative demos must not
// accidentally capture real customer leads. Structured so a converted
// client's real form handler can be swapped in later without touching the
// surrounding component (see productionMode prop, unused in V2.0).
//
// Fields and button label follow the business's conversion model — a
// professional-services enquiry form must never say "Get a quote", and a
// quote-driven trade shouldn't ask "What can we help with?" without also
// asking what kind of work it is.

import { useState } from "react";
import { archetypeMeta } from "@/lib/demo/industry";
import type { BusinessArchetype } from "@/lib/demo/types";

export function DemoContactForm({
  archetype,
  productionMode = false,
}: {
  archetype: BusinessArchetype;
  productionMode?: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);
  const meta = archetypeMeta(archetype);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productionMode) {
      setSubmitted(true);
      return;
    }
    // Production submission is intentionally not implemented in V2.0 — see
    // spec section 23 ("real quote forms" is a future client feature).
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-surface)] p-5 text-sm text-[var(--demo-text)]">
        {productionMode
          ? "Thanks. Your message has been sent."
          : "Demo form — this would send an enquiry once the site is live."}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        placeholder="Your name"
        required
        className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
      />
      <input
        type="email"
        placeholder="Email address"
        required
        className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
      />
      <input
        type="tel"
        placeholder="Phone number"
        required
        className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
      />
      {!meta.professionalSections && (
        <input
          type="text"
          placeholder="Postcode"
          className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
        />
      )}
      <textarea
        placeholder={meta.professionalSections ? "What can we help with?" : "Tell us about the work you need"}
        rows={3}
        className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
      />
      <button
        type="submit"
        className="w-full rounded-[var(--demo-radius)] bg-[var(--demo-accent)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--demo-accent-text)] hover:bg-[var(--demo-accent-hover)]"
      >
        {meta.ctaLibrary.form}
      </button>
    </form>
  );
}
