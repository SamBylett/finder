"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Business, ContactRoute } from "@/lib/types";
import type { ScoreBreakdownLine } from "@/lib/scoring";
import type { Demo } from "@/lib/demo/types";
import { tierBadgeClasses, websiteStatusBadgeClasses, websiteStatusLabel, severityClasses, demoPotentialBadgeClasses, outreachTierBadgeClasses, priorityBadgeClasses } from "@/lib/ui";
import { DemoActions } from "@/components/DemoActions";
import { EnrichContactButton } from "@/components/EnrichContactButton";
import { DemoPrepPanel } from "@/components/DemoPrepPanel";
import { OutreachPanel } from "@/components/OutreachPanel";
import { computeOutreachReadiness } from "@/lib/outreach";
import { calculateProspectPriority } from "@/lib/prospect-priority";

interface DetailResponse {
  business: Business;
  breakdown: ScoreBreakdownLine[];
  demo: Demo | null;
  contactRoutes: ContactRoute[];
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

      {data && !loading && (
        <BusinessDetail
          business={data.business}
          breakdown={data.breakdown}
          demo={data.demo}
          contactRoutes={data.contactRoutes}
          onDemoUpdated={(demo) => setData((d) => (d ? { ...d, demo } : d))}
          onEnriched={() => {
            if (!params.id) return;
            fetch(`/api/business/${params.id}`)
              .then((res) => res.json())
              .then((json: DetailResponse) => setData(json))
              .catch(() => {});
          }}
        />
      )}
    </main>
  );
}

function BusinessDetail({
  business, breakdown, demo, contactRoutes, onDemoUpdated, onEnriched,
}: {
  business: Business;
  breakdown: ScoreBreakdownLine[];
  demo: Demo | null;
  contactRoutes: ContactRoute[];
  onDemoUpdated: (demo: Demo) => void;
  onEnriched: () => void;
}) {
  const priority = calculateProspectPriority(business, demo?.business_profile?.data_richness_score);
  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{business.business_name}</h1>
          <p className="text-sm text-slate-500">{business.category}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${priorityBadgeClasses(priority.score)}`}
            title={priority.breakdown.map((l) => `${l.label}: ${l.value}`).join("\n")}
          >
            Priority {priority.score}
          </span>
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

      <ContactRoutesSection business={business} contactRoutes={contactRoutes} onEnriched={onEnriched} />

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

      <Section title="Demo Prep — Lovable Brief">
        <DemoPrepPanel businessId={business.id} demo={demo} onUpdated={onDemoUpdated} />
      </Section>

      <Section title="Outreach">
        <OutreachPanel businessId={business.id} business={business} demo={demo} onUpdated={onDemoUpdated} />
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

// Answers one question the Opportunity Score deliberately no longer does
// (see lib/outreach.ts): can this business be reached through channels
// actually used for outreach — never phone calls, mobile is only ever a
// WhatsApp CANDIDATE, not confirmed WhatsApp.
function ContactRoutesSection({
  business, contactRoutes, onEnriched,
}: {
  business: Business;
  contactRoutes: ContactRoute[];
  onEnriched: () => void;
}) {
  const outreach = computeOutreachReadiness(business, contactRoutes);
  const { channels } = outreach;

  return (
    <Section title="Contact routes">
      <div className="mb-3 flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${outreachTierBadgeClasses(outreach.tier)}`}>
          {outreach.tier}
        </span>
        <span className="text-xs text-slate-500">
          {outreach.strongRouteCount} usable route{outreach.strongRouteCount === 1 ? "" : "s"} found
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Email" value={channels.email ? `FOUND — ${business.email}` : "NOT FOUND"} />
        <Field
          label="Mobile"
          value={channels.mobile ? `FOUND — ${business.phone} (WhatsApp candidate)` : business.phone_type === "landline" ? "Landline only" : "NOT FOUND"}
        />
        <Field label="Landline" value={channels.landline ? `FOUND — ${business.phone}` : "NOT FOUND"} />
        <Field
          label="Facebook"
          value={channels.facebook ? (
            <a href={business.facebook_url!} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">FOUND</a>
          ) : "NOT FOUND"}
        />
        <Field
          label="Instagram"
          value={channels.instagram ? (
            <a href={business.instagram_url!} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">FOUND</a>
          ) : "NOT FOUND"}
        />
        <Field
          label="LinkedIn"
          value={channels.linkedin ? (
            <a href={business.linkedin_url!} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">FOUND</a>
          ) : "NOT FOUND"}
        />
      </dl>
      <ul className="mt-3 space-y-1">
        {outreach.reasons.map((r, i) => (
          <li key={i} className="text-xs text-slate-500">{r}</li>
        ))}
      </ul>
      {contactRoutes.length > 0 && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Discovered routes</h3>
          <ul className="space-y-1">
            {contactRoutes.map((route) => (
              <li key={route.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-800">{route.type}</span>
                <span>{route.value}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">{route.source}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-500">{route.confidence}</span>
                {route.verified && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-green-700">verified</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <EnrichContactButton businessId={business.id} onEnriched={onEnriched} />
    </Section>
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
