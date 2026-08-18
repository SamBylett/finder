"use client";

import { useState } from "react";
import type { Demo } from "@/lib/demo/types";

export function DemoPrepPanel({
  businessId,
  demo,
  onUpdated,
}: {
  businessId: string;
  demo: Demo | null;
  onUpdated: (demo: Demo) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [demoUrlInput, setDemoUrlInput] = useState(demo?.demo_url ?? "");
  const [attaching, setAttaching] = useState(false);

  const brief = demo?.lovable_brief ?? null;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/${businessId}/lovable-brief`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to generate Lovable brief.");
      onUpdated(body.demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopyPrompt() {
    if (!brief) return;
    await navigator.clipboard.writeText(brief.full_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAttachDemoUrl() {
    if (!demoUrlInput.trim()) return;
    setAttaching(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/${businessId}/demo-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_url: demoUrlInput.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to attach demo URL.");
      onUpdated(body.demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAttaching(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating…" : brief ? "Regenerate Lovable Brief" : "Generate Lovable Brief"}
        </button>
        {brief && <span className="text-xs text-slate-400">Generated {new Date(brief.generatedAt).toLocaleString("en-GB")}</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {brief && (
        <div className="space-y-4">
          <BriefCard title="Confirmed Facts" content={brief.business_facts_block} />
          <BriefCard title="Factual Guardrails" list={brief.factual_guardrails} />
          <BriefCard title="Design Recommendation" content={brief.design_direction} />
          <BriefCard title="Copy Rules" list={brief.copy_rules} />
          <BriefCard title="Page Structure" list={brief.page_structure} />
          <BriefCard title="Conversion Goal" content={brief.conversion_goal} />
          <BriefCard title="Imagery" content={brief.imagery_instructions} />
          <BriefCard title="Mobile" content={brief.mobile_instructions} />
          <BriefCard title="Final QA" content={brief.final_qa_instructions} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lovable Prompt</h3>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
              >
                {copied ? "Copied!" : "Copy Lovable Prompt"}
              </button>
            </div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
              {brief.full_prompt}
            </pre>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo URL</h3>
            {demo?.demo_url ? (
              <div className="flex flex-wrap items-center gap-2">
                <a href={demo.demo_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open Demo</a>
                <button
                  type="button"
                  onClick={async () => { await navigator.clipboard.writeText(demo.demo_url!); }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                >
                  Copy Demo Link
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <input
                  type="url"
                  value={demoUrlInput}
                  onChange={(e) => setDemoUrlInput(e.target.value)}
                  placeholder="https://your-lovable-site.lovable.app"
                  className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAttachDemoUrl}
                  disabled={attaching || !demoUrlInput.trim()}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {attaching ? "Attaching…" : "Attach Demo URL"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BriefCard({ title, content, list }: { title: string; content?: string; list?: string[] }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {content && <p className="text-sm text-slate-700">{content}</p>}
      {list && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
