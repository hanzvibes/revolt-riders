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
