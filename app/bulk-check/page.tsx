"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { parseCsv, rowsToObjects } from "@/lib/csv-parse";
import { objectsToCsv, downloadCsv } from "@/lib/csv";
import { isWebsiteWorthReachingOut } from "@/lib/website-worth";
import { websiteStatusBadgeClasses, websiteStatusLabel } from "@/lib/ui";
import type { BulkCheckResult } from "@/app/api/bulk-check/route";
import type { WebsiteStatus } from "@/lib/types";

// Batch size/pacing for the client-driven loop — small enough that a single
// batch request comfortably finishes well within the route's own
// maxDuration, sequential (not all batches at once) so we don't hammer the
// analyzer with thousands of simultaneous outbound requests.
const BATCH_SIZE = 20;

// Matches the exact column names from the sample CSV, with a few sensible
// fallback aliases in case a different export uses slightly different
// headers (e.g. a plain "Company"/"Website" export instead of Apollo's
// company_name/website).
const COLUMN_ALIASES: Record<string, string[]> = {
  company_name: ["company_name", "company", "business_name", "organization"],
  website: ["website", "company_website", "url"],
  company_domain: ["company_domain", "domain"],
  email: ["email"],
  email_status: ["email_status"],
  phone: ["work_direct_phone", "mobile_phone", "phone"],
  linkedin_url: ["linkedin_url", "linkedin"],
  city: ["city"],
  industry: ["industry_std", "industry"],
};

interface DetectedColumns {
  company_name: string | null;
  website: string | null;
  company_domain: string | null;
  email: string | null;
  email_status: string | null;
  phone: string | null;
  linkedin_url: string | null;
  city: string | null;
  industry: string | null;
}

function detectColumns(headers: string[]): DetectedColumns {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const find = (aliases: string[]) => {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias);
      if (idx !== -1) return headers[idx];
    }
    return null;
  };
  return {
    company_name: find(COLUMN_ALIASES.company_name),
    website: find(COLUMN_ALIASES.website),
    company_domain: find(COLUMN_ALIASES.company_domain),
    email: find(COLUMN_ALIASES.email),
    email_status: find(COLUMN_ALIASES.email_status),
    phone: find(COLUMN_ALIASES.phone),
    linkedin_url: find(COLUMN_ALIASES.linkedin_url),
    city: find(COLUMN_ALIASES.city),
    industry: find(COLUMN_ALIASES.industry),
  };
}

// Strips protocol/www/path/query and lowercases, so "https://Example.com/",
// "www.example.com" and "example.com" all dedupe to the same company.
function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

type RowStatus = { status: string; score: number | null; summary: string } | null;

export default function BulkCheckPage() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<DetectedColumns | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [domainResults, setDomainResults] = useState<Map<string, RowStatus>>(new Map());
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setDomainResults(new Map());
    setFileName(file.name);
    try {
      const text = await file.text();
      const { headers: parsedHeaders, rows: parsedRows } = parseCsv(text);
      const objects = rowsToObjects(parsedHeaders, parsedRows);
      setHeaders(parsedHeaders);
      setRows(objects);
      setColumns(detectColumns(parsedHeaders));
    } catch {
      setError("Could not read that file as CSV.");
    }
  }

  // Row -> normalized domain (or null if the row has no usable website at
  // all — those are classified no_website immediately, no API call needed).
  const rowDomains = useMemo(() => {
    if (!columns) return [];
    return rows.map((row) => {
      const websiteVal = columns.website ? row[columns.website] : "";
      const domainVal = columns.company_domain ? row[columns.company_domain] : "";
      const raw = websiteVal || domainVal;
      return normalizeDomain(raw);
    });
  }, [rows, columns]);

  const uniqueDomains = useMemo(() => {
    return Array.from(new Set(rowDomains.filter((d): d is string => d !== null)));
  }, [rowDomains]);

  async function handleStartCheck() {
    if (uniqueDomains.length === 0) return;
    setChecking(true);
    setError(null);
    setProgress({ done: 0, total: uniqueDomains.length });

    const results = new Map<string, RowStatus>();
    for (let i = 0; i < uniqueDomains.length; i += BATCH_SIZE) {
      const batch = uniqueDomains.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch("/api/bulk-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains: batch }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Batch check failed.");
        for (const r of body.results as BulkCheckResult[]) {
          results.set(r.domain, { status: r.status, score: r.score, summary: r.summary });
        }
      } catch (err) {
        // Keep going — a batch-level network hiccup shouldn't lose progress
        // already made; those domains simply stay unresolved (shown as
        // "Couldn't check" in the results) rather than aborting the whole run.
        setError(err instanceof Error ? err.message : "Some batches failed — see unresolved rows below.");
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, uniqueDomains.length), total: uniqueDomains.length });
      setDomainResults(new Map(results));
    }
    setChecking(false);
  }

  // Final per-row classification: no-website rows short-circuit without an
  // API call; everything else looks up its domain's checked result.
  const rowResults = useMemo(() => {
    return rows.map((row, i) => {
      const domain = rowDomains[i];
      if (!domain) return { row, domain: null, result: { status: "no_website", score: null, summary: "No website URL found in the CSV." } };
      return { row, domain, result: domainResults.get(domain) ?? null };
    });
  }, [rows, rowDomains, domainResults]);

  const summary = useMemo(() => {
    let worthIt = 0, notWorthIt = 0, unresolved = 0;
    for (const { result } of rowResults) {
      if (!result) unresolved++;
      else if (isWebsiteWorthReachingOut(result.status)) worthIt++;
      else notWorthIt++;
    }
    return { worthIt, notWorthIt, unresolved, total: rowResults.length };
  }, [rowResults]);

  const worthReachingOutRows = useMemo(
    () => rowResults.filter((r) => r.result && isWebsiteWorthReachingOut(r.result.status)),
    [rowResults]
  );

  function handleExport() {
    if (!columns) return;
    const exportHeaders = [...headers, "website_status", "website_status_summary"];
    const exportRows = worthReachingOutRows.map(({ row, result }) => ({
      ...row,
      website_status: result?.status ?? "",
      website_status_summary: result?.summary ?? "",
    }));
    const csv = objectsToCsv(exportHeaders, exportRows);
    downloadCsv(`worth-reaching-out-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  const hasFile = headers.length > 0;
  const missingWebsiteColumn = columns && !columns.website && !columns.company_domain;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
        ← Back to results
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Bulk Website Checker</h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload a CSV of leads and check every company&apos;s website — export just the ones with no
        website, a broken one, or a weak one. Runs separately from your main prospect search; doesn&apos;t
        touch your Opportunity Score dashboard.
      </p>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block text-sm text-slate-600"
        />
        {fileName && <p className="mt-2 text-xs text-slate-500">Loaded {fileName} — {rows.length} rows.</p>}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {hasFile && columns && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-700">Detected columns</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
              <div>Company name: <span className="text-slate-800">{columns.company_name ?? "not found"}</span></div>
              <div>Website: <span className="text-slate-800">{columns.website ?? "not found"}</span></div>
              <div>Company domain: <span className="text-slate-800">{columns.company_domain ?? "not found"}</span></div>
              <div>Email: <span className="text-slate-800">{columns.email ?? "not found"}</span></div>
              <div>Phone: <span className="text-slate-800">{columns.phone ?? "not found"}</span></div>
              <div>LinkedIn: <span className="text-slate-800">{columns.linkedin_url ?? "not found"}</span></div>
            </dl>
            {missingWebsiteColumn && (
              <p className="mt-2 text-xs text-red-600">
                No website or company_domain column found — can&apos;t check anything with this file.
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              {rows.length} rows, {uniqueDomains.length} unique company websites to check (rows with no
              website are automatically counted as &quot;No website&quot; without needing a check).
            </p>
          </div>

          {!missingWebsiteColumn && (
            <button
              type="button"
              onClick={handleStartCheck}
              disabled={checking || uniqueDomains.length === 0}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checking ? `Checking… (${progress.done}/${progress.total})` : `Check ${uniqueDomains.length} websites`}
            </button>
          )}

          {progress.total > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-slate-900 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}

          {(domainResults.size > 0 || rowResults.some((r) => r.domain === null)) && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="Worth reaching out to" value={summary.worthIt} tone="green" />
                <SummaryCard label="Not worth it (average/strong site)" value={summary.notWorthIt} tone="slate" />
                <SummaryCard label="Not yet checked" value={summary.unresolved} tone="amber" />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Showing {worthReachingOutRows.length} leads worth reaching out to.
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={worthReachingOutRows.length === 0}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Export CSV ({worthReachingOutRows.length})
                </button>
              </div>

              <div className="max-h-[600px] overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <Th>Company</Th>
                      <Th>Website</Th>
                      <Th>Status</Th>
                      <Th>Email</Th>
                      <Th>Phone</Th>
                      <Th>LinkedIn</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {worthReachingOutRows.map(({ row, domain, result }, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{columns.company_name ? row[columns.company_name] : "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{domain ?? "—"}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${websiteStatusBadgeClasses(result!.status as WebsiteStatus)}`} title={result?.summary}>
                            {websiteStatusLabel(result!.status as WebsiteStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{columns.email ? row[columns.email] : "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{columns.phone ? row[columns.phone] : "—"}</td>
                        <td className="px-4 py-2">
                          {columns.linkedin_url && row[columns.linkedin_url] ? (
                            <a href={row[columns.linkedin_url]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Profile</a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "green" | "slate" | "amber" }) {
  const toneClasses = {
    green: "border-green-200 bg-green-50 text-green-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
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
