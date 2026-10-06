import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("join requests keeps a stable route entry and screen boundary", async () => {
  const entry = await read("app/admin/join-requests/page.tsx");
  const screen = await read("app/admin/join-requests/join-requests-screen.tsx");

  assert.match(entry, /^"use client";/);
  assert.match(entry, /import AdminJoinRequestsScreen from "\.\/join-requests-screen";/);
  assert.match(entry, /export default AdminJoinRequestsScreen;/);

  assert.match(screen, /export default function AdminJoinRequestsPage/);
  assert.match(screen, /accept_join_request/);
  assert.match(screen, /reject_join_request/);
  assert.match(screen, /activate_join_request/);
  assert.match(screen, /admin:join-requests/);
  assert.match(screen, /shell:pending-join-count/);
});
