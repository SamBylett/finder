"use client";

import { useEffect, useState } from "react";
import type { SearchParams, SearchResponse } from "@/lib/types";
import SearchForm from "@/components/SearchForm";
import SummaryCards from "@/components/SummaryCards";
import ResultsTable from "@/components/ResultsTable";

// Persists the most recent search (params + results) for the lifetime of
// the browser tab, so clicking into a business and back returns to the
// search you actually ran, not the full unscoped list of every business
// ever searched. sessionStorage (not localStorage) is deliberate — "most
// recent search" should mean this session, not forever.
const LAST_SEARCH_KEY = "finder:lastSearch";

interface StoredSearch {
  params: SearchParams;
  data: SearchResponse;
}

export default function Dashboard() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearch, setLastSearch] = useState<StoredSearch | null>(null);
  const [viewingAll, setViewingAll] = useState(false);

  // On mount: restore the last search from this tab's session if we have
  // one — that's what "back to results" should show. Only fall back to the
  // unscoped "everything ever searched" view when there's genuinely no
  // recent search to return to (e.g. a brand new tab).
  useEffect(() => {
    const stored = sessionStorage.getItem(LAST_SEARCH_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredSearch;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restoration of the last search from this tab's sessionStorage on mount is intentional
        setLastSearch(parsed);
        setData(parsed.data);
        setHasSearched(true);
        return;
      } catch {
        // fall through to the all-results fallback below
      }
    }

    fetch("/api/search")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: SearchResponse | null) => {
        if (json && json.results.length > 0) {
          setData(json);
          setHasSearched(true);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSearch(params: SearchParams) {
    setLoading(true);
    setError(null);
    setViewingAll(false);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Search failed.");
      }
      const json: SearchResponse = await res.json();
      setData(json);
      setHasSearched(true);
      const stored: StoredSearch = { params, data: json };
      setLastSearch(stored);
      sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(stored));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search");
      if (!res.ok) throw new Error("Failed to load all results.");
      const json: SearchResponse = await res.json();
      setData(json);
      setViewingAll(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleBackToSearch() {
    if (!lastSearch) return;
    setData(lastSearch.data);
    setViewingAll(false);
  }

  return (
    <div className="space-y-6">
      <SearchForm onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!hasSearched && !loading && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          Run a search to find local businesses with strong reviews but a weak digital presence.
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          Searching, analysing websites, and scoring opportunities…
        </div>
      )}

      {data && !loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {viewingAll ? (
                <>Showing all {data.results.length} businesses ever searched.</>
              ) : lastSearch ? (
                <>
                  Showing results for <span className="font-medium text-slate-700">&quot;{lastSearch.params.keyword}&quot; in {lastSearch.params.location}</span> ({data.results.length} businesses).
                </>
              ) : (
                <>Showing {data.results.length} businesses.</>
              )}
            </p>
            {viewingAll ? (
              lastSearch && (
                <button
                  type="button"
                  onClick={handleBackToSearch}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  ← Back to &quot;{lastSearch.params.keyword}&quot; in {lastSearch.params.location}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handleViewAll}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                View all results →
              </button>
            )}
          </div>
          <SummaryCards summary={data.summary} />
          <ResultsTable results={data.results} />
        </>
      )}
    </div>
  );
}
