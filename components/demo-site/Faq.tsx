"use client";

import { useState } from "react";
import type { DemoRenderContext } from "@/lib/demo/render-context";
import { Container, SectionHeading } from "./primitives";

export function Faq({ ctx }: { ctx: DemoRenderContext }) {
  const items = ctx.copy.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (items.length === 0) return null;

  return (
    <section className="bg-[var(--demo-bg)] py-20">
      <Container className="max-w-3xl">
        <SectionHeading heading="Frequently asked questions" />
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
      </Container>
    </section>
  );
}
