"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Business, OpportunityTier } from "@/lib/types";
import { tierBadgeClasses, websiteStatusBadgeClasses, websiteStatusLabel, demoPotentialBadgeClasses, outreachTierBadgeClasses, outreachChannelBadgeClasses, priorityBadgeClasses } from "@/lib/ui";
import { businessesToCsv, downloadCsv } from "@/lib/csv";
import { computeOutreachReadiness } from "@/lib/outreach";
import { calculateProspectPriority } from "@/lib/prospect-priority";
import { isWebsiteWorthReachingOut } from "@/lib/website-worth";

type SortKey = "opportunity_score" | "google_review_count" | "demo_potential_score" | "outreach_strong_routes" | "prospect_priority";
type FilterKey =
  | "HOT" | "OPPORTUNITY" | "LOW_PRIORITY" | "NO_WEBSITE" | "BROKEN_WEBSITE" | "WEAK_WEBSITE" | "WORTH_REACHING_OUT"
  | "HAS_EMAIL" | "HAS_MOBILE" | "HAS_FACEBOOK" | "HAS_INSTAGRAM" | "HAS_LINKEDIN"
  | "ANY_DIGITAL_ROUTE" | "MULTIPLE_ROUTES" | "LANDLINE_ONLY" | "NO_USABLE_ROUTE" | "OUTREACH_READY"
  | "HIGH_DEMO_POTENTIAL" | "READY_FOR_DEMO";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "WORTH_REACHING_OUT", label: "Worth reaching out to" },
  { key: "HOT", label: "HOT" },
  { key: "OPPORTUNITY", label: "OPPORTUNITY" },
  { key: "LOW_PRIORITY", label: "LOW PRIORITY" },
  { key: "NO_WEBSITE", label: "No website" },
  { key: "BROKEN_WEBSITE", label: "Broken website" },
  { key: "WEAK_WEBSITE", label: "Weak website" },
  { key: "READY_FOR_DEMO", label: "Ready for demo" },
  { key: "OUTREACH_READY", label: "Outreach ready" },
  { key: "HIGH_DEMO_POTENTIAL", label: "High demo potential" },
  { key: "HAS_EMAIL", label: "Has email" },
  { key: "HAS_MOBILE", label: "Has mobile / WhatsApp" },
  { key: "HAS_FACEBOOK", label: "Has Facebook" },
  { key: "HAS_INSTAGRAM", label: "Has Instagram" },
  { key: "HAS_LINKEDIN", label: "Has LinkedIn" },
  { key: "ANY_DIGITAL_ROUTE", label: "Any digital route" },
  { key: "MULTIPLE_ROUTES", label: "Multiple routes" },
  { key: "LANDLINE_ONLY", label: "Landline only" },
  { key: "NO_USABLE_ROUTE", label: "No usable route" },
];

export default function ResultsTable({ results }: { results: Business[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("opportunity_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // On by default per explicit instruction: average/strong websites aren't
  // worth reaching out to. Still an ordinary toggleable filter — clear it
  // (or the "Clear filters" button) to see everything.
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(["WORTH_REACHING_OUT"]));

  function toggleFilter(key: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    if (activeFilters.size === 0) return results;
    return results.filter((r) => matchesAllFilters(r, activeFilters));
  }, [results, activeFilters]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const value = (b: Business) => {
      if (sortKey === "outreach_strong_routes") return computeOutreachReadiness(b).strongRouteCount;
      if (sortKey === "prospect_priority") return calculateProspectPriority(b).score;
      return b[sortKey];
    };
    copy.sort((a, b) => {
      const diff = value(a) - value(b);
      return sortDir === "desc" ? -diff : diff;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function handleExportCsv() {
    const csv = businessesToCsv(sorted);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`opportunities_${date}.csv`, csv);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                activeFilters.has(f.key)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              {f.label}
            </button>
          ))}
          {activeFilters.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilters(new Set())}
              className="rounded-full border border-transparent px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-600"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <BatchEnrichControl />
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sorted.length === 0}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV ({sorted.length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th>Business</Th>
              <Th>Location</Th>
              <Th>Rating</Th>
              <ThSortable label="Reviews" active={sortKey === "google_review_count"} dir={sortDir} onClick={() => toggleSort("google_review_count")} />
              <Th>Website status</Th>
              <Th>Contact</Th>
              <ThSortable label="Score" active={sortKey === "opportunity_score"} dir={sortDir} onClick={() => toggleSort("opportunity_score")} />
              <Th>Tier</Th>
              <ThSortable label="Demo Potential" active={sortKey === "demo_potential_score"} dir={sortDir} onClick={() => toggleSort("demo_potential_score")} />
              <ThSortable label="Outreach" active={sortKey === "outreach_strong_routes"} dir={sortDir} onClick={() => toggleSort("outreach_strong_routes")} />
              <ThSortable label="Priority" active={sortKey === "prospect_priority"} dir={sortDir} onClick={() => toggleSort("prospect_priority")} />
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((b) => {
              const outreach = computeOutreachReadiness(b);
              const priority = calculateProspectPriority(b);
              return (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.business_name}</td>
                  <td className="px-4 py-3 text-slate-600">{b.town_city}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.google_rating !== null ? `${b.google_rating.toFixed(1)}★` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.google_review_count}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${websiteStatusBadgeClasses(b.website_status)}`}>
                      {websiteStatusLabel(b.website_status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ContactIndicators business={b} outreach={outreach} />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{b.opportunity_score}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tierBadgeClasses(b.opportunity_tier)}`}>
                      {b.opportunity_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${demoPotentialBadgeClasses(b.demo_potential_tier)}`}>
                      {b.demo_potential_score} · {b.demo_potential_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${outreachTierBadgeClasses(outreach.tier)}`}
                      title={outreach.reasons.join("\n")}
                    >
                      {outreach.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityBadgeClasses(priority.score)}`}
                      title={priority.breakdown.map((l) => `${l.label}: ${l.value}`).join("\n")}
                    >
                      {priority.score}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/business/${b.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      View details
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  No businesses match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function matchesAllFilters(b: Business, filters: Set<FilterKey>): boolean {
  const outreach = computeOutreachReadiness(b);
  for (const f of filters) {
    switch (f) {
      case "HOT":
        if (!tierMatches(b.opportunity_tier, "HOT")) return false;
        break;
      case "OPPORTUNITY":
        if (!tierMatches(b.opportunity_tier, "OPPORTUNITY")) return false;
        break;
      case "LOW_PRIORITY":
        if (!tierMatches(b.opportunity_tier, "LOW PRIORITY")) return false;
        break;
      case "NO_WEBSITE":
        if (b.website_status !== "no_website") return false;
        break;
      case "BROKEN_WEBSITE":
        if (b.website_status !== "broken_website") return false;
        break;
      case "WEAK_WEBSITE":
        if (b.website_status !== "weak_website") return false;
        break;
      case "WORTH_REACHING_OUT":
        if (!isWebsiteWorthReachingOut(b.website_status)) return false;
        break;
      case "HAS_EMAIL":
        if (!outreach.channels.email) return false;
        break;
      case "HAS_MOBILE":
        if (!outreach.channels.mobile) return false;
        break;
      case "HAS_FACEBOOK":
        if (!outreach.channels.facebook) return false;
        break;
      case "HAS_INSTAGRAM":
        if (!outreach.channels.instagram) return false;
        break;
      case "HAS_LINKEDIN":
        if (!outreach.channels.linkedin) return false;
        break;
      case "ANY_DIGITAL_ROUTE":
        if (outreach.strongRouteCount === 0) return false;
        break;
      case "MULTIPLE_ROUTES":
        if (outreach.strongRouteCount < 2) return false;
        break;
      case "LANDLINE_ONLY":
        if (!(outreach.strongRouteCount === 0 && outreach.channels.landline)) return false;
        break;
      case "NO_USABLE_ROUTE":
        if (!(outreach.strongRouteCount === 0 && !outreach.channels.landline)) return false;
        break;
      case "OUTREACH_READY":
        if (outreach.tier !== "HIGH" && outreach.tier !== "GOOD") return false;
        break;
      case "HIGH_DEMO_POTENTIAL":
        if (b.demo_potential_tier !== "EXCELLENT DEMO" && b.demo_potential_tier !== "GOOD DEMO") return false;
        break;
      case "READY_FOR_DEMO":
        if (b.opportunity_tier === "LOW PRIORITY") return false;
        if (b.demo_potential_score < 60) return false;
        if (outreach.tier !== "HIGH" && outreach.tier !== "GOOD") return false;
        break;
    }
  }
  return true;
}

function tierMatches(tier: OpportunityTier, target: OpportunityTier): boolean {
  return tier === target;
}

// Compact channel indicators for the results table. WA? (not WA) is
// deliberate — a mobile number is a WhatsApp CANDIDATE, never confirmed.
function ContactIndicators({ business, outreach }: { business: Business; outreach: ReturnType<typeof computeOutreachReadiness> }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {business.email && (
        <button
          type="button"
          onClick={() => copy("email", business.email!)}
          title={business.email}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outreachChannelBadgeClasses(true)}`}
        >
          {copied === "email" ? "Copied" : "EMAIL"}
        </button>
      )}
      {outreach.channels.mobile && business.phone && (
        <button
          type="button"
          onClick={() => copy("mobile", business.phone!)}
          title={`${business.phone} — WhatsApp candidate, not confirmed`}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outreachChannelBadgeClasses(true)}`}
        >
          {copied === "mobile" ? "Copied" : "WA?"}
        </button>
      )}
      {business.facebook_url && (
        <a
          href={business.facebook_url}
          target="_blank"
          rel="noreferrer noopener"
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outreachChannelBadgeClasses(true)}`}
        >
          FB
        </a>
      )}
      {business.instagram_url && (
        <a
          href={business.instagram_url}
          target="_blank"
          rel="noreferrer noopener"
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outreachChannelBadgeClasses(true)}`}
        >
          IG
        </a>
      )}
      {business.linkedin_url && (
        <a
          href={business.linkedin_url}
          target="_blank"
          rel="noreferrer noopener"
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${outreachChannelBadgeClasses(true)}`}
        >
          LI
        </a>
      )}
      {outreach.strongRouteCount === 0 && !outreach.channels.landline && (
        <span className="text-xs text-slate-300">—</span>
      )}
    </div>
  );
}

// Batch "Enrich Top N" — always shows the actual eligible count (post-
// threshold-filter) before spending any FindyMail credits, per V2.5 spec:
// "Top 50" might only enrich 31 if 19 don't meet the threshold.
function BatchEnrichControl() {
  const [topN, setTopN] = useState<10 | 25 | 50>(10);
  const [preview, setPreview] = useState<{ requestedCount: number; eligibleCount: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handlePreview() {
    setResult(null);
    const res = await fetch("/api/enrich/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topN, dryRun: true }),
    });
    const body = await res.json();
    if (res.ok) setPreview(body);
  }

  async function handleConfirm() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/enrich/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topN }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Batch enrichment failed.");
      setResult(`Enriched ${body.enrichedCount}/${body.eligibleCount} eligible businesses.`);
      setPreview(null);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <select
        value={topN}
        onChange={(e) => { setTopN(Number(e.target.value) as 10 | 25 | 50); setPreview(null); setResult(null); }}
        className="rounded-md border border-slate-300 px-2 py-1.5"
      >
        <option value={10}>Top 10</option>
        <option value={25}>Top 25</option>
        <option value={50}>Top 50</option>
      </select>
      {!preview ? (
        <button
          type="button"
          onClick={handlePreview}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-slate-400"
        >
          Enrich Top Prospects
        </button>
      ) : (
        <>
          <span className="text-slate-500">{preview.eligibleCount} of {preview.requestedCount} meet the threshold</span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={running || preview.eligibleCount === 0}
            className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "Enriching…" : `Confirm & Enrich ${preview.eligibleCount}`}
          </button>
          <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600">Cancel</button>
        </>
      )}
      {result && <span className="text-slate-500">{result}</span>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function ThSortable({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-slate-800">
        {label}
        <span className="text-slate-400">{active ? (dir === "desc" ? "↓" : "↑") : "↕"}</span>
      </button>
    </th>
  );
}
