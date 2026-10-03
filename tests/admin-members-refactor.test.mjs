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

test("Admin members routes mutations through the action service", async () => {
  const screen = await read("app/admin/members/manage-members-page.tsx");
  const actions = await read("app/admin/members/member-admin-actions.ts");

  assert.match(screen, /from "\.\/member-admin-actions"/);
  assert.match(screen, /await resetMemberAccountPassword\(form\.memberId, newPassword\)/);
  assert.match(screen, /const saveError = await upsertMemberProfile\(form\)/);
  assert.match(screen, /await syncMemberAccountAccess\(\{/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /\.rpc\(/);
  assert.doesNotMatch(screen, /functions\.invoke\(/);

  assert.match(actions, /rpc\("upsert_member_profile"/);
  assert.match(actions, /rpc\("set_member_account_status"/);
  assert.match(actions, /rpc\("set_member_account_role"/);
  assert.match(actions, /functions\.invoke\(/);
  assert.match(actions, /"admin-reset-member-password"/);
  assert.match(actions, /return error;/);
});

test("Admin members derives search, filter, indexes, and counts outside the screen", async () => {
  const screen = await read("app/admin/members/manage-members-page.tsx");
  const view = await read("app/admin/members/member-admin-view.ts");

  assert.match(screen, /from "\.\/member-admin-view"/);
  assert.match(screen, /useState<MemberFilterTab>\("all"\)/);
  assert.match(screen, /deriveMemberAdminView\(\{/);
  assert.doesNotMatch(screen, /members\.filter\(/);
  assert.doesNotMatch(screen, /new Map\(/);

  assert.match(view, /export type MemberFilterTab = "all" \| "with_account" \| "without_account"/);
  assert.match(view, /const detailByMember = new Map\(/);
  assert.match(view, /const accountByMember = new Map\(/);
  assert.match(view, /const withAccountCount = members\.filter\(/);
  assert.match(view, /const withoutAccountCount = members\.length - withAccountCount/);
  assert.match(view, /member_external_id\.toLowerCase\(\)\.includes\(normalizedQuery\)/);
  assert.match(view, /full_name\.toLowerCase\(\)\.includes\(normalizedQuery\)/);
  assert.match(view, /detail\?\.motorcycle \?\? ""/);
});

test("Admin members keeps desktop and mobile directory presentation outside the screen", async () => {
  const screen = await read("app/admin/members/manage-members-page.tsx");
  const directory = await read("app/admin/members/member-admin-directory.tsx");

  assert.match(screen, /from "\.\/member-admin-directory"/);
  assert.match(screen, /<MemberAdminDesktopTable/);
  assert.match(screen, /<MemberAdminMobileCards/);
  assert.doesNotMatch(screen, /className="admin-member-table-card"/);
  assert.doesNotMatch(screen, /className="admin-member-cards-mobile"/);
  assert.doesNotMatch(screen, /<Pencil/);

  assert.match(directory, /export function MemberAdminDesktopTable/);
  assert.match(directory, /export function MemberAdminMobileCards/);
  assert.match(directory, /className="admin-member-table-card"/);
  assert.match(directory, /className="admin-member-cards-mobile"/);
  assert.match(directory, /onClick=\{\(\) => onEdit\(member\)\}/);
  assert.match(directory, /event\.stopPropagation\(\);[\s\S]*onEdit\(member\);/);
  assert.match(directory, /Member Tidak Ditemukan/);
  assert.match(directory, /Belum Ada Akun/);
});
