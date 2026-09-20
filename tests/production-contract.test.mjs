import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PWA manifest is installable", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.name.includes("Revolt Riders"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
});

test("service worker provides offline navigation fallback", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /const PRECACHE/);
  assert.match(worker, /"\/offline"/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.match\("\/offline"\)/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /showNotification/);
});

test("cash correction and QR rotation remain server-authorized", async () => {
  const migration = await read("supabase/migrations/20260916123000_add_cash_controls_and_checkin_rotation.sql");
  assert.match(migration, /create_event_checkin_code/);
  assert.match(migration, /update public\.event_checkin_codes set active_until = now\(\)/);
  assert.match(migration, /void_club_cash_transaction/);
  assert.match(migration, /void_reason text/);
  assert.match(migration, /security definer/);
  assert.match(migration, /grant execute on function public\.void_club_cash_transaction/);
});

test("dashboard cash excludes corrected production transactions", async () => {
  const migration = await read("supabase/migrations/20260916140000_fix_dashboard_voided_cash.sql");
  assert.match(migration, /from public\.club_cash_transactions\s+where voided_at is null/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
});

test("event lifecycle and ride distance are enforced by the database", async () => {
  const migration = await read("supabase/migrations/20260916150000_add_event_lifecycle_rides_history_push.sql");
  assert.match(migration, /cancellation_reason text/);
  assert.match(migration, /create trigger validate_ride_log/);
  assert.match(migration, /new\.distance_km := new\.odometer_end - new\.odometer_start/);
  assert.match(migration, /push_subscriptions_owner_all/);
  assert.match(migration, /notification_preferences_owner_all/);
});


test("public join and ride mutations stay behind scoped RPCs", async () => {
  const landing = await read("app/page.tsx");
  const confirmation = await read("app/join/confirm/[token]/page.tsx");
  const rideService = await read("lib/services/ride-log-service.ts");
  const migration = await read("supabase/migrations/20260920064108_phase1_security_rpc_and_ride_policy_hardening.sql");

  assert.doesNotMatch(landing, /from\("join_requests"\)\.insert/);
  assert.doesNotMatch(confirmation, /from\("join_requests"\)/);
  assert.match(confirmation, /rpc\("get_public_join_request"/);
  assert.match(confirmation, /rpc\("confirm_join_request"/);

  assert.doesNotMatch(rideService, /from\("ride_logs"\)\.(insert|update|delete)/);
  assert.match(rideService, /rpc\(\s*"manage_ride_log"/);

  assert.match(migration, /drop policy if exists "Members and admins can insert ride logs"/);
  assert.match(migration, /revoke execute on function public\.manage_ride_log/);
  assert.match(migration, /get_public_join_request/);
});


test("processed ride logs are immutable to regular members", async () => {
  const migration = await read("supabase/migrations/20260920064553_lock_processed_ride_mutations.sql");
  assert.match(migration, /target_record\.status <> 'pending'::public\.ride_status/);
  assert.match(migration, /Ride yang sudah diproses tidak dapat diubah atau dihapus oleh member/);
  assert.match(migration, /for update/);
  assert.match(migration, /revoke all on function public\.manage_ride_log/);
  assert.match(migration, /grant execute on function public\.manage_ride_log.*authenticated/);
});


test("anonymous table access is least-privilege", async () => {
  const migration = await read("supabase/migrations/20260920064956_least_privilege_public_tables.sql");

  assert.match(migration, /revoke all privileges on table public\.join_requests from anon/);
  assert.match(migration, /revoke all privileges on table public\.member_profiles from anon/);
  assert.match(migration, /revoke all privileges on table public\.member_details from anon/);
  assert.match(migration, /revoke all privileges on table public\.ride_logs from anon/);
  assert.match(migration, /grant select on table public\.club_gallery to anon/);
  assert.match(migration, /ride_logs_authenticated_approved_read/);
});


test("account approval cannot assign privileged roles", async () => {
  const migration = await read("supabase/migrations/20260920065114_lock_account_approval_role.sql");
  assert.match(migration, /coalesce\(nullif\(trim\(p_role\), ''\), 'member'\) <> 'member'/);
  assert.match(migration, /values \(v_request\.user_id, v_request\.member_external_id, 'member'::public\.app_role\)/);
  assert.match(migration, /Perubahan role hanya dapat dilakukan oleh Superadmin/);
  assert.match(migration, /revoke all on function public\.approve_member_account_request.*anon/);
});


test("member account claims are validated at database boundary", async () => {
  const migration = await read("supabase/migrations/20260920065320_validate_member_account_claims.sql");
  assert.match(migration, /idx_member_account_requests_pending_member_ext_unique/);
  assert.match(migration, /\^RR-\[0-9\]\{3,\}\$/);
  assert.match(migration, /ID member tidak terdaftar sebagai member resmi/);
  assert.match(migration, /ID member sudah terhubung ke akun lain/);
  assert.match(migration, /status = 'pending'::public\.account_request_status/);
});


test("internal member reads require active accounts and leaderboard uses one KM source", async () => {
  const migration = await read("supabase/migrations/20260920065523_require_active_member_and_fix_leaderboard_source.sql");
  assert.match(migration, /ma\.status = 'active'::public\.account_status/);
  assert.match(migration, /member_profiles_authenticated_read/);
  assert.match(migration, /member_details_authenticated_read/);
  assert.match(migration, /ride_logs_authenticated_approved_read/);
  assert.match(migration, /round\(coalesce\(mp\.total_km, 0\)\)::numeric as total_km/);
  assert.doesNotMatch(migration, /mp\.total_km.*sum\(rl\.distance_km\)/s);
});


test("My Garage mutations remain owner-authorized and RPC-only", async () => {
  const migration = await read("supabase/migrations/20260920070800_add_member_motorcycle_garage.sql");
  const page = await read("app/garage/page.tsx");

  assert.match(migration, /member_motorcycles_one_primary_idx/);
  assert.match(migration, /ma\.status = 'active'::public\.account_status/);
  assert.match(migration, /ma\.member_external_id = member_motorcycles\.member_external_id/);
  assert.match(migration, /revoke all privileges on table public\.member_motorcycles from anon/);
  assert.match(migration, /revoke insert, update, delete on table public\.member_motorcycles from authenticated/);
  assert.match(migration, /save_member_motorcycle/);
  assert.match(migration, /delete_member_motorcycle/);
  assert.match(migration, /Motor tidak ditemukan atau bukan milik akun ini/);

  assert.match(page, /rpc\(\s*"save_member_motorcycle"/);
  assert.match(page, /rpc\(\s*"delete_member_motorcycle"/);
  assert.doesNotMatch(page, /from\("member_motorcycles"\)\.(insert|update|delete)/);
});


test("Voyager activity keeps participants, official KM, and media server-authorized", async () => {
  const migration = await read("supabase/migrations/20260920121211_add_voyager_activity_system.sql");
  const rideGuard = await read("supabase/migrations/20260920121743_allow_voyager_official_ride_logs.sql");
  const page = await read("app/voyager/page.tsx");
  const nav = await read("components/app-shell.tsx");
  const riding = await read("app/riding/page.tsx");

  assert.match(migration, /create table if not exists public\.event_participants/);
  assert.match(migration, /ride_logs_official_event_member_unique/);
  assert.match(migration, /source_type = 'official_agenda'/);
  assert.match(migration, /create or replace function public\.save_event_activity/);
  assert.match(migration, /create or replace function public\.sync_event_official_rides/);
  assert.match(migration, /'club-activity'/);
  assert.match(migration, /revoke all.*save_event_activity.*anon/);
  assert.match(migration, /revoke all.*sync_event_official_rides.*anon/);

  assert.match(rideGuard, /'voyager'::public\.event_type/);

  assert.match(page, /rpc\(\s*"save_event_activity"/);
  assert.match(page, /rpc\(\s*"sync_event_official_rides"/);
  assert.match(page, /from\("event_participants"\)/);
  assert.match(page, /from\("club-activity"\)/);
  assert.match(page, /Tidak ada minimum KM/);
  assert.doesNotMatch(page, /event_attendance|check_in|check-in/i);

  assert.match(nav, /\["Voyager", "\/voyager", Route\]/);
  assert.match(riding, /Official Agenda Distance/);
  assert.match(riding, /source_type !== "official_agenda"/);
});
