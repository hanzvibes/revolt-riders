import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const importTsModule = async (path) => {
  const source = await read(path);
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const request = (overrides = {}) => ({
  id: "1",
  full_name: "Rider Satu",
  birth_place: "Situbondo",
  birth_date: "2000-01-01",
  city: "Situbondo",
  instagram: "rider.satu",
  whatsapp: "08123456789",
  status: "pending",
  confirmation_token: null,
  accepted_at: null,
  confirmed_at: null,
  activated_at: null,
  rejected_at: null,
  rejection_reason: null,
  assigned_member_id: null,
  created_at: "2026-10-06T00:00:00Z",
  ...overrides,
});

test("join requests keeps a stable route entry and modular screen boundary", async () => {
  const entry = await read("app/admin/join-requests/page.tsx");
  const screen = await read("app/admin/join-requests/join-requests-screen.tsx");
  const data = await read("app/admin/join-requests/join-requests-data.ts");
  const actions = await read("app/admin/join-requests/join-requests-actions.ts");
  const view = await read("app/admin/join-requests/join-requests-view.tsx");
  const desktop = await read("app/admin/join-requests/join-requests-desktop-table.tsx");
  const mobile = await read("app/admin/join-requests/join-requests-mobile-cards.tsx");
  const modals = await read("app/admin/join-requests/join-requests-modals.tsx");

  assert.match(entry, /^"use client";/);
  assert.match(entry, /import AdminJoinRequestsScreen from "\.\/join-requests-screen";/);
  assert.match(entry, /export default AdminJoinRequestsScreen;/);

  assert.match(screen, /from "\.\/join-requests-model"/);
  assert.match(screen, /from "\.\/join-requests-data"/);
  assert.match(screen, /from "\.\/join-requests-actions"/);
  assert.match(screen, /from "\.\/join-requests-view"/);
  assert.match(screen, /from "\.\/join-requests-desktop-table"/);
  assert.match(screen, /from "\.\/join-requests-mobile-cards"/);
  assert.match(screen, /from "\.\/join-requests-modals"/);
  assert.doesNotMatch(screen, /accept_join_request|reject_join_request|activate_join_request/);
  assert.doesNotMatch(screen, /admin-member-table-card|admin-join-cards-mobile|<ModalSheet/);
  assert.match(screen, /admin:join-requests/);
  assert.match(screen, /shell:pending-join-count/);

  assert.match(data, /from\("join_requests"\)/);
  assert.match(data, /from\("member_profiles"\)/);
  assert.match(actions, /accept_join_request/);
  assert.match(actions, /reject_join_request/);
  assert.match(actions, /activate_join_request/);
  assert.match(actions, /if \(error\) throw error;/);
  assert.match(view, /join-badge-pending/);
  assert.match(view, /https:\/\/wa\.me/);

  assert.match(desktop, /admin-member-table-card/);
  assert.match(desktop, /onAccept/);
  assert.match(desktop, /onActivate/);
  assert.match(desktop, /onReject/);
  assert.match(mobile, /admin-join-cards-mobile/);
  assert.match(mobile, /onCopyConfirmation/);
  assert.match(modals, /DETAIL CALON MEMBER/);
  assert.match(modals, /TOLAK PENDAFTARAN/);
  assert.match(modals, /AKTIVASI ANGGOTA RESMI/);
});

test("join request model handles counts and normal filters", async () => {
  const { filterJoinRequests, getJoinRequestCounts } = await importTsModule(
    "app/admin/join-requests/join-requests-model.ts",
  );
  const items = [
    request(),
    request({ id: "2", full_name: "Budi", status: "accepted" }),
    request({ id: "3", full_name: "Candra", status: "active", assigned_member_id: "RR-030" }),
  ];

  assert.deepEqual(getJoinRequestCounts(items), {
    all: 3,
    pending: 1,
    accepted: 1,
    confirmed: 0,
    active: 1,
    archived: 0,
  });
  assert.deepEqual(filterJoinRequests(items, "active", "RR-030").map(({ id }) => id), ["3"]);
});

test("join request model handles archived and empty-search edge cases", async () => {
  const { filterJoinRequests, getInitials, getJoinRequestCounts } = await importTsModule(
    "app/admin/join-requests/join-requests-model.ts",
  );
  const items = [
    request({ id: "1", status: "rejected" }),
    request({ id: "2", status: "expired" }),
    request({ id: "3", status: "confirmed" }),
  ];

  assert.equal(getJoinRequestCounts(items).archived, 2);
  assert.deepEqual(filterJoinRequests(items, "archived", "   ").map(({ id }) => id), ["1", "2"]);
  assert.equal(getInitials("Rider Satu"), "RS");
  assert.equal(getInitials("RR"), "RR");
});

test("join request action layer keeps RPC errors throwable", async () => {
  const actions = await read("app/admin/join-requests/join-requests-actions.ts");
  assert.equal((actions.match(/if \(error\) throw error;/g) ?? []).length, 3);
});
