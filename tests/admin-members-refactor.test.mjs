import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Admin members keeps model helpers and snapshot loading modular", async () => {
  const screen = await read("app/admin/members/manage-members-page.tsx");
  const model = await read("app/admin/members/member-admin-model.ts");
  const data = await read("app/admin/members/member-admin-data.ts");

  assert.match(screen, /from "\.\/member-admin-model"/);
  assert.match(screen, /from "\.\/member-admin-data"/);
  assert.match(
    screen,
    /fetchWithCache<MemberAdminSnapshot>\([\s\S]*"admin:members",[\s\S]*fetchMemberAdminSnapshot/,
  );
  assert.doesNotMatch(screen, /type Member = \{/);
  assert.doesNotMatch(screen, /\.from\("member_profiles"\)/);

  assert.match(model, /export type Member = \{/);
  assert.match(model, /export type MemberForm = \{/);
  assert.match(model, /export const getInitials/);
  assert.match(model, /export const getRoleClass/);

  assert.match(data, /\.from\("member_profiles"\)/);
  assert.match(data, /\.from\("member_details"\)/);
  assert.match(data, /\.from\("member_accounts"\)/);
  assert.match(data, /total_km: Number\(member\.total_km\)/);
});
