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
  assert.ok(!page.includes('.from("event_attendance")'));
  assert.ok(!page.includes('.from("event_checkin_codes")'));

  assert.match(nav, /\["Voyager", "\/voyager", Route\]/);
  assert.match(riding, /Official Agenda Distance/);
  assert.match(riding, /source_type !== "official_agenda"/);
});


test("Mandatory Ride can be enabled on managed agendas without check-in dependency", async () => {
  const admin = await read("app/admin/events/page.tsx");
  const anyEventGuard = await read(
    "supabase/migrations/20260920122209_allow_mandatory_official_km_for_any_event.sql",
  );
  const flagSync = await read(
    "supabase/migrations/20260920122407_sync_mandatory_flag_on_official_rides.sql",
  );

  assert.match(admin, /Count as Mandatory Ride/);
  assert.match(admin, /Official Trip Distance/);
  assert.match(admin, /selectedParticipants/);
  assert.match(admin, /rpc\(\s*"save_event_activity"/);
  assert.match(admin, /rpc\(\s*"sync_event_official_rides"/);
  assert.ok(!admin.includes('.from("event_attendance").select'));

  assert.match(anyEventGuard, /new\.source_type = 'official_agenda'/);
  assert.match(anyEventGuard, /e\.counts_as_mandatory = true/);
  assert.match(flagSync, /update public\.ride_logs/);
  assert.match(flagSync, /counts_as_mandatory is distinct from/);
});


test("Riding create and review mutations are routed through authorized RPCs", async () => {
  const service = await read("lib/services/ride-log-service.ts");
  const riding = await read("app/riding/page.tsx");
  const approval = await read("app/riding/approval/page.tsx");
  const migration = await read(
    "supabase/migrations/20260920153036_extend_ride_log_rpc_flow.sql",
  );

  assert.match(service, /"manage_ride_log"/);
  assert.match(service, /p_event_id:/);
  assert.match(service, /p_odometer_start:/);
  assert.match(service, /p_odometer_end:/);
  assert.match(service, /"review_ride_log"/);

  assert.match(riding, /await saveRideLog\(/);
  assert.doesNotMatch(riding, /from\("ride_logs"\)\.insert/);

  assert.match(approval, /await reviewRideLog\(/);
  assert.doesNotMatch(approval, /from\("ride_logs"\)\.update/);

  assert.match(migration, /target_record\.source_type = 'official_agenda'/);
  assert.match(migration, /Official Agenda Distance hanya dapat diubah melalui sinkronisasi agenda/);
  assert.match(migration, /revoke all on function public\.review_ride_log.*from anon/);
  assert.match(migration, /grant execute on function public\.review_ride_log.*to authenticated/);
});


test("Voyager hub keeps core sections visible even before the first activity exists", async () => {
  const page = await read("app/voyager/page.tsx");
  const css = await read("app/system-ui.css");

  assert.match(page, /voyager-overview-grid/);
  assert.match(page, /Voyager berikutnya/);
  assert.match(page, /Progress riding resmi/);
  assert.match(page, /Activity & History/);
  assert.match(page, /Activity Gallery/);
  assert.match(page, /Gallery siap digunakan/);
  assert.match(page, /Buat Voyager Pertama/);
  assert.match(page, /\/admin\/events\?create=voyager/);
  assert.match(page, /galleryPreview\.length === 0/);
  assert.match(page, /uniqueParticipantCount/);
  assert.match(page, /totalOfficialKm/);

  assert.match(css, /VOYAGER HUB/);
  assert.match(css, /voyager-gallery-hub-grid/);
  assert.match(css, /voyager-mandatory-card/);
  assert.match(css, /voyager-structured-empty/);
});


test("Voyager create shortcut opens a prefilled Voyager agenda form", async () => {
  const admin = await read("app/admin/events/page.tsx");
  assert.match(admin, /params\.get\("create"\) !== "voyager"/);
  assert.match(admin, /setType\("voyager"\)/);
  assert.match(admin, /setCountsAsMandatory\(true\)/);
  assert.match(admin, /setFormOpen\(true\)/);
});


test("ModalSheet traps focus and restores the opener", async () => {
  const sheet = await read("components/modal-sheet.tsx");

  assert.match(sheet, /FOCUSABLE_SELECTOR/);
  assert.match(sheet, /previousFocusRef/);
  assert.match(sheet, /aria-labelledby=/);
  assert.match(sheet, /tabIndex=\{-1\}/);
  assert.match(sheet, /event\.key !== "Tab"/);
  assert.match(sheet, /previousFocusRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(
    sheet,
    /<button\s+className="native-sheet-handle"/,
  );
});

test("Mobile navigation is inert while the drawer is hidden", async () => {
  const shell = await read("components/app-shell.tsx");

  assert.match(shell, /matchMedia\("\(max-width: 720px\)"\)/);
  assert.match(shell, /inert=\{isMobileDrawer && !open \? true : undefined\}/);
  assert.match(shell, /aria-hidden=\{isMobileDrawer && !open \? true : undefined\}/);
  assert.match(shell, /aria-controls="app-mobile-drawer"/);
  assert.match(shell, /aria-expanded=\{open\}/);
});

test("Audit hardening keeps shared controls touch friendly", async () => {
  const css = await read("app/system-ui.css");
  const tokens = await read("app/tokens.css");

  assert.match(tokens, /--rr-control-lg: 44px/);
  assert.match(css, /voyager-create-action[\s\S]*min-height: var\(--rr-control-lg\)/);
  assert.match(css, /role-panel \.role-list select[\s\S]*min-height: var\(--rr-control-lg\)/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*font-size: max\(1rem, var\(--rr-type-body\)\)/);
});

test("Reduced motion preserves state changes without blanket-killing the app", async () => {
  const css = await read("app/system-ui.css");
  const chart = await read("components/riding-stat-chart.tsx");

  assert.doesNotMatch(
    css,
    /\.app-shell \*,\s*\.app-shell \*::before,\s*\.app-shell \*::after[\s\S]*transition-duration: \.01ms/,
  );
  assert.match(chart, /prefers-reduced-motion: reduce/);
  assert.match(chart, /isAnimationActive=\{!reduceMotion\}/);
  assert.match(chart, /animationDuration=\{reduceMotion \? 0 : 240\}/);
});

test("Voyager, Riding, and Garage reuse the shared data cache", async () => {
  const voyager = await read("app/voyager/page.tsx");
  const riding = await read("app/riding/page.tsx");
  const garage = await read("app/garage/page.tsx");

  for (const source of [voyager, riding, garage]) {
    assert.match(source, /useDataCache/);
    assert.match(source, /fetchWithCache/);
    assert.match(source, /forceRefresh/);
  }

  assert.match(voyager, /ttlMs: 90_000/);
  assert.match(riding, /ttlMs: 60_000/);
  assert.match(garage, /ttlMs: 90_000/);
  assert.match(riding, /dynamic\(/);
  assert.match(riding, /components\/riding-stat-chart/);
});

test("Voyager gallery images decode lazily", async () => {
  const voyager = await read("app/voyager/page.tsx");

  assert.match(voyager, /loading="lazy"/);
  assert.match(voyager, /decoding="async"/);
  assert.match(voyager, /PageSkeleton/);
});


test("Audit polish keeps navigation, cache, and microcopy resilient", async () => {
  const shell = await read("components/app-shell.tsx");
  const css = await read("app/system-ui.css");

  assert.match(shell, /DRAWER_FOCUSABLE_SELECTOR/);
  assert.match(shell, /event\.key === "Escape"/);
  assert.match(shell, /event\.key !== "Tab"/);
  assert.match(shell, /document\.body\.style\.overflow = "hidden"/);
  assert.match(shell, /inert=\{isMobileDrawer && open \? true : undefined\}/);
  assert.match(shell, /shell:pending-join-count/);
  assert.match(shell, /fetchWithCache<number>/);

  assert.match(css, /Audit polish · readable microcopy and coarse-pointer targets/);
  assert.match(css, /bottom a small[\s\S]*font-size: var\(--rr-type-caption\)/);
  assert.match(css, /@media \(pointer: coarse\) and \(max-width: 900px\)/);
  assert.match(css, /riding-stat-range button[\s\S]*min-height: var\(--rr-control-lg\)/);
});

test("Cash and profile pages reuse authenticated cache without blank-page reloads", async () => {
  const cash = await read("app/kas/page.tsx");
  const profile = await read("app/profil/page.tsx");

  assert.match(cash, /useMemberAccess/);
  assert.match(cash, /fetchWithCache<CashSnapshot>/);
  assert.match(cash, /ttlMs: 30_000/);
  assert.match(cash, /invalidateCache\("cash:"\)/);
  assert.match(cash, /PageSkeleton title="Memuat Kas Revolt\.\.\."/);
  assert.doesNotMatch(cash, /auth\.getUser\(\)/);

  assert.match(profile, /useMemberAccess/);
  assert.match(profile, /fetchWithCache<ProfileSnapshot>/);
  assert.match(profile, /ttlMs: 60_000/);
  assert.match(profile, /profile:\$\{nextAccount\.member_external_id\}/);
  assert.match(profile, /load\(true\)/);
  assert.doesNotMatch(profile, /auth\.getUser\(\)/);
});

test("Join request admin refreshes the cached shell badge after workflow changes", async () => {
  const joinRequests = await read("app/admin/join-requests/page.tsx");

  assert.match(joinRequests, /fetchWithCache<JoinRequestsSnapshot>/);
  assert.match(joinRequests, /"admin:join-requests"/);
  assert.match(joinRequests, /ttlMs: 30_000/);
  assert.match(joinRequests, /invalidateCache\("shell:pending-join-count"\)/);
  assert.match(joinRequests, /loadRequests\(true\)/);
});

test("Data cache evicts stale and cross-user entries", async () => {
  const cache = await read("context/data-cache-context.tsx");

  assert.match(cache, /Date\.now\(\) - entry\.timestamp >= entry\.ttl/);
  assert.match(cache, /userIdRef\.current !== nextUser\.id/);
  assert.match(cache, /cacheRef\.current\.clear\(\)/);
  assert.match(cache, /inFlightRef\.current\.clear\(\)/);
  assert.match(cache, /const value = useMemo/);
});


test("Fullscreen check-in QR behaves like an accessible modal", async () => {
  const qr = await read("components/checkin-qr.tsx");

  assert.match(qr, /FOCUSABLE_SELECTOR/);
  assert.match(qr, /dialogRef/);
  assert.match(qr, /openerRef/);
  assert.match(qr, /event\.key === "Escape"/);
  assert.match(qr, /event\.key !== "Tab"/);
  assert.match(qr, /document\.body\.style\.overflow = "hidden"/);
  assert.match(qr, /aria-modal="true"/);
  assert.match(qr, /aria-labelledby=\{titleId\}/);
  assert.match(qr, /tabIndex=\{-1\}/);
  assert.match(qr, /const opener = openerRef\.current/);
  assert.match(qr, /opener\?\.focus\(\)/);
});

test("High-traffic admin workspaces reuse shared access and cache state", async () => {
  const files = [
    "app/admin/events/page.tsx",
    "app/admin/insights/page.tsx",
    "app/admin/attendance/page.tsx",
    "app/admin/members/page.tsx",
    "app/riding/approval/page.tsx",
  ];

  for (const file of files) {
    const source = await read(file);
    assert.match(source, /useMemberAccess/);
    assert.match(source, /useDataCache/);
    assert.match(source, /fetchWithCache/);
    assert.doesNotMatch(source, /auth\.getUser\(\)/);
  }

  const events = await read("app/admin/events/page.tsx");
  const attendance = await read("app/admin/attendance/page.tsx");

  assert.match(events, /admin:events:workspace/);
  assert.match(events, /load\(true\)/);
  assert.match(attendance, /admin:attendance/);
  assert.match(attendance, /postgres_changes/);
});

test("UI audit budgets prevent legacy design debt from silently increasing", async () => {
  const audit = await read("scripts/audit-ui-css.mjs");

  assert.match(audit, /legacyBudgets/);
  assert.match(audit, /tiny typography debt increased/);
  assert.match(audit, /hard-coded color debt increased/);
  assert.match(audit, /!important debt increased/);
  assert.match(audit, /nativeDialogCount/);
  assert.match(audit, /confirm\|prompt/);
  assert.match(audit, /24-43px height/);
});

test("Audit next pass keeps active admin microcopy and touch targets readable", async () => {
  const css = await read("app/system-ui.css");

  assert.match(css, /Audit next pass · admin readability and touch resilience/);
  assert.match(css, /checkin-qr-content em[\s\S]*font-size: var\(--rr-type-caption\)/);
  assert.match(css, /attendance-stats small[\s\S]*font-size: var\(--rr-type-caption\)/);
  assert.match(css, /qr-close[\s\S]*min-height: var\(--rr-control-lg\)/);
  assert.match(css, /sidebar-accordion-header[\s\S]*min-height: var\(--rr-control-lg\)/);
});


test("Shared action dialogs replace native browser prompts", async () => {
  const provider = await read("components/action-dialog-provider.tsx");
  const layout = await read("app/layout.tsx");
  const auditedPages = [
    "app/admin/events/page.tsx",
    "app/admin/page.tsx",
    "app/garage/page.tsx",
    "app/kas/page.tsx",
    "app/voyager/page.tsx",
  ];

  assert.match(layout, /ActionDialogProvider/);
  assert.match(provider, /AlertDialog/);
  assert.match(provider, /DialogContent/);
  assert.match(provider, /confirmAction/);
  assert.match(provider, /promptAction/);
  assert.match(provider, /min-h-11/);

  for (const file of auditedPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /window\.(?:confirm|prompt|alert)\(/);
  }
});


test("Voyager makes member status and evidence visible", async () => {
  const voyager = await read("app/voyager/page.tsx");
  const css = await read("app/system-ui.css");

  assert.match(voyager, /currentMemberVoyagerEvents/);
  assert.match(voyager, /featuredMemberStatus/);
  assert.match(voyager, /aria-label="Status Voyager saya"/);
  assert.match(voyager, /BUKTI FOTO/);
  assert.match(voyager, /setDetailEvent\(featuredEvent\)/);

  assert.match(css, /voyager-member-progress/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
});


test("Event deletion stays behind the authorized RPC", async () => {
  const eventsAdmin = await read("app/admin/events/page.tsx");
  const adminDashboard = await read("app/admin/page.tsx");
  const migration = await read("supabase/migrations/20260920121211_add_voyager_activity_system.sql");

  for (const source of [eventsAdmin, adminDashboard]) {
    assert.match(source, /rpc\("delete_event"/);
    assert.doesNotMatch(source, /from\("events"\)\.delete/);
    assert.doesNotMatch(source, /from\("ride_logs"\)\.(?:delete|update)/);
  }

  assert.match(migration, /delete from public\.ride_logs/);
  assert.match(migration, /delete from public\.events/);
  assert.match(migration, /event\.delete/);
});

test("Database performance hardening is migration-tracked", async () => {
  const migration = await read(
    "supabase/migrations/20260921030223_optimize_rls_and_foreign_key_indexes.sql",
  );

  assert.match(migration, /cash_transactions_import_batch_id_idx/);
  assert.match(migration, /club_cash_transactions_created_by_idx/);
  assert.match(migration, /member_motorcycles_updated_by_idx/);
  assert.match(migration, /member_name_aliases_member_external_id_idx/);
  assert.match(migration, /imported_rides_own_or_staff_read/);
  assert.match(migration, /member_dues_own_or_staff_read/);
  assert.match(migration, /Staff can manage club gallery/);
  assert.match(migration, /Staff can view and manage join requests/);
  assert.match(migration, /\(select auth\.uid\(\)\)/);
});


test("Admin rejection stays behind its authorized RPC", async () => {
  const admin = await read("app/admin/page.tsx");

  assert.match(admin, /rpc\(\s*"reject_member_account_request"/);
  assert.doesNotMatch(
    admin,
    /from\("member_account_requests"\)\s*\.delete\(/,
  );
  assert.match(admin, /Tolak Pendaftaran/);
});

test("Destructive action dialogs use explicit safe labels", async () => {
  const files = [
    "app/admin/events/page.tsx",
    "app/admin/page.tsx",
    "app/garage/page.tsx",
    "app/kas/page.tsx",
    "app/voyager/page.tsx",
  ];

  const sources = await Promise.all(files.map(read));
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /window\.(?:confirm|prompt|alert)\(/);
  assert.match(combined, /destructive:\s*true/);
  assert.match(combined, /Hapus Permanen/);
  assert.match(combined, /Hapus Motor/);
  assert.match(combined, /Hapus Foto/);
  assert.match(combined, /Koreksi Transaksi/);
});


test("Join request admin mutations stay behind scoped RPCs", async () => {
  const page = await read("app/admin/join-requests/page.tsx");

  assert.match(page, /rpc\(\s*"accept_join_request"/);
  assert.match(page, /rpc\(\s*"reject_join_request"/);
  assert.match(page, /rpc\(\s*"activate_join_request"/);
  assert.doesNotMatch(page, /from\("join_requests"\)\s*\.update\(/);
  assert.doesNotMatch(page, /from\("member_profiles"\)\s*\.insert\(/);
});

test("Static and Voyager gallery images use Next Image", async () => {
  const voyager = await read("app/voyager/page.tsx");
  const invitation = await read("app/undangan/[token]/page.tsx");
  const setup = await read("app/setup/page.tsx");
  const offline = await read("app/offline/page.tsx");
  const config = await read("next.config.ts");

  for (const source of [voyager, invitation, setup, offline]) {
    assert.match(source, /from "next\/image"/);
    assert.doesNotMatch(source, /<img\b/);
  }

  assert.match(config, /uloqjgwgupuaatdixvsa\.supabase\.co/);
  assert.match(voyager, /sizes="\(max-width: 520px\) 50vw, 320px"/);
});
test("Mandatory agenda lifecycle auto-syncs official KM when ready", async () => {
  const admin = await read("app/admin/events/page.tsx");

  assert.match(admin, /const syncOfficialRidesIfReady = useCallback/);
  assert.match(admin, /status === "draft"/);
  assert.match(admin, /Official KM tersinkron ke/);

  const calls = admin.match(/await syncOfficialRidesIfReady\(/g) ?? [];
  assert.ok(
    calls.length >= 3,
    "save, manual sync, and publish/complete lifecycle must share the sync guard",
  );
});

test("Ride mutations invalidate derived KM caches", async () => {
  const riding = await read("app/riding/page.tsx");

  for (const key of [
    "riding:",
    "profile:",
    "dashboard_member_profile_",
    "dashboard_club_stats",
    "riding_leaderboard_data",
    "member_profiles_list",
    "member_touring:",
    "admin_dashboard_overview",
  ]) {
    assert.ok(riding.includes('invalidateCache("'+key+'")'), "missing invalidation for " + key);
  }

  assert.match(riding, /invalidateRideDerivedCaches\(\)/);
});

test("Ride approval refreshes Member Directory and member detail caches", async () => {
  const approval = await read("app/riding/approval/page.tsx");

  assert.match(approval, /invalidateCache\("member_profiles_list"\)/);
  assert.ok(approval.includes("member_touring:${ride.member_external_id}"));
  assert.match(approval, /invalidateCache\("riding_leaderboard_data"\)/);
  assert.match(approval, /invalidateCache\("admin_dashboard_overview"\)/);
});

