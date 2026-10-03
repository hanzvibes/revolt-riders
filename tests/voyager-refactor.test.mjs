import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const voyagerFiles = {
  page: "app/voyager/page.tsx",
  model: "app/voyager/voyager-model.ts",
  data: "app/voyager/voyager-data.ts",
  derived: "app/voyager/voyager-derived.ts",
  actions: "app/voyager/voyager-actions.ts",
  hub: "app/voyager/voyager-hub.tsx",
  detail: "app/voyager/voyager-detail-sheet.tsx",
  manage: "app/voyager/voyager-manage-sheet.tsx",
};

test("Voyager keeps feature responsibilities in focused modules", async () => {
  const page = await read(voyagerFiles.page);
  const model = await read(voyagerFiles.model);
  const derived = await read(voyagerFiles.derived);

  assert.match(page, /from "\.\/voyager-model"/);
  assert.match(page, /from "\.\/voyager-derived"/);
  assert.match(page, /VoyagerHub/);
  assert.match(page, /VoyagerDetailSheet/);
  assert.match(page, /VoyagerManageSheet/);
  assert.doesNotMatch(page, /type VoyagerEvent = \{/);
  assert.doesNotMatch(page, /const formatDate =/);
  assert.doesNotMatch(page, /voyager-manage-section/);
  assert.doesNotMatch(page, /voyager-command-card/);
  assert.ok(page.split("\n").length <= 230, "Voyager route should stay a thin orchestrator");

  assert.match(model, /export type VoyagerEvent = \{/);
  assert.match(model, /export type VoyagerSnapshot = \{/);
  assert.match(model, /export const formatDate/);
  assert.match(model, /export const formatKm/);
  assert.match(model, /export const isAdminRole/);
  assert.match(derived, /export function deriveVoyagerState/);
  assert.match(derived, /participantIdsByEvent/);
  assert.match(derived, /featuredMemberStatus/);
});

test("Voyager read and mutation boundaries stay explicit", async () => {
  const page = await read(voyagerFiles.page);
  const data = await read(voyagerFiles.data);
  const actions = await read(voyagerFiles.actions);
  const workspace = [page, data, actions].join("\n");

  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(data, /createSignedUrls/);
  assert.match(actions, /rpc\(\s*"save_event_activity"/);
  assert.match(actions, /rpc\(\s*"sync_event_official_rides"/);
  assert.match(actions, /from\("club-activity"\)/);
  assert.match(actions, /from\("club_gallery"\)\.insert/);
  assert.match(actions, /from\("club_gallery"\)[\s\S]*\.delete\(\)/);
  assert.doesNotMatch(page, /getSupabaseBrowserClient/);
  assert.doesNotMatch(workspace, /from\("event_attendance"\)/);
  assert.doesNotMatch(workspace, /from\("event_checkin_codes"\)/);
});

test("Voyager UI split preserves status, gallery, management, and cache contracts", async () => {
  const page = await read(voyagerFiles.page);
  const hub = await read(voyagerFiles.hub);
  const detail = await read(voyagerFiles.detail);
  const manage = await read(voyagerFiles.manage);

  assert.match(page, /fetchWithCache<VoyagerSnapshot>/);
  assert.match(page, /ttlMs: 90_000/);
  assert.match(page, /PageSkeleton title="Memuat Voyager\.\.\."/);
  assert.match(hub, /aria-label="Status Voyager saya"/);
  assert.match(hub, /Activity & History/);
  assert.match(hub, /Activity Gallery/);
  assert.match(hub, /loading="lazy"/);
  assert.match(hub, /decoding="async"/);
  assert.match(detail, /VOYAGER DETAIL/);
  assert.match(detail, /sizes="\(max-width: 520px\) 50vw, 320px"/);
  assert.match(manage, /VOYAGER MANAGEMENT/);
  assert.match(manage, /Tidak ada minimum KM/);
  assert.match(manage, /confirmLabel: "Hapus Foto"/);
  assert.match(manage, /destructive: true/);
});
