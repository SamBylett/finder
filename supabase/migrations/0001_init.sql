-- UK Local Opportunity Finder — initial schema
-- Businesses discovered, analysed, and scored as web-design/digital-presence
-- upsell prospects.

create table if not exists businesses (
  -- Provider-native id (Google Place ID, mock provider id, etc.) — not a
  -- generated uuid, since we want ON CONFLICT upserts keyed on the same
  -- identity the search provider returns.
  id text primary key,

  business_name text not null,
  category text not null,
  address text not null,
  town_city text not null,
  postcode text not null,

  phone text,
  website_url text,
  google_maps_url text,

  google_rating numeric(2, 1) check (google_rating is null or (google_rating >= 0 and google_rating <= 5)),
  google_review_count integer not null default 0 check (google_review_count >= 0),

  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,

  email text,
  facebook_url text,
  instagram_url text,

  website_status text not null default 'not_analysed'
    check (website_status in (
      'no_website',
      'social_only',
      'broken_website',
      'weak_website',
      'average_website',
      'strong_website',
      'not_analysed'
    )),

  website_score integer check (website_score is null or (website_score >= 0 and website_score <= 100)),

  opportunity_score integer not null default 0
    check (opportunity_score >= 0 and opportunity_score <= 100),

  opportunity_tier text not null default 'LOW PRIORITY'
    check (opportunity_tier in ('HOT', 'OPPORTUNITY', 'LOW PRIORITY')),

  analysis_summary text not null default '',
  detected_issues jsonb not null default '[]'::jsonb,
  score_breakdown jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  -- Bumped on every upsert (re-discovery/re-analysis); created_at is left
  -- untouched so it always reflects when a business was first seen.
  updated_at timestamptz not null default now()
);

create index if not exists businesses_opportunity_score_idx on businesses (opportunity_score desc);
create index if not exists businesses_opportunity_tier_idx on businesses (opportunity_tier);
create index if not exists businesses_google_review_count_idx on businesses (google_review_count desc);
create index if not exists businesses_town_city_idx on businesses (town_city);
create index if not exists businesses_category_idx on businesses (category);

comment on table businesses is
  'Local service businesses discovered as digital-presence upsell prospects: strong Google reputation, weak/absent website.';
comment on column businesses.detected_issues is
  'Array of {code, label, severity} objects describing specific website/presence issues found during analysis.';
comment on column businesses.score_breakdown is
  'Array of {label, points} objects explaining how the opportunity_score was assembled.';
