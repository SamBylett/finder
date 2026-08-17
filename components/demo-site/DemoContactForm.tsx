"use client";

// Demo-safe: never actually sends an enquiry. Speculative demos must not
// accidentally capture real customer leads. Structured so a converted
// client's real form handler can be swapped in later without touching the
// surrounding component (see productionMode prop, unused in V2.0).

import { useState } from "react";

export function DemoContactForm({ productionMode = false }: { productionMode?: boolean }) {
  const [submitted, setSubmitted] = useState(false);

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
          ? "Thanks — your enquiry has been sent."
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
        type="tel"
        placeholder="Phone number"
        required
        className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
      />
      <textarea
        placeholder="What do you need help with?"
        rows={3}
        className="w-full rounded-[var(--demo-radius)] border border-[var(--demo-border)] bg-[var(--demo-bg)] px-4 py-2.5 text-sm text-[var(--demo-text)] placeholder:text-[var(--demo-text-muted)]"
      />
      <button
        type="submit"
        className="w-full rounded-[var(--demo-radius)] bg-[var(--demo-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--demo-accent-text)] hover:bg-[var(--demo-accent-hover)]"
      >
        Get a quote
      </button>
    </form>
  );
}
