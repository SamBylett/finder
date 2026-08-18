-- V2.4 — OutreachReadiness data model + Opportunity Score rebalance.
--
-- Opportunity Score's "Contactability" block (email/phone/social presence)
-- has been removed from lib/scoring.ts — that concept now lives entirely in
-- OutreachReadiness (lib/outreach.ts), which is computed on read from
-- phone_type/email/facebook_url/instagram_url/linkedin_url rather than
-- stored as its own score. Existing opportunity_score/opportunity_tier
-- values were computed under the old formula and will read slightly high
-- until backfilled — see scripts/backfill-v2_4.mjs (run once, then deleted).

alter table businesses add column if not exists linkedin_url text;
alter table businesses add column if not exists phone_e164 text;
alter table businesses add column if not exists phone_type text
  check (phone_type is null or phone_type in ('mobile', 'landline', 'unknown'));

alter table demos add column if not exists mobile_checked boolean not null default false;

comment on column businesses.phone_type is
  'Deterministic UK classification from lib/phone.ts — mobile/landline/unknown. "unknown" is the safe default; never assume mobile from ambiguous ranges.';
comment on column businesses.phone_e164 is
  'Normalised +44... form of businesses.phone, when it parses as a plausible UK number. businesses.phone stays the original display string.';
comment on column demos.mobile_checked is
  'Manual honesty flag set via the demo editor once mobile breakpoints have actually been visually checked. SendReadiness cannot reach READY_TO_SEND until true.';
