-- V2.3 — PresentationQualityReview + SendReadiness. TechnicalQualityCheck
-- (quality_check, added 0003) catches objective defects only; visual review
-- of V2.2 showed demos passing that check while still looking template-
-- driven. presentation_review adds a bounded Claude review of structure/
-- copy; send_readiness combines both into one advisory signal.

alter table demos add column if not exists presentation_review jsonb;
alter table demos add column if not exists send_readiness text
  check (send_readiness is null or send_readiness in ('READY_TO_SEND', 'NEEDS_VISUAL_REVIEW', 'NOT_READY'));

comment on column demos.presentation_review is
  'PresentationQualityReview result ({score, strengths, findings, ai_appearance_findings, checkedAt}) from lib/demo/presentation-review.ts — advisory only.';
comment on column demos.send_readiness is
  'Combined TechnicalQualityCheck + PresentationQualityReview signal from lib/demo/send-readiness.ts — advisory only, never blocks preview/sharing.';
