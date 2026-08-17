"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Demo, DemoAsset, ThemeId, PaletteId } from "@/lib/demo/types";
import type { RegenerateStage } from "@/lib/demo/generate";

interface LoadedState {
  demo: Demo;
  assets: DemoAsset[];
}

const THEME_OPTIONS: ThemeId[] = ["clean-light", "premium-dark", "bold-local", "natural"];
const PALETTE_OPTIONS: PaletteId[] = ["slate-blue", "charcoal-gold", "forest-neutral", "navy-sand", "graphite-orange"];

export default function DemoEditPage() {
  const params = useParams<{ demoId: string }>();
  const [state, setState] = useState<LoadedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState<RegenerateStage | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/demos/${params.demoId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to load demo.");
      setState(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load resets loading/error state as part of its params.demoId-driven fetch
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable for a given demoId; including it would re-run this effect every render
  }, [params.demoId]);

  async function save() {
    if (!state) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/demos/${params.demoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_profile: state.demo.business_profile,
          website_copy: state.demo.website_copy,
          site_director_config: state.demo.site_director_config,
          sharing_enabled: state.demo.sharing_enabled,
          show_demo_banner: state.demo.show_demo_banner,
          theme_override: state.demo.theme_override,
          palette_override: state.demo.palette_override,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save.");
      setState((s) => (s ? { ...s, demo: body.demo } : s));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(stage: RegenerateStage) {
    setRegenerating(stage);
    setError(null);
    try {
      const res = await fetch(`/api/demos/${params.demoId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Regeneration failed.");
      setState((s) => (s ? { ...s, demo: body.demo } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRegenerating(null);
    }
  }

  async function toggleAsset(assetId: string, selected: boolean) {
    if (!state) return;
    const res = await fetch(`/api/demos/${params.demoId}/assets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_id: assetId, selected }),
    });
    const body = await res.json();
    if (res.ok) setState((s) => (s ? { ...s, assets: body.assets } : s));
  }

  function updateDemo(patch: Partial<Demo>) {
    setState((s) => (s ? { ...s, demo: { ...s.demo, ...patch } } : s));
  }

  if (loading) return <main className="mx-auto max-w-4xl px-4 py-8 text-slate-500">Loading…</main>;
  if (error && !state) return <main className="mx-auto max-w-4xl px-4 py-8 text-red-600">{error}</main>;
  if (!state) return null;

  const { demo, assets } = state;
  const copy = demo.website_copy;
  const config = demo.site_director_config;
  const profile = demo.business_profile;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/business/${demo.business_id}`} className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to business
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Edit demo</h1>
          <p className="text-sm text-slate-500">Status: {demo.status}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/demo/${demo.slug}`} target="_blank" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400">
            Open Preview
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Section title="Sharing">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={demo.sharing_enabled} onChange={(e) => updateDemo({ sharing_enabled: e.target.checked })} />
          Sharing enabled (demo is publicly viewable at its URL)
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={demo.show_demo_banner} onChange={(e) => updateDemo({ show_demo_banner: e.target.checked })} />
          Show &quot;concept prepared for&quot; banner
        </label>
      </Section>

      <Section title="Theme &amp; palette">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Theme"
            value={demo.theme_override ?? config?.theme ?? "clean-light"}
            options={THEME_OPTIONS}
            onChange={(v) => updateDemo({ theme_override: v as ThemeId })}
          />
          <Select
            label="Palette"
            value={demo.palette_override ?? config?.palette ?? "slate-blue"}
            options={PALETTE_OPTIONS}
            onChange={(v) => updateDemo({ palette_override: v as PaletteId })}
          />
        </div>
      </Section>

      {profile && (
        <Section title="Contact details">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Phone"
              value={profile.phone.value ?? ""}
              onChange={(v) =>
                updateDemo({ business_profile: { ...profile, phone: { value: v || null, status: v ? "CONFIRMED" : "UNKNOWN", source: v ? profile.phone.source ?? "manual" : null } } })
              }
            />
            <TextField
              label="Email"
              value={profile.email.value ?? ""}
              onChange={(v) =>
                updateDemo({ business_profile: { ...profile, email: { value: v || null, status: v ? "CONFIRMED" : "UNKNOWN", source: v ? profile.email.source ?? "manual" : null } } })
              }
            />
          </div>
          <TextField
            label="Service areas (comma separated)"
            value={profile.service_areas.join(", ")}
            onChange={(v) => updateDemo({ business_profile: { ...profile, service_areas: v.split(",").map((s) => s.trim()).filter(Boolean) } })}
          />
        </Section>
      )}

      {copy && (
        <Section
          title="Hero"
          action={<RegenerateButton stage="strategy" label="Regenerate Strategy" regenerating={regenerating} onClick={regenerate} />}
        >
          <TextField label="Eyebrow" value={copy.hero_eyebrow ?? ""} onChange={(v) => updateDemo({ website_copy: { ...copy, hero_eyebrow: v || null } })} />
          <TextField label="Headline" value={copy.hero_headline} onChange={(v) => updateDemo({ website_copy: { ...copy, hero_headline: v } })} />
          <TextAreaField label="Supporting text" value={copy.hero_supporting_text} onChange={(v) => updateDemo({ website_copy: { ...copy, hero_supporting_text: v } })} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Primary CTA" value={copy.primary_cta} onChange={(v) => updateDemo({ website_copy: { ...copy, primary_cta: v } })} />
            <TextField label="Secondary CTA" value={copy.secondary_cta ?? ""} onChange={(v) => updateDemo({ website_copy: { ...copy, secondary_cta: v || null } })} />
          </div>
        </Section>
      )}

      {copy && (
        <Section
          title="Services"
          action={<RegenerateButton stage="copy" label="Regenerate Copy" regenerating={regenerating} onClick={regenerate} />}
        >
          <TextAreaField label="Intro" value={copy.services_intro} onChange={(v) => updateDemo({ website_copy: { ...copy, services_intro: v } })} />
          <div className="space-y-3">
            {copy.service_cards.map((card, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <TextField label="Name" value={card.name} onChange={(v) => {
                    const next = [...copy.service_cards]; next[i] = { ...card, name: v };
                    updateDemo({ website_copy: { ...copy, service_cards: next } });
                  }} />
                  <button
                    type="button"
                    onClick={() => updateDemo({ website_copy: { ...copy, service_cards: copy.service_cards.filter((_, j) => j !== i) } })}
                    className="mt-5 shrink-0 text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <TextAreaField label="Description" value={card.description} onChange={(v) => {
                  const next = [...copy.service_cards]; next[i] = { ...card, description: v };
                  updateDemo({ website_copy: { ...copy, service_cards: next } });
                }} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateDemo({ website_copy: { ...copy, service_cards: [...copy.service_cards, { name: "", description: "" }] } })}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            + Add service
          </button>
        </Section>
      )}

      {copy && (
        <Section title="About">
          <TextAreaField label="About text" value={copy.about} onChange={(v) => updateDemo({ website_copy: { ...copy, about: v } })} />
          <TextField
            label="Why choose us (one per line)"
            value={copy.why_choose_us.join("\n")}
            multiline
            onChange={(v) => updateDemo({ website_copy: { ...copy, why_choose_us: v.split("\n").map((s) => s.trim()).filter(Boolean) } })}
          />
        </Section>
      )}

      {copy && (
        <Section title="FAQ">
          <div className="space-y-3">
            {copy.faq.map((item, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <TextField label="Question" value={item.question} onChange={(v) => {
                    const next = [...copy.faq]; next[i] = { ...item, question: v };
                    updateDemo({ website_copy: { ...copy, faq: next } });
                  }} />
                  <button
                    type="button"
                    onClick={() => updateDemo({ website_copy: { ...copy, faq: copy.faq.filter((_, j) => j !== i) } })}
                    className="mt-5 shrink-0 text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <TextAreaField label="Answer" value={item.answer} onChange={(v) => {
                  const next = [...copy.faq]; next[i] = { ...item, answer: v };
                  updateDemo({ website_copy: { ...copy, faq: next } });
                }} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateDemo({ website_copy: { ...copy, faq: [...copy.faq, { question: "", answer: "" }] } })}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            + Add FAQ item
          </button>
        </Section>
      )}

      {config && (
        <Section
          title="Sections"
          action={<RegenerateButton stage="director" label="Re-run Site Director" regenerating={regenerating} onClick={regenerate} />}
        >
          <div className="space-y-2">
            {config.sections.map((section, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{section.type}</span>
                <span className="text-slate-500">{section.variant}</span>
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...config.sections];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      updateDemo({ site_director_config: { ...config, sections: next } });
                    }}
                    className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === config.sections.length - 1}
                    onClick={() => {
                      const next = [...config.sections];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      updateDemo({ site_director_config: { ...config, sections: next } });
                    }}
                    className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDemo({ site_director_config: { ...config, sections: config.sections.filter((_, j) => j !== i) } })}
                    className="rounded border border-slate-300 px-2 py-0.5 text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Section types come from the approved component library — new sections can&apos;t be freeform added here in V2.0.</p>
        </Section>
      )}

      {assets.length > 0 && (
        <Section title="Images">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {assets.map((asset) => (
              <label key={asset.id} className="relative block cursor-pointer overflow-hidden rounded-md border border-slate-200">
                {asset.placeholder ? (
                  <div className="flex aspect-square items-center justify-center bg-slate-200 text-xs text-slate-500">Placeholder</div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
                )}
                <input
                  type="checkbox"
                  checked={asset.selected}
                  onChange={(e) => toggleAsset(asset.id, e.target.checked)}
                  className="absolute right-1.5 top-1.5 h-4 w-4"
                />
              </label>
            ))}
          </div>
        </Section>
      )}
    </main>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="flex-1">
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
      )}
    </div>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm">
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function RegenerateButton({
  stage, label, regenerating, onClick,
}: { stage: RegenerateStage; label: string; regenerating: RegenerateStage | null; onClick: (stage: RegenerateStage) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(stage)}
      disabled={regenerating !== null}
      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 disabled:opacity-50"
    >
      {regenerating === stage ? "Regenerating…" : label}
    </button>
  );
}
