// Public, chrome-free demo route. No admin nav, no scoring, no internal
// notes — reads purely from Supabase-backed storage and renders through the
// shared component library. No AI calls, no external lookups at view time.

import { notFound } from "next/navigation";
import { getDemoBySlug, getDemoAssets, getDemoReviews } from "@/lib/demo/store";
import { DemoSiteRenderer } from "@/components/demo-site/DemoSiteRenderer";
import type { DemoRenderContext } from "@/lib/demo/render-context";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = await getDemoBySlug(slug);
  if (!demo?.website_copy) return {};
  return { title: demo.website_copy.seo_title, description: demo.website_copy.seo_description };
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = await getDemoBySlug(slug);

  if (!demo || !demo.sharing_enabled) notFound();
  if (!demo.business_profile || !demo.website_copy || !demo.website_strategy || !demo.site_director_config) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-xl font-semibold text-slate-900">This demo isn&apos;t ready yet</h1>
        <p className="mt-2 text-sm text-slate-500">Check back shortly.</p>
      </main>
    );
  }

  const [allAssets, reviews] = await Promise.all([getDemoAssets(demo.id), getDemoReviews(demo.id)]);

  const ctx: DemoRenderContext = {
    profile: demo.business_profile,
    copy: demo.website_copy,
    strategy: demo.website_strategy,
    assets: allAssets.filter((a) => a.selected),
    reviews,
    config: demo.site_director_config,
  };

  return (
    <DemoSiteRenderer
      ctx={ctx}
      theme={demo.theme_override ?? demo.site_director_config.theme}
      palette={demo.palette_override ?? demo.site_director_config.palette}
      showBanner={demo.show_demo_banner && demo.status !== "CONVERTED"}
    />
  );
}
