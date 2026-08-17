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

## Scope

V1 covers discovery, website analysis, scoring, and display only. Outreach automation, CRM functionality, an AI receptionist, and website demo generation are explicitly out of scope for now.
