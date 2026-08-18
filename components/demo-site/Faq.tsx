"use client";

import { useState } from "react";
import type { DemoRenderContext } from "@/lib/demo/render-context";
import { SectionHeading } from "./primitives";
import { Section } from "./section-primitives";
import type { FaqVariant } from "@/lib/demo/types";

export function Faq({ ctx, variant }: { ctx: DemoRenderContext; variant: FaqVariant }) {
  const items = ctx.copy.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (items.length === 0) return null;

  const { spacingScale, align } = ctx.config.compositionProfile;

  if (variant === "structured-list") {
    // Non-accordion alternative — a professional-services enquiry page
    // reading as considered content, not a generic SaaS support widget.
    return (
      <Section spacing={spacingScale} className="max-w-3xl">
        <SectionHeading heading="Frequently asked questions" align={align} />
        <div className="divide-y divide-[var(--demo-border)]">
          {items.map((item) => (
            <div key={item.question} className="py-6">
              <p className="text-sm font-semibold text-[var(--demo-text)]">{item.question}</p>
              <p className="mt-2 text-sm text-[var(--demo-text-muted)]">{item.answer}</p>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  return (
    <Section spacing={spacingScale} className="max-w-3xl">
      <SectionHeading heading="Frequently asked questions" align={align} />
      <div className="divide-y divide-[var(--demo-border)] rounded-[var(--demo-radius)] border border-[var(--demo-border)]">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[var(--demo-text)]"
                aria-expanded={open}
              >
                {item.question}
                <span className="text-[var(--demo-text-muted)]">{open ? "−" : "+"}</span>
              </button>
              {open && <p className="px-5 pb-4 text-sm text-[var(--demo-text-muted)]">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
