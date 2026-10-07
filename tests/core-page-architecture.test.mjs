import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const surfaces = [
  ["profil", "components/profile/profile-screen.tsx", "lib/features/profile/profile-model.ts", "lib/features/profile/profile-data.ts", "ProfileScreen"],
  ["member", "components/member/member-screen.tsx", "lib/features/member/member-model.ts", "lib/features/member/member-data.ts", "MemberScreen"],
  ["kas", "components/cash/cash-screen.tsx", "lib/features/cash/cash-model.ts", "lib/features/cash/cash-data.ts", "CashScreen"],
  ["post/[id]", "components/post/thread-screen.tsx", "lib/features/post/thread-model.ts", "lib/features/post/thread-data.ts", "ThreadScreen"],
  ["leaderboard", "components/leaderboard/leaderboard-screen.tsx", "lib/features/leaderboard/leaderboard-model.ts", "lib/features/leaderboard/leaderboard-data.ts", "LeaderboardScreen"],
  ["admin", "components/admin/admin-overview-screen.tsx", "lib/features/admin/admin-overview-model.ts", "lib/features/admin/admin-overview-data.ts", "AdminOverviewScreen"],
];

test("large route pages delegate to feature screens with model and data boundaries", async () => {
  for (const [route, screenPath, modelPath, dataPath, screenName] of surfaces) {
    const pagePath = `app/${route}/page.tsx`;
    const page = await read(pagePath);

    assert.ok(page.split(/\r?\n/).length <= 12, `${pagePath} must stay a thin route wrapper`);
    assert.match(page, new RegExp(screenName));
    assert.doesNotMatch(page, /getSupabaseBrowserClient|useState|useEffect|useMemo|useCallback/);

    for (const path of [screenPath, modelPath, dataPath]) {
      await assert.doesNotReject(() => access(new URL(path, root)), `${path} must exist`);
    }
  }
});

test("feature model modules own reusable pure page logic", async () => {
  const expectations = [
    ["lib/features/profile/profile-model.ts", ["getProfileRoleClass", "getProfileRideStats"]],
    ["lib/features/member/member-model.ts", ["filterMembers", "getMemberInitials", "getMemberRoleClass"]],
    ["lib/features/cash/cash-model.ts", ["filterCashTransactions", "calculateCashFlow", "formatRupiah"]],
    ["lib/features/post/thread-model.ts", ["getRootComments", "buildRepliesByParent"]],
    ["lib/features/leaderboard/leaderboard-model.ts", ["filterLeaderboardRiders", "buildLeaderboardRankMap", "getLeaderboardInitials"]],
    ["lib/features/admin/admin-overview-model.ts", ["slugifyAdminValue", "calculateAdminEventStats"]],
  ];

  for (const [path, exports] of expectations) {
    const source = await read(path);
    for (const name of exports) {
      assert.match(source, new RegExp(`export (?:const|function) ${name}\\b`), `${path} must export ${name}`);
    }
  }
});

test("bottom navigation selectors live outside legacy global and system stylesheets", async () => {
  const globals = await read("app/globals.css");
  const system = await read("app/system-ui.css");
  const bottom = await read("app/bottom-navigation.css");

  assert.doesNotMatch(globals, /\.bottom(?:\b|[ .:#])/);
  assert.doesNotMatch(system, /\.app-shell \.bottom(?:\b|[ .:#])/);
  assert.match(bottom, /\.app-shell \.bottom/);
});

test("admin root is a launcher instead of duplicating member-account workflows", async () => {
  const screen = await read("components/admin/admin-overview-screen.tsx");
  const data = await read("lib/features/admin/admin-overview-data.ts");

  for (const href of [
    "/admin/events",
    "/admin/members",
    "/admin/join-requests",
    "/admin/attendance",
    "/admin/insights",
  ]) {
    assert.match(screen, new RegExp(`href=["']${href}["']`));
  }

  assert.doesNotMatch(screen, /approve_member_account_request/);
  assert.doesNotMatch(screen, /reject_member_account_request/);
  assert.doesNotMatch(screen, /set_member_account_role/);
  assert.doesNotMatch(screen, /Pengaturan pengurus/);
  assert.doesNotMatch(screen, /Permintaan akun member/);
  assert.doesNotMatch(data, /from\("member_accounts"\)/);
});
