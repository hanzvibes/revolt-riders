import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  page: "app/riding/page.tsx",
  model: "app/riding/riding-model.ts",
  data: "app/riding/riding-data.ts",
  derived: "app/riding/riding-derived.ts",
  summary: "app/riding/riding-summary.tsx",
  form: "app/riding/riding-form.tsx",
  history: "app/riding/riding-history.tsx",
};

test("Riding route stays a thin orchestration layer", async () => {
  const page = await read(files.page);
  const model = await read(files.model);
  const derived = await read(files.derived);

  assert.match(page, /RidingSummary/);
  assert.match(page, /RidingForm/);
  assert.match(page, /RidingHistory/);
  assert.match(page, /fetchRidingSnapshot/);
  assert.match(page, /deriveRidingState/);
  assert.doesNotMatch(page, /type UserRide = \{/);
  assert.doesNotMatch(page, /from\("ride_logs"\)/);
  assert.doesNotMatch(page, /await saveRideLog\(/);
  assert.ok(page.split("\n").length <= 220, "Riding page should remain a thin orchestrator");

  assert.match(model, /export type UserRide = \{/);
  assert.match(model, /export type RidingSnapshot = \{/);
  assert.match(model, /export const eventDate/);
  assert.match(derived, /export function deriveRidingState/);
  assert.match(derived, /export function buildRideRecapText/);
});

test("Riding read and mutation boundaries remain explicit", async () => {
  const data = await read(files.data);
  const form = await read(files.form);
  const history = await read(files.history);
  const service = await read("lib/services/ride-log-service.ts");

  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("ride_logs"\)/);
  assert.match(form, /await saveRideLog\(/);
  assert.match(history, /await deleteRideLog\(/);
  assert.match(service, /rpc\(\s*"manage_ride_log"/);
  assert.doesNotMatch(form, /from\("ride_logs"\)\.insert/);
  assert.doesNotMatch(history, /from\("ride_logs"\)\.delete/);
});

test("Riding keeps official rides immutable in member history", async () => {
  const history = await read(files.history);

  assert.match(history, /Official Agenda Distance/);
  assert.match(history, /ride\.source_type !== "official_agenda"/);
  assert.match(history, /confirmLabel: "Hapus Catatan"/);
  assert.match(history, /destructive: true/);
});

test("Riding preserves cache, recap, chart, and form contracts", async () => {
  const page = await read(files.page);
  const summary = await read(files.summary);
  const form = await read(files.form);

  assert.match(page, /fetchWithCache<RidingSnapshot>/);
  assert.match(page, /ttlMs: 60_000/);
  assert.match(page, /PageSkeleton title="Memuat Data Catatan Riding\.\.\."/);
  assert.match(summary, /dynamic\(/);
  assert.match(summary, /components\/riding-stat-chart/);
  assert.match(summary, /Ride Recap berhasil disalin/);
  assert.match(form, /JARAK TERHITUNG OTOMATIS/);
  assert.match(form, /SIMPAN & VERIFIKASI SEBAGAI PENGURUS/);
});
