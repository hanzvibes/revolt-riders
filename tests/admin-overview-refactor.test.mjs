import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("admin overview delegates data lifecycle and mutations", async () => {
  const screen = await read(
    "components/admin-overview-screen.tsx",
  );
  const controller = await read(
    "components/admin-overview-controller.ts",
  );
  const data = await read(
    "components/admin-overview-data.ts",
  );
  const invitations = await read(
    "components/admin-overview-invitation-actions.ts",
  );
  const accounts = await read(
    "components/admin-overview-account-actions.ts",
  );

  assert.ok(
    screen.length < 24_000,
    "admin overview screen should stay presentation-focused",
  );
  assert.match(screen, /useAdminOverviewController/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /fetchWithCache/);
  assert.doesNotMatch(screen, /confirmAction/);

  assert.match(controller, /fetchWithCache<AdminOverviewSnapshot>/);
  assert.match(controller, /admin_dashboard_overview/);
  assert.match(controller, /channel\("admin-rsvp-live"\)/);
  assert.match(controller, /generateBulkInvites/);
  assert.match(controller, /createAdminCheckinCode/);
  assert.match(controller, /approveAdminAccountRequest/);
  assert.match(controller, /rejectAdminAccountRequest/);
  assert.match(controller, /changeAdminAccountRole/);
  assert.doesNotMatch(controller, /token_hash/);
  assert.doesNotMatch(controller, /create_event_checkin_code/);
  assert.doesNotMatch(controller, /set_member_account_role/);

  assert.match(invitations, /token_hash/);
  assert.match(invitations, /create_event_checkin_code/);
  assert.match(accounts, /approve_member_account_request/);
  assert.match(accounts, /reject_member_account_request/);
  assert.match(accounts, /set_member_account_role/);

  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("member_account_requests"\)/);
  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("event_invitations"\)/);
  assert.match(data, /from\("event_rsvps"\)/);
  assert.match(data, /from\("member_accounts"\)/);
});

test("admin overview preserves realtime refresh and cache behavior", async () => {
  const controller = await read(
    "components/admin-overview-controller.ts",
  );

  assert.match(
    controller,
    /invalidateCache\("admin_dashboard_overview"\)/,
  );
  assert.match(controller, /table: "event_rsvps"/);
  assert.match(controller, /table: "event_invitations"/);
  assert.match(controller, /void load\(true\)/);
  assert.match(controller, /ttlMs: 60 \* 1000/);
});

test("admin invitation flow keeps secure token hashing and CSV export", async () => {
  const actions = await read(
    "components/admin-overview-invitation-actions.ts",
  );

  assert.match(actions, /crypto\.getRandomValues/);
  assert.match(actions, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(actions, /token_hash/);
  assert.match(actions, /text\/csv;charset=utf-8/);
  assert.match(actions, /URL\.revokeObjectURL/);
  assert.match(actions, /onConflict:\s*"event_id,member_external_id"/);
});

test("admin destructive and role mutations preserve confirmation guards", async () => {
  const controller = await read(
    "components/admin-overview-controller.ts",
  );
  const actions = await read(
    "components/admin-overview-account-actions.ts",
  );

  assert.match(controller, /destructive: true/);
  assert.match(controller, /if \(!confirmed\) return/);
  assert.match(controller, /rejectAdminAccountRequest/);
  assert.match(controller, /changeAdminAccountRole/);
  assert.match(actions, /reject_member_account_request/);
  assert.match(actions, /set_member_account_role/);
});


test("admin controller stays orchestration-focused after action split", async () => {
  const controller = await read(
    "components/admin-overview-controller.ts",
  );

  assert.ok(
    controller.length < 16_000,
    "admin overview controller should not become a God Controller",
  );
  assert.doesNotMatch(controller, /crypto\.subtle/);
  assert.doesNotMatch(controller, /crypto\.getRandomValues/);
  assert.doesNotMatch(controller, /text\/csv/);
  assert.doesNotMatch(
    controller,
    /rpc\(\s*"approve_member_account_request"/,
  );
  assert.doesNotMatch(
    controller,
    /rpc\(\s*"reject_member_account_request"/,
  );
  assert.doesNotMatch(
    controller,
    /rpc\(\s*"set_member_account_role"/,
  );
});
