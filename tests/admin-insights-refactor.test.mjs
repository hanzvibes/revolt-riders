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

test("admin insights keeps analytics and Supabase reads behind focused modules", async () => {
  const page = await read("app/admin/insights/page.tsx");
  await read("app/admin/insights/insights-model.ts");
  const data = await read("app/admin/insights/insights-data.ts");

  assert.match(page, /from "\.\/insights-model"/);
  assert.match(page, /from "\.\/insights-data"/);
  assert.doesNotMatch(page, /getSupabaseBrowserClient/);
  assert.doesNotMatch(page, /\.from\("cash_transactions"\)/);

  assert.match(data, /from\("event_invitations"\)/);
  assert.match(data, /from\("club_cash_transactions"\)/);
  assert.match(data, /\.is\("voided_at", null\)/);
});

test("insights rates stay bounded by matching invited and attending member-event pairs", async () => {
  const { calculateInsights } = await importTsModule(
    "app/admin/insights/insights-model.ts",
  );

  const analytics = calculateInsights({
    accounts: [
      { user_id: "u1", member_external_id: "RR-001", status: "active" },
      { user_id: "u2", member_external_id: "RR-002", status: "inactive" },
    ],
    profiles: [],
    publishedEvents: 2,
    invitations: [
      { event_id: "e1", member_external_id: "RR-001" },
      { event_id: "e1", member_external_id: "RR-002" },
    ],
    rsvps: [
      { event_id: "e1", member_external_id: "RR-001", status: "attending" },
      { event_id: "e1", member_external_id: "RR-999", status: "attending" },
      { event_id: "e2", member_external_id: "RR-888", status: "attending" },
    ],
    attendance: [
      { event_id: "e1", member_external_id: "RR-001" },
      { event_id: "e1", member_external_id: "RR-999" },
      { event_id: "e2", member_external_id: "RR-777" },
    ],
    rides: [{ distance_km: "12.5" }, { distance_km: 7.5 }],
    cash: [
      { transaction_type: "income", amount: "100000" },
      { transaction_type: "expense", amount: 25000 },
      { transaction_type: "advance", amount: 999999 },
    ],
    audits: [],
  });

  assert.equal(analytics.activeMembers, 1);
  assert.equal(analytics.publishedEvents, 2);
  assert.equal(analytics.responseRate, 50);
  assert.equal(analytics.attendanceRate, 67);
  assert.equal(analytics.totalKm, 20);
  assert.equal(analytics.balance, 75000);
});

test("insights handles duplicate pairs and empty denominators safely", async () => {
  const { calculateInsights } = await importTsModule(
    "app/admin/insights/insights-model.ts",
  );

  const analytics = calculateInsights({
    accounts: [],
    profiles: [],
    publishedEvents: 0,
    invitations: [],
    rsvps: [
      { event_id: "e1", member_external_id: "RR-001", status: "attending" },
      { event_id: "e1", member_external_id: "RR-001", status: "attending" },
    ],
    attendance: [
      { event_id: "e1", member_external_id: "RR-001" },
      { event_id: "e1", member_external_id: "RR-001" },
    ],
    rides: [{ distance_km: null }],
    cash: [],
    audits: [],
  });

  assert.equal(analytics.responseRate, 0);
  assert.equal(analytics.attendanceRate, 100);
  assert.equal(analytics.totalKm, 0);
  assert.equal(analytics.balance, 0);
});

test("insights data loader throws database errors instead of masking them", async () => {
  const data = await read("app/admin/insights/insights-data.ts");
  assert.match(data, /if \(failed\) throw failed/);
});
