"use client";

import { useState } from "react";
import type { SearchParams } from "@/lib/types";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [keyword, setKeyword] = useState("roofers");
  const [location, setLocation] = useState("Portsmouth");
  const [radiusMiles, setRadiusMiles] = useState(15);
  const [minReviews, setMinReviews] = useState(0);
  const [maxResults, setMaxResults] = useState(20);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({ keyword, location, radiusMiles, minReviews, maxResults });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end"
    >
      <div className="lg:col-span-2">
        <label htmlFor="keyword" className="block text-sm font-medium text-slate-700">
          Business type / keyword
        </label>
        <input
          id="keyword"
          type="text"
          required
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. roofers"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="lg:col-span-2">
        <label htmlFor="location" className="block text-sm font-medium text-slate-700">
          Location
        </label>
        <input
          id="location"
          type="text"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Portsmouth"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="radius" className="block text-sm font-medium text-slate-700">
          Radius (miles)
        </label>
        <input
          id="radius"
          type="number"
          min={1}
          max={200}
          value={radiusMiles}
          onChange={(e) => setRadiusMiles(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="minReviews" className="block text-sm font-medium text-slate-700">
          Min. reviews
        </label>
        <input
          id="minReviews"
          type="number"
          min={0}
          value={minReviews}
          onChange={(e) => setMinReviews(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="maxResults" className="block text-sm font-medium text-slate-700">
          Max results
        </label>
        <input
          id="maxResults"
          type="number"
          min={1}
          max={100}
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-6">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Finding opportunities…" : "Find Opportunities"}
        </button>
      </div>
    </form>
  );
}
