-- V2.5 — Lovable demo-prep + outreach-copy workflow layer.
--
-- contact_routes is the provenance/audit-trail source of truth for
-- discovered contact info; businesses.email/phone/facebook_url/
-- instagram_url/linkedin_url stay as a denormalized "best known value per
-- type" cache resolved by source priority (see lib/contact-routes.ts), so
-- every existing call site (ResultsTable, CSV export, computeOutreachReadiness)
-- keeps working unmodified.

create table if not exists contact_routes (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references businesses (id) on delete cascade,
  type text not null
    check (type in ('EMAIL', 'MOBILE', 'LANDLINE', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'CONTACT_FORM', 'OTHER')),
  value text not null,
  normalized_value text,
  source text not null
    check (source in ('website', 'google_places', 'findymail', 'social_profile', 'directory', 'inferred')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  verified boolean not null default false,
  discovered_at timestamptz not null default now()
);

create index if not exists contact_routes_business_id_idx on contact_routes (business_id);

comment on table contact_routes is
  'Full provenance record of every discovered contact route per business — source of truth behind the denormalized businesses.email/phone/facebook_url/etc cache.';
comment on column contact_routes.verified is
  'True only when the source itself explicitly confirms it (e.g. a FindyMail verification field) — never inferred from confidence tier.';

-- Lovable-centric workflow tracking. demos.status (the old internal-renderer
-- pipeline state) is untouched — workflow_status is a new, independent
-- column since the two lifecycles don't map onto each other.
alter table demos add column if not exists demo_url text;
alter table demos add column if not exists demo_builder text
  check (demo_builder is null or demo_builder in ('LOVABLE', 'INTERNAL'));
alter table demos add column if not exists workflow_status text not null default 'NOT_STARTED'
  check (workflow_status in (
    'NOT_STARTED', 'BRIEF_READY', 'BUILDING_IN_LOVABLE', 'DEMO_READY',
    'SENT', 'RESPONDED', 'INTERESTED', 'NOT_INTERESTED'
  ));
alter table demos add column if not exists lovable_brief jsonb;
alter table demos add column if not exists outreach_messages jsonb not null default '{}'::jsonb;

comment on column demos.workflow_status is
  'Lightweight manual tracking for the Lovable workflow — no automation beyond BRIEF_READY (on brief generation) and DEMO_READY (on attaching demo_url). Independent of demos.status.';
comment on column demos.lovable_brief is
  'Structured output of lib/demo/lovable-prompt.ts ({business_facts_block, factual_guardrails, design_direction, ..., full_prompt, generatedAt}) — generated only on explicit user action, never regenerated automatically.';
comment on column demos.outreach_messages is
  'Generated outreach copy keyed "<kind>_<channel>" (e.g. "first_contact_email") — {subject, body, channel, kind, generatedAt}. Stored so revisiting the page never re-calls Claude; Regenerate is an explicit separate action.';
