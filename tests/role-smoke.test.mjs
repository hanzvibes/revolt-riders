import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Member role stays outside privileged navigation and mutations", async () => {
  const shell = await read("components/app-shell.tsx");
  const ridingApproval = await read("app/riding/approval/page.tsx");
  const cash = await read("app/kas/page.tsx");
  const voyager = await read("app/voyager/page.tsx");

  assert.match(
    shell,
    /canOperational = account\?\.status === "active" && hasRole\(account\.role, \["road_captain", "admin", "superadmin"\]\)/,
  );
  assert.match(
    shell,
    /canAdmin = account\?\.status === "active" && hasRole\(account\.role, \["admin", "superadmin"\]\)/,
  );

  assert.match(ridingApproval, /\["road_captain", "admin", "superadmin"\]\.includes/);
  assert.match(cash, /\["treasurer", "admin", "superadmin"\]\.includes/);
  assert.match(voyager, /role === "admin" \|\| role === "superadmin"/);
});

test("Road Captain riding review is guarded in UI and database", async () => {
  const page = await read("app/riding/approval/page.tsx");
  const service = await read("lib/services/ride-log-service.ts");
  const migration = await read(
    "supabase/migrations/20260920153036_extend_ride_log_rpc_flow.sql",
  );

  assert.match(page, /const canReview = \(role\?: string\) => \["road_captain", "admin", "superadmin"\]\.includes/);
  assert.match(page, /reviewRideLog/);
  assert.match(service, /rpc\(\s*"review_ride_log"/);

  assert.match(
    migration,
    /caller_account\.role not in \([\s\S]*'road_captain'::public\.app_role,[\s\S]*'admin'::public\.app_role,[\s\S]*'superadmin'::public\.app_role/,
  );
  assert.match(migration, /caller_account\.status <> 'active'::public\.account_status/);
});

test("Treasurer cash mutations are guarded in UI and database", async () => {
  const page = await read("app/kas/page.tsx");
  const migration = await read(
    "supabase/migrations/20260916123000_add_cash_controls_and_checkin_rotation.sql",
  );

  assert.match(
    page,
    /const isStaffRole = \(role\?: string\) =>[\s\S]*\["treasurer", "admin", "superadmin"\]\.includes/,
  );
  assert.match(page, /rpc\(\s*"void_club_cash_transaction"/);

  assert.match(
    migration,
    /v_role not in \('treasurer', 'admin', 'superadmin'\)/,
  );
  assert.match(migration, /Alasan koreksi harus 3–500 karakter/);
});

test("Voyager management is Admin or Superadmin only at both layers", async () => {
  const page = await read("app/voyager/page.tsx");
  const migration = await read(
    "supabase/migrations/20260920121211_add_voyager_activity_system.sql",
  );

  assert.match(
    page,
    /const isAdminRole = \(role\?: string\) => role === "admin" \|\| role === "superadmin"/,
  );
  assert.match(page, /rpc\(\s*"save_event_activity"/);
  assert.match(page, /rpc\(\s*"sync_event_official_rides"/);

  const adminGuard =
    /v_role not in \('admin'::public\.app_role, 'superadmin'::public\.app_role\)/g;
  assert.ok(
    [...migration.matchAll(adminGuard)].length >= 2,
    "Voyager save and sync RPCs must both keep Admin/Superadmin guards",
  );
});

test("Admin dashboard and role management preserve Superadmin boundary", async () => {
  const page = await read("app/admin/page.tsx");
  const migration = await read(
    "supabase/migrations/20260918000100_revolt_riders_comprehensive_fixes.sql",
  );

  assert.match(
    page,
    /\["admin", "superadmin"\]\.includes\(effectiveAccount\.role\)/,
  );
  assert.match(
    page,
    /const isSuperadmin =\s*isActiveAdmin && effectiveAccount\?\.role === "superadmin"/,
  );
  assert.match(page, /isSuperadmin[\s\S]*from\("member_accounts"\)/);
  assert.match(page, /rpc\(\s*"set_member_account_role"/);

  assert.match(migration, /v_role not in \('admin', 'superadmin'\)/);
});

test("Privileged SECURITY DEFINER RPCs revoke anonymous execution", async () => {
  const riding = await read(
    "supabase/migrations/20260920153036_extend_ride_log_rpc_flow.sql",
  );
  const cash = await read(
    "supabase/migrations/20260916123000_add_cash_controls_and_checkin_rotation.sql",
  );
  const voyager = await read(
    "supabase/migrations/20260920121211_add_voyager_activity_system.sql",
  );

  assert.match(riding, /revoke all on function public\.review_ride_log\(uuid, text, text\) from anon/);
  assert.match(cash, /revoke all on function public\.void_club_cash_transaction\(uuid,text\) from public, anon/);
  assert.match(voyager, /revoke all on function public\.save_event_activity[\s\S]*from anon/);
  assert.match(voyager, /revoke all on function public\.sync_event_official_rides\(uuid\) from anon/);
});
