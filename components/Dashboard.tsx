"use client";

import { useEffect, useState } from "react";
import type { SearchParams, SearchResponse } from "@/lib/types";
import SearchForm from "@/components/SearchForm";
import SummaryCards from "@/components/SummaryCards";
import ResultsTable from "@/components/ResultsTable";

export default function Dashboard() {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Repopulate from persisted results on load (Supabase-backed, or
  // in-memory for the lifetime of the dev server) so a refresh doesn't wipe
  // the table.
  useEffect(() => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
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
          <SummaryCards summary={data.summary} />
          <ResultsTable results={data.results} />
        </>
      )}
    </div>
  );
}
