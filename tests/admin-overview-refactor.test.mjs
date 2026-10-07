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
  assert.match(controller, /create_event_checkin_code/);
  assert.match(controller, /approve_member_account_request/);
  assert.match(controller, /reject_member_account_request/);
  assert.match(controller, /set_member_account_role/);

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
  const controller = await read(
    "components/admin-overview-controller.ts",
  );

  assert.match(controller, /crypto\.getRandomValues/);
  assert.match(controller, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(controller, /token_hash/);
  assert.match(controller, /text\/csv;charset=utf-8/);
  assert.match(controller, /URL\.revokeObjectURL/);
  assert.match(controller, /onConflict:\s*"event_id,member_external_id"/);
});

test("admin destructive and role mutations preserve confirmation guards", async () => {
  const controller = await read(
    "components/admin-overview-controller.ts",
  );

  assert.match(controller, /destructive: true/);
  assert.match(controller, /if \(!confirmed\) return/);
  assert.match(controller, /reject_member_account_request/);
  assert.match(controller, /set_member_account_role/);
});
