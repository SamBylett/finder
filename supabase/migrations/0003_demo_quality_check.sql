-- V2.2 — DemoQualityCheck, a deterministic readiness guardrail stored per demo.

alter table demos add column if not exists quality_check jsonb;

comment on column demos.quality_check is
  'Deterministic DemoQualityCheck result ({status, issues, checkedAt}) from lib/demo/quality-check.ts — informational only, never blocks preview/editing.';
