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

const managedEvent = (overrides = {}) => ({
  id: "event-1",
  title: "Sunday Ride",
  type: "riding",
  description: null,
  location_name: "Situbondo",
  location_url: null,
  start_at: "2026-05-24T02:00:00.000Z",
  meetup_at: null,
  end_at: null,
  status: "published",
  is_public: true,
  cancellation_reason: null,
  counts_as_mandatory: true,
  official_distance_km: 120,
  official_support: null,
  activity_summary: null,
  ...overrides,
});

test("admin events keeps a thin route and focused module boundaries", async () => {
  const entry = await read("app/admin/events/page.tsx");
  const screen = await read("app/admin/events/events-screen.tsx");
  const model = await read("app/admin/events/events-model.ts");
  const data = await read("app/admin/events/events-data.ts");
  const actions = await read("app/admin/events/events-actions.ts");
  const list = await read("app/admin/events/events-list.tsx");
  const form = await read("app/admin/events/events-form-modal.tsx");

  assert.match(entry, /^"use client";/);
  assert.match(entry, /import AdminEventsScreen from "\.\/events-screen";/);
  assert.match(entry, /export default AdminEventsScreen;/);

  assert.match(screen, /from "\.\/events-model"/);
  assert.match(screen, /from "\.\/events-data"/);
  assert.match(screen, /from "\.\/events-actions"/);
  assert.match(screen, /from "\.\/events-list"/);
  assert.match(screen, /from "\.\/events-form-modal"/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /\.from\("events"\)/);
  assert.match(screen, /admin:events:workspace/);
  assert.match(screen, /dashboard_upcoming_events/);
  assert.match(screen, /voyager:/);
  assert.match(screen, /riding:/);

  assert.match(model, /Asia\/Jakarta/);
  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("event_rsvps"\)/);
  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(data, /table: "events"/);
  assert.match(data, /table: "event_rsvps"/);
  assert.match(data, /table: "event_participants"/);

  assert.match(actions, /save_event_activity/);
  assert.match(actions, /sync_event_official_rides/);
  assert.match(actions, /delete_event/);
  assert.match(list, /event-management-list/);
  assert.match(form, /Count as Mandatory Ride/);
  assert.match(form, /Official Trip Distance/);
});

test("admin events timezone conversion preserves Jakarta wall-clock time", async () => {
  const { fromInputDate, toInputDate } = await importTsModule(
    "app/admin/events/events-model.ts",
  );

  assert.equal(toInputDate("2026-05-24T02:00:00.000Z"), "2026-05-24T09:00");
  assert.equal(fromInputDate("2026-05-24T09:00"), "2026-05-24T02:00:00.000Z");
  assert.equal(toInputDate(null), "");
  assert.equal(fromInputDate(""), null);
  assert.throws(() => fromInputDate("not-a-date"), /Waktu agenda tidak valid/);
});

test("admin events model handles happy-path filtering and RSVP counts", async () => {
  const { filterEvents, getRsvpStats } = await importTsModule(
    "app/admin/events/events-model.ts",
  );
  const events = [
    managedEvent(),
    managedEvent({ id: "event-2", title: "Kopdar Malam", type: "kopdar", status: "draft" }),
  ];
  const rsvps = [
    { event_id: "event-1", status: "attending" },
    { event_id: "event-1", status: "attending" },
    { event_id: "event-1", status: "maybe" },
  ];

  assert.deepEqual(filterEvents(events, "published", "Sunday").map(({ id }) => id), ["event-1"]);
  assert.deepEqual(getRsvpStats(rsvps, "event-1"), {
    attending: 2,
    declined: 0,
    maybe: 1,
  });
});

test("admin events model handles empty filters, member search, and participant toggles", async () => {
  const { filterEvents, filterMembers, parseOfficialDistance, toggleParticipantId } =
    await importTsModule("app/admin/events/events-model.ts");

  const events = [
    managedEvent(),
    managedEvent({ id: "event-2", title: "Cancelled", status: "cancelled" }),
  ];
  const members = [
    { member_external_id: "RR-001", full_name: "Rider Satu", nickname: "Satu", city: "Situbondo" },
    { member_external_id: "RR-002", full_name: "Rider Dua", nickname: null, city: "Bondowoso" },
  ];

  assert.deepEqual(filterEvents(events, "all", "   ").map(({ id }) => id), ["event-1"]);
  assert.deepEqual(filterMembers(members, "RR-002").map(({ member_external_id }) => member_external_id), ["RR-002"]);
  assert.deepEqual(toggleParticipantId(["RR-001"], "RR-002"), ["RR-001", "RR-002"]);
  assert.deepEqual(toggleParticipantId(["RR-001", "RR-002"], "RR-001"), ["RR-002"]);
  assert.equal(parseOfficialDistance(""), null);
  assert.equal(parseOfficialDistance("-5"), 0);
  assert.equal(parseOfficialDistance("184.5"), 184.5);
});

test("admin events action layer keeps database errors throwable", async () => {
  const actions = await read("app/admin/events/events-actions.ts");
  assert.ok((actions.match(/throw/g) ?? []).length >= 5);
  assert.ok((actions.match(/if \(error\) throw error;/g) ?? []).length >= 4);
});
