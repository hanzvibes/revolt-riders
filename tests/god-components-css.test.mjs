import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

async function exists(path) {
  try {
    await access(new URL(path, root), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const screenLimits = new Map([
  ["components/profile-screen.tsx", 520],
  ["components/admin-overview-screen.tsx", 520],
  ["components/member-screen.tsx", 520],
  ["components/cash-screen.tsx", 520],
  ["components/community-feed-screen.tsx", 520],
  ["components/leaderboard-screen.tsx", 520],
  ["components/app-shell.tsx", 520],
]);

test("core screens stay below the god-component guardrail", async () => {
  for (const [path, maxLines] of screenLimits) {
    const source = await read(path);
    const lineCount = source.split(/\r?\n/).length;
    assert.ok(lineCount <= maxLines, `${path} has ${lineCount} lines; max is ${maxLines}`);
  }
});

test("large screens delegate controller/model responsibilities", async () => {
  const expected = [
    "components/profile-screen-model.ts",
    "components/use-profile-screen.ts",
    "components/admin-overview-model.ts",
    "components/use-admin-overview.ts",
    "components/member-screen-model.ts",
    "components/use-member-screen.ts",
    "components/cash-screen-model.ts",
    "components/use-cash-screen.ts",
    "components/community-feed-controller.ts",
    "components/leaderboard-screen-model.ts",
    "components/use-leaderboard-screen.ts",
    "components/navigation-config.ts",
    "components/sidebar-navigation.tsx",
    "components/mobile-navigation.tsx",
  ];
  for (const path of expected) {
    assert.equal(await exists(path), true, `${path} must exist`);
  }
});

test("CSS entry files are ownership routers instead of monoliths", async () => {
  for (const path of ["app/system-ui.css", "app/social-feed.css", "app/native-admin.css"]) {
    const source = await read(path);
    const lineCount = source.split(/\r?\n/).length;
    assert.ok(lineCount <= 120, `${path} has ${lineCount} lines; max is 120`);
    assert.match(source, /@import/);
  }
});

test("feature CSS ownership files exist", async () => {
  const expected = [
    "app/styles/system/core.css",
    "app/styles/system/dashboard.css",
    "app/styles/system/member.css",
    "app/styles/system/riding.css",
    "app/styles/system/leaderboard.css",
    "app/styles/system/profile.css",
    "app/styles/system/voyager.css",
    "app/styles/system/audit.css",
    "app/styles/social/feed-core.css",
    "app/styles/social/thread.css",
    "app/styles/social/composer.css",
    "app/styles/social/polish.css",
    "app/styles/admin/core.css",
    "app/styles/admin/member-directory.css",
    "app/styles/admin/leaderboard.css",
    "app/styles/admin/dashboard.css",
    "app/styles/admin/members.css",
    "app/styles/admin/shell.css",
  ];
  for (const path of expected) {
    assert.equal(await exists(path), true, `${path} must exist`);
  }
});
