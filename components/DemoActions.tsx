"use client";

import { useState } from "react";
import Link from "next/link";
import type { Business } from "@/lib/types";
import type { Demo } from "@/lib/demo/types";

const STATUS_LABELS: Record<Demo["status"], string> = {
  NOT_STARTED: "Not started",
  COLLECTING_DATA: "Collecting data…",
  GENERATING: "Generating…",
  DRAFT: "Draft",
  READY_TO_SHARE: "Ready to share",
  SHARED: "Shared",
  CONVERTED: "Converted to client site",
  ARCHIVED: "Archived",
  FAILED: "Failed",
};

export function DemoActions({ business, demo: initialDemo }: { business: Business; demo: Demo | null }) {
  const [demo, setDemo] = useState(initialDemo);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleBuildDemo() {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: business.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to build demo.");
      setDemo(body.demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBuilding(false);
    }
  }

  async function handleCopyLink() {
    if (!demo) return;
    const url = `${window.location.origin}/demo/${demo.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isGenerating = building || demo?.status === "COLLECTING_DATA" || demo?.status === "GENERATING";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!demo && (
        <button
          type="button"
          onClick={handleBuildDemo}
          disabled={building}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {building ? "Building demo…" : "Build Demo"}
        </button>
      )}

      {demo && (
        <>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {STATUS_LABELS[demo.status]}
          </span>

          {demo.quality_check && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                demo.quality_check.status === "READY"
                  ? "border border-green-200 bg-green-50 text-green-700"
                  : demo.quality_check.status === "NEEDS_REVIEW"
                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
              title={demo.quality_check.issues.join("\n") || "No issues found"}
            >
              {demo.quality_check.status.replace("_", " ")}
            </span>
          )}

          {demo.status !== "FAILED" && (
            <Link
              href={`/demo/${demo.slug}`}
              target="_blank"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
            >
              View Demo
            </Link>
          )}

          <Link
            href={`/demos/${demo.id}/edit`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Edit Demo
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>

          {demo.status === "FAILED" && (
            <button
              type="button"
              onClick={handleBuildDemo}
              disabled={building}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {building ? "Retrying…" : "Retry Build"}
            </button>
          )}
        </>
      )}

      {isGenerating && !building && (
        <span className="text-xs text-slate-400">This can take up to a minute.</span>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
      {demo?.failure_reason && demo.status === "FAILED" && (
        <span className="text-xs text-red-600">{demo.failure_reason}</span>
      )}
    </div>
  );
}
