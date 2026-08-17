# UK Local Opportunity Finder

Finds UK local service businesses (roofers, plumbers, landscapers, etc.) with strong Google reviews but a weak digital presence — no website, Facebook-only, outdated site, no booking/quote form, weak CTA. Discovers businesses, analyses their websites, scores them as web-design/digital-presence upsell prospects, and displays ranked results.

**Live app:** https://uk-local-opportunity-finder.vercel.app

## How it works

1. Enter a business type/keyword, location, radius, min. review count, and max results.
2. **Discovery** — finds nearby businesses via the Google Places API (New).
3. **Website analysis** — for each business with a website, fetches the homepage plus up to two likely subpages (contact, quote/booking) and runs objective checks (HTTPS, mobile-responsive, CTA, contact/quote form, online booking, live chat, testimonials, broken links, outdated copyright, etc.), plus an AI-assisted qualitative read via Claude.
4. **Contact extraction** — pulls email and social links straight off the site when the search provider doesn't return them.
5. **Scoring** — deterministic point-based scoring (website weakness + business quality + contactability), normalised 0–100, tiered HOT / OPPORTUNITY / LOW PRIORITY.
6. **Persistence** — results are upserted into Supabase (latest-known-state per business) so they survive a refresh or restart.
7. **Export** — filtered/sorted results can be exported to CSV for outreach.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase + Google Places API + Claude (Anthropic API).

## Local setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) project with **Places API (New)** enabled
- An [Anthropic](https://console.anthropic.com) API key (optional — AI design assessment only)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | For real search | Without it, business search falls back to a mock provider with sample data — the app still runs with zero setup. |
| `NEXT_PUBLIC_SUPABASE_URL` | For persistence | Without it, results are held in memory for the life of the server process instead of Postgres. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For persistence | |
| `SUPABASE_SERVICE_ROLE_KEY` | For persistence | Server-side only — used for all reads/writes. Never expose this to the client. |
| `ANTHROPIC_API_KEY` | For AI design assessment | Without it, the subjective assessment stays a stub — objective checks and scoring still run fully. |
| `WEBSITE_ANALYZER` | No | Set to `mock` to force the fast deterministic mock analyzer instead of live fetch+cheerio analysis. |
| `AI_ASSESSMENT_MAX_PER_SEARCH` | No | Caps real Claude API calls per search (default 15) to keep cost predictable. |

### 3. Set up the database (if using Supabase)

In your Supabase project's **SQL Editor**, run the migration:

```
supabase/migrations/0001_init.sql
```

This creates the `businesses` table with indexes on opportunity score, tier, review count, town, and category.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the next available port).

## Architecture notes

- **`lib/providers/business-search/`** — `BusinessSearchProvider` interface with `MockBusinessSearchProvider` (sample data) and `GooglePlacesProvider` (real). Swap in another provider (e.g. Apify) without touching call sites.
- **`lib/website-analyzer/`** — `WebsiteAnalyzer` interface with `MockWebsiteAnalyzer` and `LiveWebsiteAnalyzer` (fetch + cheerio + optional Claude assessment). Objective checks are separated from the AI-assisted subjective read.
- **`lib/scoring.ts`** — pure, deterministic scoring functions — no I/O, easy to retune.
- **`lib/pipeline.ts`** — orchestrates discovery → analysis → scoring → ranking, with bounded concurrency (`WEBSITE_ANALYSIS_CONCURRENCY`, default 8) so large searches don't fire unbounded simultaneous requests.
- **`lib/store.ts`** — persistence layer; upserts to Supabase when configured, falls back to an in-memory cache otherwise.

## Deployment

Deployed on [Vercel](https://vercel.com). Environment variables are set via `vercel env add` (or the dashboard) — never commit `.env`. `.vercelignore` excludes local env files from the deployment source.

```bash
vercel --prod
```

## V2 — speculative demo websites

For a HOT/high-potential prospect, "Build Demo" generates a polished, speculative website from real business data and publishes it at a permanent `ourdomain.com/demo/[slug]` URL — no per-business deployment, no external website-generation platform. Research into Framer/Wix/Lovable/Emergent.sh concluded none of them offer genuine unattended automation or a client-handover path (see project history) — V2 is a custom Next.js template engine instead.

**Flow:** business detail page → "Build Demo" → `lib/demo/generate.ts` orchestrates profile → Demo Potential score → assets → AI strategy → AI copy → AI Site Director → persisted to Supabase → rendered at `/demo/[slug]`.

- **`lib/demo/profile.ts`** — builds a `DemoBusinessProfile` from data already on the `Business` record. Every fact is tagged `CONFIRMED`/`INFERRED`/`UNKNOWN` with a source; nothing is ever invented (years of experience, certifications, guarantees, prices, testimonial quotes, etc. are omitted, not guessed).
- **`lib/demo/potential.ts`** — deterministic Demo Potential score (0–100, separate from Opportunity Score), computed for every search result so it's sortable/filterable immediately, no AI cost.
- **`lib/demo/industry.ts`** — maps Google's category + business name to one of `trades` / `outdoor` / `professional` / `automotive` / `generic_local_service`.
- **`lib/demo/assets.ts`** + **`app/api/places-photo/route.ts`** — real Google Places photos when available (fetched only at Build Demo time, not during search), proxied server-side so `GOOGLE_PLACES_API_KEY` never reaches the browser; clearly-marked placeholder imagery otherwise.
- **`lib/demo/strategy.ts`, `copy.ts`, `director.ts`** — three separate, explicit Claude calls (Sonnet 5, structured JSON schema output). The Site Director never writes code — it only picks a theme/palette/section-variant combination from approved enums (`lib/demo/types.ts`); an invalid or unavailable response falls back to a deterministic per-industry config (`lib/demo/fallback-config.ts`), so rendering never depends entirely on AI.
- **`components/demo-site/`** — the rendered component library (nav/hero/trust-bar/services/gallery/about/reviews/service-areas/faq/cta/contact/footer), theme-driven via CSS custom properties rather than dynamically-built Tailwind classes (which would get purged in production).
- AI calls are never triggered by a page view or an edit — only by explicit "Build Demo" / "Regenerate Strategy" / "Regenerate Copy" / "Re-run Site Director" actions.

**New routes:** `/demo/[slug]` (public, chrome-free), `/demos/[demoId]/edit` (structured admin editor), `/api/demos`, `/api/demos/[demoId]`, `/api/demos/[demoId]/regenerate`, `/api/demos/[demoId]/assets`, `/api/places-photo`.

**New Supabase tables:** run `supabase/migrations/0002_demos.sql` after `0001_init.sql` — adds `demo_potential_score`/`demo_potential_tier` to `businesses`, plus `demos`, `demo_assets`, `demo_reviews`, `demo_versions` (a lightweight snapshot-on-regenerate, not full version control).

**Known limitations:**
- No auth on any route, including the demo editor/regenerate endpoints — consistent with the rest of the app's existing single-local-user model (no login anywhere), not a V2-specific gap.
- `demo_reviews` is always empty in V2.0 — no per-review text is fetched (would need a separate paid Places Details call); the reviews section is simply omitted and the trust bar shows the aggregate Google rating instead, rather than fabricating testimonial quotes.
- The demo contact form never sends a real enquiry (shows "Demo form — this would send an enquiry once the site is live" instead) — see `components/demo-site/DemoContactForm.tsx`.
- Client handover (`CONVERTED` status, custom domain, real contact form) is scaffolded (fields exist) but not fully wired up — deliberately out of scope for V2.0 per spec.

**Suggested V2.1:** real Place Details review import into `demo_reviews`; drag-and-drop section reordering in the editor (currently up/down buttons); wiring `custom_domain` to Vercel's domain API for actual client handover; a split edit/preview layout instead of separate Edit/Open Preview routes.

## Scope

V1 covers discovery, website analysis, scoring, and display. V2 adds speculative demo website generation (above). Outreach automation, CRM functionality, an AI receptionist, real client contact forms, and billing are explicitly out of scope for now.
