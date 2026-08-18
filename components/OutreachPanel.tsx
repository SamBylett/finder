"use client";

import { useState } from "react";
import type { Business } from "@/lib/types";
import type { Demo, OutreachChannel, OutreachKind, WorkflowStatus } from "@/lib/demo/types";
import { computeOutreachReadiness } from "@/lib/outreach";

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email", whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
};
const KIND_LABELS: Record<OutreachKind, string> = {
  first_contact: "Generate First Message", demo_link: "Generate Demo Link Message", follow_up: "Generate Follow-Up",
};
const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "NOT_STARTED", "BRIEF_READY", "BUILDING_IN_LOVABLE", "DEMO_READY", "SENT", "RESPONDED", "INTERESTED", "NOT_INTERESTED",
];

export function OutreachPanel({
  businessId,
  business,
  demo,
  onUpdated,
}: {
  businessId: string;
  business: Business;
  demo: Demo | null;
  onUpdated: (demo: Demo) => void;
}) {
  const outreach = computeOutreachReadiness(business);
  const availableChannels: OutreachChannel[] = [
    ...(outreach.channels.email ? (["email"] as const) : []),
    ...(outreach.channels.mobile ? (["whatsapp"] as const) : []),
    ...(outreach.channels.facebook ? (["facebook"] as const) : []),
    ...(outreach.channels.instagram ? (["instagram"] as const) : []),
    ...(outreach.channels.linkedin ? (["linkedin"] as const) : []),
  ];

  const [channel, setChannel] = useState<OutreachChannel | null>(availableChannels[0] ?? null);
  const [loadingKind, setLoadingKind] = useState<OutreachKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  async function handleGenerate(kind: OutreachKind) {
    if (!channel) return;
    setLoadingKind(kind);
    setError(null);
    try {
      const res = await fetch(`/api/business/${businessId}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, channel }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to generate outreach message.");
      onUpdated(body.demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoadingKind(null);
    }
  }

  async function handleStatusChange(status: WorkflowStatus) {
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/business/${businessId}/workflow-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (res.ok) onUpdated(body.demo);
    } finally {
      setStatusUpdating(false);
    }
  }

  if (availableChannels.length === 0) {
    return <p className="text-sm text-slate-500">No usable contact channel found yet — enrich contact info above first.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {availableChannels.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              channel === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {CHANNEL_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["first_contact", "demo_link", "follow_up"] as OutreachKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => handleGenerate(kind)}
            disabled={loadingKind !== null || (kind === "demo_link" && !demo?.demo_url)}
            title={kind === "demo_link" && !demo?.demo_url ? "Attach a demo URL first" : undefined}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingKind === kind ? "Generating…" : KIND_LABELS[kind]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {demo && channel && (
        <OutreachMessages demo={demo} channel={channel} />
      )}

      <div className="border-t border-slate-200 pt-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow status</label>
        <select
          value={demo?.workflow_status ?? "NOT_STARTED"}
          onChange={(e) => handleStatusChange(e.target.value as WorkflowStatus)}
          disabled={statusUpdating || !demo}
          className="mt-1 block w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {WORKFLOW_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function OutreachMessages({ demo, channel }: { demo: Demo; channel: OutreachChannel }) {
  const kinds: OutreachKind[] = ["first_contact", "demo_link", "follow_up"];
  const entries = kinds
    .map((kind) => ({ kind, message: demo.outreach_messages?.[`${kind}_${channel}`] }))
    .filter((e) => e.message);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {entries.map(({ kind, message }) => (
        <div key={kind} className="rounded-md border border-slate-200 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{KIND_LABELS[kind]}</span>
            <CopyButton text={message!.subject ? `Subject: ${message!.subject}\n\n${message!.body}` : message!.body} />
          </div>
          {message!.subject && <p className="text-sm font-semibold text-slate-800">{message!.subject}</p>}
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{message!.body}</p>
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-slate-400"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
