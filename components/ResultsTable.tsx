"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Business, OpportunityTier } from "@/lib/types";
import { tierBadgeClasses, websiteStatusBadgeClasses, websiteStatusLabel, demoPotentialBadgeClasses, outreachTierBadgeClasses, outreachChannelBadgeClasses } from "@/lib/ui";
import { businessesToCsv, downloadCsv } from "@/lib/csv";
import { computeOutreachReadiness } from "@/lib/outreach";

type SortKey = "opportunity_score" | "google_review_count" | "demo_potential_score" | "outreach_strong_routes";
type FilterKey =
  | "HOT" | "OPPORTUNITY" | "LOW_PRIORITY" | "NO_WEBSITE" | "WEAK_WEBSITE"
  | "HAS_EMAIL" | "HAS_MOBILE" | "HAS_FACEBOOK" | "HAS_INSTAGRAM" | "HAS_LINKEDIN"
  | "ANY_DIGITAL_ROUTE" | "MULTIPLE_ROUTES" | "LANDLINE_ONLY" | "NO_USABLE_ROUTE" | "OUTREACH_READY";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "HOT", label: "HOT" },
  { key: "OPPORTUNITY", label: "OPPORTUNITY" },
  { key: "LOW_PRIORITY", label: "LOW PRIORITY" },
  { key: "NO_WEBSITE", label: "No website" },
  { key: "WEAK_WEBSITE", label: "Weak website" },
  { key: "OUTREACH_READY", label: "Outreach ready" },
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
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

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
    const value = (b: Business) =>
      sortKey === "outreach_strong_routes" ? computeOutreachReadiness(b).strongRouteCount : b[sortKey];
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

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={sorted.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV ({sorted.length})
        </button>
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
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((b) => {
              const outreach = computeOutreachReadiness(b);
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
                    <Link href={`/business/${b.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      View details
                    </Link>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
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
      case "WEAK_WEBSITE":
        if (b.website_status !== "weak_website") return false;
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
