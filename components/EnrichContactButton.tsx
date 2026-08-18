"use client";

import { useState } from "react";

// Eligibility is checked server-side (lib/enrichment-policy.ts) so the
// threshold is always read from the server's env, not duplicated/guessed
// client-side. If not eligible, the reason is just shown, not treated as
// an error.
export function EnrichContactButton({ businessId, onEnriched }: { businessId: string; onEnriched: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/business/${businessId}/enrich`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Enrichment failed.");
      setMessage(body.reason);
      setStatus("done");
      if (body.enriched) onEnriched();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("done");
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "Enriching…" : "Enrich Contact"}
      </button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
