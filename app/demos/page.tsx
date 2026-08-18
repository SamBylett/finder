// Internal listing of every demo built so far — one place to find share
// links instead of pasting them manually. Not the public-facing /demo/[slug]
// route: this shows status/sharing/internal state and is meant for you, not
// prospects.

import Link from "next/link";
import { listDemos } from "@/lib/demo/store";
import { demoPotentialBadgeClasses } from "@/lib/ui";
import type { Demo, DemoStatus } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<DemoStatus, string> = {
  NOT_STARTED: "Not started",
  COLLECTING_DATA: "Collecting data",
  GENERATING: "Generating",
  DRAFT: "Draft",
  READY_TO_SHARE: "Ready to share",
  SHARED: "Shared",
  CONVERTED: "Converted",
  ARCHIVED: "Archived",
  FAILED: "Failed",
};

function qualityBadgeClasses(status: string): string {
  switch (status) {
    case "READY":
      return "bg-green-50 text-green-700 border border-green-200";
    case "NEEDS_REVIEW":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "NOT_READY":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-slate-100 text-slate-500 border border-slate-200";
  }
}

function statusBadgeClasses(status: DemoStatus): string {
  switch (status) {
    case "FAILED":
      return "bg-red-50 text-red-700 border border-red-200";
    case "CONVERTED":
      return "bg-green-50 text-green-700 border border-green-200";
    case "SHARED":
    case "READY_TO_SHARE":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "GENERATING":
    case "COLLECTING_DATA":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

export default async function DemosPage() {
  const demos = await listDemos();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to search
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Demo sites</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every speculative demo built so far, with its share link in one place.
          </p>
        </div>
        <span className="text-sm text-slate-500">{demos.length} demo{demos.length === 1 ? "" : "s"}</span>
      </header>

      {demos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          No demos built yet. Open a business&apos;s detail page and click &quot;Build Demo&quot; to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>Business</Th>
                <Th>Status</Th>
                <Th>Quality</Th>
                <Th>Sharing</Th>
                <Th>Demo Potential</Th>
                <Th>Updated</Th>
                <Th>Link</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demos.map((demo) => (
                <DemoRow key={demo.id} demo={demo} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function DemoRow({ demo }: { demo: Demo }) {
  const name = demo.business_profile?.business_name.value ?? "(unnamed business)";
  const canPreview = demo.sharing_enabled;

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(demo.status)}`}>
          {STATUS_LABELS[demo.status]}
        </span>
      </td>
      <td className="px-4 py-3">
        {demo.quality_check ? (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityBadgeClasses(demo.quality_check.status)}`}
            title={demo.quality_check.issues.join("\n") || "No issues found"}
          >
            {demo.quality_check.status.replace("_", " ")}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-600">{demo.sharing_enabled ? "Enabled" : "Off"}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${demoPotentialBadgeClasses(demo.demo_potential_tier)}`}>
          {demo.demo_potential_score} · {demo.demo_potential_tier}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500">{new Date(demo.updated_at).toLocaleDateString("en-GB")}</td>
      <td className="px-4 py-3">
        {canPreview ? (
          <Link href={`/demo/${demo.slug}`} target="_blank" className="text-blue-600 hover:underline">
            /demo/{demo.slug}
          </Link>
        ) : (
          <span className="text-slate-400" title="Sharing is off — enable it in the editor to make this link live">
            /demo/{demo.slug} (not shared)
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-3">
          <Link href={`/demos/${demo.id}/edit`} className="font-medium text-blue-600 hover:underline">
            Edit
          </Link>
          <Link href={`/business/${demo.business_id}`} className="font-medium text-slate-500 hover:underline">
            Business
          </Link>
        </div>
      </td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}
