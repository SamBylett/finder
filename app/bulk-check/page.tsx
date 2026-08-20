"use client";

import { useEffect, useMemo, useState } from "react";
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
// analyzer with thousands of simultaneous outbound requests. Kept small
// (rather than the route's own MAX_BATCH_SIZE of 25) so that a handful of
// slow/hanging real-world sites in one batch can't push it close to the
// serverless timeout — smaller batches fail smaller if something does hang.
const BATCH_SIZE = 10;

// Hard client-side cutoff per batch request — a batch that hangs (e.g. a
// site that accepts a connection but never responds, slipping past the
// analyzer's own internal timeout) would otherwise stall the whole run
// indefinitely with no feedback. Below the route's maxDuration so we detect
// and move on before Vercel itself would kill the request.
const BATCH_TIMEOUT_MS = 55_000;

// Retry a batch this many times before giving up on it and marking its
// domains unresolved — most batch failures are transient (one bad site
// tripping something up, or a cold serverless start), not permanent.
const MAX_BATCH_RETRIES = 2;

// Autosaved to localStorage (not sessionStorage) so a checked file survives
// closing the tab/browser entirely, not just a refresh — a 6k-row check can
// take a while and losing it on an accidental close would be painful.
const STORAGE_KEY = "bulkcheck:lastRun";

// The two campaign buckets — messaging differs between "you have no website
// at all" and "your website has a problem", so exports are split
// accordingly rather than one combined "worth reaching out to" file.
const NO_WEBSITE_STATUSES = new Set(["no_website", "social_only"]);
const BROKEN_OR_WEAK_STATUSES = new Set(["broken_website", "weak_website"]);

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
  const [failedDomains, setFailedDomains] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchesFailed, setBatchesFailed] = useState(0);
  const [tableFilter, setTableFilter] = useState<"all" | "no_website" | "broken_or_weak">("all");
  const [restored, setRestored] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  // Warn before an accidental refresh/navigation loses an in-progress run —
  // autosave (below) covers most of this, but the current in-flight batch
  // isn't saved until it completes, so a mid-batch close can still lose a
  // few seconds of work.
  useEffect(() => {
    if (!checking) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [checking]);

  // Restore a previous run on load (e.g. you closed the tab mid-check, or
  // just want to come back to results from earlier).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        fileName: string; headers: string[]; rows: Record<string, string>[];
        domainResults: [string, RowStatus][]; failedDomains: string[]; batchesFailed: number;
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restoration from localStorage on mount is intentional
      setFileName(saved.fileName);
      setHeaders(saved.headers);
      setRows(saved.rows);
      setColumns(detectColumns(saved.headers));
      setDomainResults(new Map(saved.domainResults));
      setFailedDomains(saved.failedDomains ?? []);
      setBatchesFailed(saved.batchesFailed ?? 0);
      setRestored(true);
    } catch {
      // Corrupt/unreadable save — ignore, start fresh.
    }
  }, []);

  // Autosave after every change to the checked file or its results —
  // wrapped in try/catch since a large CSV (many thousands of rows) can
  // exceed the browser's localStorage quota; if that happens we tell you
  // rather than silently failing to save.
  useEffect(() => {
    if (!fileName) return;
    try {
      const payload = JSON.stringify({
        fileName, headers, rows,
        domainResults: Array.from(domainResults.entries()),
        failedDomains, batchesFailed,
      });
      localStorage.setItem(STORAGE_KEY, payload);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a warning once the save that caused it succeeds is intentional
      setSaveWarning(null);
    } catch {
      setSaveWarning(
        "Couldn't autosave — this file is too large for browser storage. Export a CSV below to keep a copy; if you leave this page you'll lose unsaved progress."
      );
    }
  }, [fileName, headers, rows, domainResults, failedDomains, batchesFailed]);

  function handleClearSaved() {
    localStorage.removeItem(STORAGE_KEY);
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setColumns(null);
    setDomainResults(new Map());
    setFailedDomains([]);
    setBatchesFailed(0);
    setRestored(false);
    setError(null);
  }

  async function handleFile(file: File) {
    setError(null);
    setDomainResults(new Map());
    setFailedDomains([]);
    setBatchesFailed(0);
    setRestored(false);
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

  async function checkBatch(batch: string[]): Promise<BulkCheckResult[]> {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt <= MAX_BATCH_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);
      try {
        const res = await fetch("/api/bulk-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domains: batch }),
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Batch check failed.");
        return body.results as BulkCheckResult[];
      } catch (err) {
        lastErr = err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("Batch check failed.");
  }

  async function runChecks(domainsToCheck: string[]) {
    setChecking(true);
    setError(null);
    setProgress({ done: 0, total: domainsToCheck.length });

    const results = new Map(domainResults);
    const stillFailed: string[] = [];
    let failedBatchCount = 0;

    for (let i = 0; i < domainsToCheck.length; i += BATCH_SIZE) {
      const batch = domainsToCheck.slice(i, i + BATCH_SIZE);
      try {
        const batchResults = await checkBatch(batch);
        for (const r of batchResults) {
          results.set(r.domain, { status: r.status, score: r.score, summary: r.summary });
        }
      } catch (err) {
        // Keep going — a batch-level failure (timeout, network hiccup)
        // shouldn't lose progress already made. Those domains are tracked
        // separately so they're visible and retryable, not silently lost.
        failedBatchCount++;
        stillFailed.push(...batch);
        setError(err instanceof Error ? err.message : "Some batches failed — see unresolved rows below.");
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, domainsToCheck.length), total: domainsToCheck.length });
      setDomainResults(new Map(results));
    }

    setFailedDomains(stillFailed);
    setBatchesFailed((prev) => (domainsToCheck.length === uniqueDomains.length ? failedBatchCount : prev + failedBatchCount));
    setChecking(false);
  }

  async function handleStartCheck() {
    if (uniqueDomains.length === 0) return;
    setFailedDomains([]);
    setBatchesFailed(0);
    await runChecks(uniqueDomains);
  }

  async function handleRetryFailed() {
    if (failedDomains.length === 0) return;
    const toRetry = failedDomains;
    setFailedDomains([]);
    await runChecks(toRetry);
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

  const noWebsiteRows = useMemo(
    () => rowResults.filter((r) => r.result && NO_WEBSITE_STATUSES.has(r.result.status)),
    [rowResults]
  );

  const brokenOrWeakRows = useMemo(
    () => rowResults.filter((r) => r.result && BROKEN_OR_WEAK_STATUSES.has(r.result.status)),
    [rowResults]
  );

  const visibleRows =
    tableFilter === "no_website" ? noWebsiteRows : tableFilter === "broken_or_weak" ? brokenOrWeakRows : worthReachingOutRows;

  function exportRowsAsCsv(exportRows: typeof rowResults, filenamePrefix: string) {
    if (!columns) return;
    const exportHeaders = [...headers, "website_status", "website_status_summary"];
    const csvRows = exportRows.map(({ row, result }) => ({
      ...row,
      website_status: result?.status ?? "",
      website_status_summary: result?.summary ?? "",
    }));
    const csv = objectsToCsv(exportHeaders, csvRows);
    downloadCsv(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
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

      {saveWarning && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{saveWarning}</div>
      )}

      {restored && (
        <div className="mt-4 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span>Restored your last checked file automatically.</span>
          <button type="button" onClick={handleClearSaved} className="text-xs font-medium underline hover:no-underline">
            Clear and start over
          </button>
        </div>
      )}

      {checking && (
        <p className="mt-4 text-xs text-amber-600">
          Checking is in progress — results are being saved automatically as they come in, but please
          don&apos;t close or refresh mid-batch.
        </p>
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
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">
                Checked {progress.done} of {progress.total} unique websites
                {checking ? " — still going…" : "."}
              </p>
            </>
          )}

          {!checking && failedDomains.length > 0 && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>
                {batchesFailed > 0 ? `${batchesFailed} batch${batchesFailed === 1 ? "" : "es"} ` : ""}
                {failedDomains.length} website{failedDomains.length === 1 ? "" : "s"} couldn&apos;t be
                checked after {MAX_BATCH_RETRIES + 1} attempts each.
              </span>
              <button
                type="button"
                onClick={handleRetryFailed}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                Retry {failedDomains.length} failed
              </button>
            </div>
          )}

          {(domainResults.size > 0 || rowResults.some((r) => r.domain === null)) && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="No website" value={noWebsiteRows.length} tone="green" />
                <SummaryCard label="Broken / weak website" value={brokenOrWeakRows.length} tone="green" />
                <SummaryCard label="Not worth it (average/strong site)" value={summary.notWorthIt} tone="slate" />
                <SummaryCard label="Not yet checked" value={summary.unresolved} tone="amber" />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-700">Export for outreach — split by messaging</p>
                <p className="mt-1 text-xs text-slate-500">
                  Different pitch for each: no website needs a first site, a broken/weak one needs a
                  rebuild. Export separately so each goes into its own campaign.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportRowsAsCsv(noWebsiteRows, "no-website")}
                    disabled={noWebsiteRows.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export &quot;No website&quot; ({noWebsiteRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => exportRowsAsCsv(brokenOrWeakRows, "broken-or-weak-website")}
                    disabled={brokenOrWeakRows.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export &quot;Broken/weak website&quot; ({brokenOrWeakRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => exportRowsAsCsv(worthReachingOutRows, "worth-reaching-out-all")}
                    disabled={worthReachingOutRows.length === 0}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export all combined ({worthReachingOutRows.length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Show in table:</span>
                {(
                  [
                    { key: "all", label: `All (${worthReachingOutRows.length})` },
                    { key: "no_website", label: `No website (${noWebsiteRows.length})` },
                    { key: "broken_or_weak", label: `Broken/weak (${brokenOrWeakRows.length})` },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTableFilter(opt.key)}
                    className={`rounded-full px-3 py-1 font-medium ${
                      tableFilter === opt.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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
                    {visibleRows.map(({ row, domain, result }, i) => (
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
