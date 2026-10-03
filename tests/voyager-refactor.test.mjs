import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Voyager keeps model types and format helpers outside the page", async () => {
  const page = await read("app/voyager/page.tsx");
  const model = await read("app/voyager/voyager-model.ts");

  assert.match(page, /from "\.\/voyager-model"/);
  assert.doesNotMatch(page, /type VoyagerEvent = \{/);
  assert.doesNotMatch(page, /type GalleryPhoto = \{/);
  assert.doesNotMatch(page, /const formatDate =/);
  assert.doesNotMatch(page, /const formatKm =/);
  assert.doesNotMatch(page, /const isAdminRole =/);

  assert.match(model, /export type VoyagerEvent = \{/);
  assert.match(model, /export type GalleryPhoto = \{/);
  assert.match(model, /export type VoyagerSnapshot = \{/);
  assert.match(model, /export const formatDate/);
  assert.match(model, /export const formatKm/);
  assert.match(model, /export const isAdminRole/);
});

test("Voyager refactor preserves activity, official KM, and media boundaries", async () => {
  const page = await read("app/voyager/page.tsx");
  const data = await read("app/voyager/voyager-data.ts");
  const workspace = `${page}\n${data}`;

  assert.match(page, /rpc\(\s*"save_event_activity"/);
  assert.match(page, /rpc\(\s*"sync_event_official_rides"/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(data, /from\("club-activity"\)/);
  assert.doesNotMatch(workspace, /from\("event_attendance"\)/);
  assert.doesNotMatch(workspace, /from\("event_checkin_codes"\)/);
});
