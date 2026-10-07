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

test("profile model keeps role badges and activity counts deterministic", async () => {
  const { getProfileRoleClass, getProfileRideStats } = await importTsModule(
    "lib/features/profile/profile-model.ts",
  );

  assert.equal(getProfileRoleClass("President"), "badge-president");
  assert.equal(getProfileRoleClass("road captain"), "badge-rc");
  assert.equal(getProfileRoleClass(null), "");

  assert.deepEqual(
    getProfileRideStats(
      [{ status: "approved" }, { status: "pending" }, { status: "approved" }],
      [{ status: "attending" }, { status: "declined" }],
    ),
    { approvedRidesCount: 2, attendedAgendaCount: 1 },
  );
  assert.deepEqual(getProfileRideStats([], []), {
    approvedRidesCount: 0,
    attendedAgendaCount: 0,
  });
});

test("member model filters case-insensitively and handles sparse metadata", async () => {
  const {
    filterMembers,
    getMemberInitials,
    getMemberRoleClass,
    sumMemberMetric,
  } = await importTsModule("lib/features/member/member-model.ts");

  const members = [
    {
      full_name: "Alpha Rider",
      nickname: "Ace",
      member_external_id: "RR-001",
      club_role: "FOUNDER",
      city: "Situbondo",
      motorcycle: "Honda",
      total_km: 120,
    },
    {
      full_name: "Beta Rider",
      nickname: null,
      member_external_id: "RR-002",
      club_role: null,
      total_km: 80,
    },
  ];

  assert.deepEqual(filterMembers(members, "ace").map((m) => m.member_external_id), ["RR-001"]);
  assert.deepEqual(filterMembers(members, "rr-002").map((m) => m.member_external_id), ["RR-002"]);
  assert.equal(filterMembers(members, "").length, 2);
  assert.equal(getMemberInitials("Alpha Rider", null), "AR");
  assert.equal(getMemberInitials("", null), "RR");
  assert.equal(getMemberRoleClass("FOUNDER"), "badge-founder");
  assert.equal(getMemberRoleClass(null), "");
  assert.equal(sumMemberMetric(members, (member) => member.total_km), 200);
});

test("cash model preserves filtering, void handling, and expense aggregation", async () => {
  const {
    calculateCashFlow,
    calculateExpenseCategories,
    filterCashTransactions,
    getCashMonthKey,
    isCashStaffRole,
  } = await importTsModule("lib/features/cash/cash-model.ts");

  const transactions = [
    {
      transaction_date: "2026-10-02",
      created_at: "2026-10-02T09:00:00Z",
      transaction_type: "income",
      description: "Iuran",
      category: "Member",
      amount: 100000,
      voided_at: null,
    },
    {
      transaction_date: "2026-10-03",
      created_at: "2026-10-03T09:00:00Z",
      transaction_type: "expense",
      description: "Konsumsi",
      category: "Event",
      amount: 40000,
      voided_at: null,
    },
    {
      transaction_date: "2026-10-04",
      created_at: "2026-10-04T09:00:00Z",
      transaction_type: "expense",
      description: "Void item",
      category: "Event",
      amount: 50000,
      voided_at: "2026-10-05T00:00:00Z",
    },
  ];

  assert.equal(getCashMonthKey(transactions[0]), "2026-10");
  assert.equal(isCashStaffRole("treasurer"), true);
  assert.equal(isCashStaffRole("member"), false);
  assert.equal(
    filterCashTransactions(transactions, {
      period: "2026-10",
      type: "expense",
      query: "konsumsi",
    }).length,
    1,
  );
  assert.deepEqual(calculateCashFlow(transactions), {
    income: 100000,
    expense: 40000,
  });
  assert.deepEqual(calculateExpenseCategories(transactions), [
    { label: "Event", value: 40000 },
  ]);
  assert.deepEqual(calculateCashFlow([]), { income: 0, expense: 0 });
});

test("thread model separates root comments from replies", async () => {
  const { buildRepliesByParent, getRootComments } = await importTsModule(
    "lib/features/post/thread-model.ts",
  );
  const comments = [
    { id: "a", parent_comment_id: null },
    { id: "b", parent_comment_id: "a" },
    { id: "c", parent_comment_id: "a" },
  ];

  assert.deepEqual(getRootComments(comments).map((item) => item.id), ["a"]);
  assert.deepEqual(
    buildRepliesByParent(comments).get("a").map((item) => item.id),
    ["b", "c"],
  );
  assert.equal(buildRepliesByParent([]).size, 0);
});

test("leaderboard model keeps ranking and stack transforms stable", async () => {
  const {
    buildLeaderboardRankMap,
    filterLeaderboardRiders,
    getLeaderboardInitials,
    getLeaderboardTopStack,
  } = await importTsModule("lib/features/leaderboard/leaderboard-model.ts");

  const riders = [
    { member_external_id: "RR-001", full_name: "Alpha Rider", total_km: 300 },
    { member_external_id: "RR-002", full_name: "Beta Rider", total_km: 200 },
    { member_external_id: "RR-003", full_name: "Gamma", total_km: 100 },
  ];

  assert.equal(buildLeaderboardRankMap(riders).get("RR-002"), 2);
  assert.deepEqual(
    filterLeaderboardRiders(riders, "beta").map((rider) => rider.member_external_id),
    ["RR-002"],
  );
  assert.equal(filterLeaderboardRiders(riders, "").length, 3);
  assert.equal(getLeaderboardInitials("Alpha Rider"), "AR");
  assert.equal(getLeaderboardInitials("Gamma"), "GA");
  assert.deepEqual(
    getLeaderboardTopStack(riders, 1).map(({ rank, layer }) => ({ rank, layer })),
    [
      { rank: 1, layer: 2 },
      { rank: 2, layer: 0 },
      { rank: 3, layer: 1 },
    ],
  );
});

test("admin overview model calculates RSVP summary without mutation logic", async () => {
  const { calculateAdminEventStats, slugifyAdminValue } = await importTsModule(
    "lib/features/admin/admin-overview-model.ts",
  );

  assert.equal(slugifyAdminValue("Kopdar Malam & Touring"), "kopdar-malam-touring");

  const members = new Map([
    ["RR-001", { name: "Alpha" }],
    ["RR-002", { name: "Beta" }],
  ]);
  const stats = calculateAdminEventStats(
    "event-1",
    [
      { event_id: "event-1", member_external_id: "RR-001" },
      { event_id: "event-1", member_external_id: "RR-002" },
      { event_id: "event-1", member_external_id: "RR-003" },
    ],
    [
      {
        event_id: "event-1",
        member_external_id: "RR-001",
        status: "attending",
        guest_count: 2,
        responded_at: "2026-10-07T02:00:00Z",
      },
      {
        event_id: "event-1",
        member_external_id: "RR-002",
        status: "declined",
        guest_count: 0,
        responded_at: "2026-10-07T01:00:00Z",
      },
    ],
    members,
  );

  assert.equal(stats.invited, 3);
  assert.equal(stats.attending, 1);
  assert.equal(stats.declined, 1);
  assert.equal(stats.noResponse, 1);
  assert.equal(stats.guests, 2);
  assert.equal(stats.responseRate, 67);
  assert.equal(stats.attendees[0].member.name, "Alpha");
});
