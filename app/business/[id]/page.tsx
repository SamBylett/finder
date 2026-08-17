"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Business } from "@/lib/types";
import type { ScoreBreakdownLine } from "@/lib/scoring";
import type { Demo } from "@/lib/demo/types";
import { tierBadgeClasses, websiteStatusBadgeClasses, websiteStatusLabel, severityClasses, demoPotentialBadgeClasses } from "@/lib/ui";
import { DemoActions } from "@/components/DemoActions";

interface DetailResponse {
  business: Business;
  breakdown: ScoreBreakdownLine[];
  demo: Demo | null;
}

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading/error at the start of each params.id-driven fetch is intentional
    setLoading(true);
    setError(null);
    fetch(`/api/business/${params.id}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load business.");
        return json as DetailResponse;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
        ← Back to results
      </Link>

      {loading && <div className="mt-6 text-slate-500">Loading…</div>}

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && <BusinessDetail business={data.business} breakdown={data.breakdown} demo={data.demo} />}
    </main>
  );
}

function BusinessDetail({ business, breakdown, demo }: { business: Business; breakdown: ScoreBreakdownLine[]; demo: Demo | null }) {
  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{business.business_name}</h1>
          <p className="text-sm text-slate-500">{business.category}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tierBadgeClasses(business.opportunity_tier)}`}>
            {business.opportunity_tier}
          </span>
          <span className="text-2xl font-bold text-slate-900">{business.opportunity_score}/100</span>
        </div>
      </div>

      <Section title="Business details">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Address" value={`${business.address}, ${business.town_city}, ${business.postcode}`} />
          <Field label="Phone" value={business.phone ?? "—"} />
          <Field label="Email" value={business.email ?? "—"} />
          <Field
            label="Website"
            value={
              business.website_url ? (
                <a href={business.website_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {business.website_url}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Facebook"
            value={
              business.facebook_url ? (
                <a href={business.facebook_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {business.facebook_url}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Instagram"
            value={
              business.instagram_url ? (
                <a href={business.instagram_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {business.instagram_url}
                </a>
              ) : (
                "—"
              )
            }
          />
        </dl>
      </Section>

      <Section title="Google reputation">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Rating" value={business.google_rating !== null ? `${business.google_rating.toFixed(1)} / 5` : "—"} />
          <Field label="Review count" value={String(business.google_review_count)} />
          <Field
            label="Google Maps"
            value={
              business.google_maps_url ? (
                <a href={business.google_maps_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  View on Google Maps
                </a>
              ) : (
                "—"
              )
            }
          />
        </dl>
      </Section>

      <Section title="Website status">
        <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${websiteStatusBadgeClasses(business.website_status)}`}>
          {websiteStatusLabel(business.website_status)}
        </span>
        {business.website_score !== null && (
          <p className="mt-2 text-sm text-slate-600">Website quality score: {business.website_score}/100</p>
        )}
        <p className="mt-2 text-sm text-slate-700">{business.analysis_summary}</p>
      </Section>

      <Section title="Detected issues">
        {business.detected_issues.length === 0 ? (
          <p className="text-sm text-slate-500">No issues detected.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {business.detected_issues.map((issue) => (
              <li key={issue.code} className={`rounded-full px-3 py-1 text-xs font-medium ${severityClasses(issue.severity)}`}>
                {issue.label}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Demo potential">
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${demoPotentialBadgeClasses(business.demo_potential_tier)}`}>
            {business.demo_potential_tier}
          </span>
          <span className="text-lg font-bold text-slate-900">{business.demo_potential_score}/100</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          How suitable this business is for a visually impressive speculative demo site — separate from its Opportunity Score.
        </p>
        <div className="mt-4">
          <DemoActions business={business} demo={demo} />
        </div>
      </Section>

      <Section title="Score breakdown">
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No score-contributing factors.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {breakdown.map((line, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-slate-700">{line.label}</span>
                <span className="font-semibold text-slate-900">+{line.points}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}
