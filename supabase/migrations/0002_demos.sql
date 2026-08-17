-- V2 — speculative website demo generation.

-- Sortable/filterable in the results table without needing a demo built yet;
-- computed deterministically alongside opportunity_score in the pipeline.
alter table businesses add column if not exists demo_potential_score integer not null default 0
  check (demo_potential_score >= 0 and demo_potential_score <= 100);
alter table businesses add column if not exists demo_potential_tier text not null default 'LOW VALUE'
  check (demo_potential_tier in ('EXCELLENT DEMO', 'GOOD DEMO', 'POSSIBLE', 'LOW VALUE'));

create index if not exists businesses_demo_potential_score_idx on businesses (demo_potential_score desc);

create table if not exists demos (
  id uuid primary key,
  business_id text not null references businesses (id) on delete cascade,
  slug text not null unique,

  status text not null default 'NOT_STARTED'
    check (status in (
      'NOT_STARTED', 'COLLECTING_DATA', 'GENERATING', 'DRAFT',
      'READY_TO_SHARE', 'SHARED', 'CONVERTED', 'ARCHIVED', 'FAILED'
    )),

  sharing_enabled boolean not null default false,
  show_demo_banner boolean not null default true,

  demo_potential_score integer not null default 0
    check (demo_potential_score >= 0 and demo_potential_score <= 100),
  demo_potential_tier text not null default 'LOW VALUE'
    check (demo_potential_tier in ('EXCELLENT DEMO', 'GOOD DEMO', 'POSSIBLE', 'LOW VALUE')),

  business_profile jsonb,
  website_strategy jsonb,
  website_copy jsonb,
  site_director_config jsonb,

  theme_override text,
  palette_override text,

  custom_domain text,
  production_mode boolean not null default false,

  failure_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demos_business_id_idx on demos (business_id);
create index if not exists demos_slug_idx on demos (slug);
create index if not exists demos_status_idx on demos (status);

create table if not exists demo_assets (
  id text primary key,
  demo_id uuid not null references demos (id) on delete cascade,
  business_id text not null,
  type text not null
    check (type in ('logo', 'hero', 'project', 'gallery', 'team', 'location', 'social', 'placeholder')),
  url text not null,
  source_url text,
  source_provider text,
  business_owned boolean not null default false,
  placeholder boolean not null default false,
  width integer,
  height integer,
  selected boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists demo_assets_demo_id_idx on demo_assets (demo_id);

create table if not exists demo_reviews (
  id text primary key,
  demo_id uuid not null references demos (id) on delete cascade,
  reviewer_name text,
  rating numeric(2, 1),
  review_text text,
  review_date text,
  source text not null default 'google',
  source_url text
);

create index if not exists demo_reviews_demo_id_idx on demo_reviews (demo_id);

-- Lightweight snapshot-on-regenerate, not full version control — just
-- enough to avoid losing a working demo when strategy/copy/director output
-- is regenerated in place.
create table if not exists demo_versions (
  id bigint generated always as identity primary key,
  demo_id uuid not null references demos (id) on delete cascade,
  business_profile jsonb,
  website_strategy jsonb,
  website_copy jsonb,
  site_director_config jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demo_versions_demo_id_idx on demo_versions (demo_id);

comment on table demos is 'Speculative website demos generated for HOT/high-potential prospects, rendered at /demo/[slug].';
comment on table demo_assets is 'Images selected for a demo — business-owned (Google Places photos) or clearly-marked placeholders.';
comment on table demo_reviews is 'Structured real reviews for a demo, when we actually possess review text (empty by default in V2.0).';
comment on table demo_versions is 'Snapshot taken immediately before an in-place regenerate overwrites strategy/copy/director output.';
