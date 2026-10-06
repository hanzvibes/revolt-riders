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

test("admin attendance keeps data and mutations behind focused modules", async () => {
  const page = await read("app/admin/attendance/page.tsx");
  const model = await read("app/admin/attendance/attendance-model.ts");
  const data = await read("app/admin/attendance/attendance-data.ts");
  const actions = await read("app/admin/attendance/attendance-actions.ts");

  assert.match(page, /from "\.\/attendance-model"/);
  assert.match(page, /from "\.\/attendance-data"/);
  assert.match(page, /from "\.\/attendance-actions"/);
  assert.doesNotMatch(page, /getSupabaseBrowserClient/);
  assert.doesNotMatch(page, /\.from\("event_attendance"\)/);

  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("event_attendance"\)/);
  assert.match(data, /from\("event_rsvps"\)/);
  assert.match(data, /table: "event_attendance"/);
  assert.match(data, /table: "event_rsvps"/);

  assert.match(actions, /from\("event_attendance"\)\.insert/);
  assert.match(actions, /23505/);
});

test("admin attendance rate counts only checked-in members who RSVP attending", async () => {
  const { deriveAttendanceSummary } = await importTsModule(
    "app/admin/attendance/attendance-model.ts",
  );

  const summary = deriveAttendanceSummary(
    [
      { id: "a1", event_id: "event-1", member_external_id: "RR-001", checked_in_at: "2026-10-06T10:00:00Z", method: "qr" },
      { id: "a2", event_id: "event-1", member_external_id: "RR-999", checked_in_at: "2026-10-06T10:01:00Z", method: "manual" },
    ],
    [
      { event_id: "event-1", member_external_id: "RR-001", status: "attending" },
      { event_id: "event-1", member_external_id: "RR-002", status: "attending" },
      { event_id: "event-1", member_external_id: "RR-003", status: "maybe" },
    ],
    "event-1",
  );

  assert.equal(summary.eventAttendance.length, 2);
  assert.equal(summary.attendingRsvp.length, 2);
  assert.deepEqual(summary.absentRsvp.map((row) => row.member_external_id), ["RR-002"]);
  assert.equal(summary.attendanceRate, 50);
});

test("admin attendance handles no RSVP and unrelated-event rows safely", async () => {
  const { deriveAttendanceSummary } = await importTsModule(
    "app/admin/attendance/attendance-model.ts",
  );

  const summary = deriveAttendanceSummary(
    [
      { id: "a1", event_id: "event-1", member_external_id: "RR-001", checked_in_at: "2026-10-06T10:00:00Z", method: "manual" },
      { id: "a2", event_id: "event-2", member_external_id: "RR-002", checked_in_at: "2026-10-06T10:01:00Z", method: "qr" },
    ],
    [{ event_id: "event-2", member_external_id: "RR-002", status: "attending" }],
    "event-1",
  );

  assert.equal(summary.eventAttendance.length, 1);
  assert.equal(summary.attendingRsvp.length, 0);
  assert.deepEqual(summary.absentRsvp, []);
  assert.equal(summary.attendanceRate, 0);
});

test("admin attendance action preserves duplicate-check-in error handling", async () => {
  const actions = await read("app/admin/attendance/attendance-actions.ts");

  assert.match(actions, /insertError\.code === "23505"/);
  assert.match(actions, /Member ini sudah tercatat hadir pada agenda yang dipilih\./);
  assert.match(actions, /throw insertError/);
});
