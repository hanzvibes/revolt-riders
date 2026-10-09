import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const routes = [
  ["app/profil/page.tsx", "@/components/profile-screen"],
  ["app/member/page.tsx", "@/components/member-screen"],
  ["app/kas/page.tsx", "@/components/cash-screen"],
  ["app/post/[id]/page.tsx", "@/components/post-thread-screen"],
  ["app/leaderboard/page.tsx", "@/components/leaderboard-screen"],
  ["app/admin/page.tsx", "@/components/admin-overview-screen"],
];

for (const [path, screenImport] of routes) {
  test(`${path} is a thin route wrapper`, async () => {
    const source = await read(path);
    assert.ok(source.length < 1200, `${path} should stay thin`);
    assert.ok(source.includes(screenImport), `${path} should delegate to ${screenImport}`);
  });
}

test("legacy global CSS no longer owns floating bottom navigation", async () => {
  const css = await read("app/globals.css");
  assert.doesNotMatch(css, /\.bottom\s*\{/);
  assert.doesNotMatch(css, /\.bottom\s+(?:a|button|small)/);
});
