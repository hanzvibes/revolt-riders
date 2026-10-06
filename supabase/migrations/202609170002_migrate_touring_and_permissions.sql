-- REVOLT RIDERS: historical touring schema preparation
--
-- This migration previously embedded production member profiles and historical
-- ride records. Real member data belongs in the private operational import flow,
-- not in the public repository. Keep only the structural changes required by
-- later migrations.

alter table public.ride_logs
  add column if not exists title text;

alter table public.ride_logs
  alter column submitted_by drop not null;

-- Access policies and ride-management behavior are defined by later hardening
-- migrations. No production member or touring records are seeded here.