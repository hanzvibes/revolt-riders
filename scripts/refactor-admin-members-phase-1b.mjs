import { readFile, writeFile } from "node:fs/promises";

const target = "app/admin/members/manage-members-page.tsx";
let source = await readFile(target, "utf8");

const importAnchor = 'import { getSupabaseBrowserClient } from "@/lib/supabase/client";\n';
const imports = `${importAnchor}import { fetchMemberAdminSnapshot } from "./member-admin-data";\nimport {\n  emptyForm,\n  getInitials,\n  getRoleClass,\n  roles,\n  type Detail,\n  type Member,\n  type MemberAccount,\n  type MemberAdminSnapshot,\n  type MemberForm,\n} from "./member-admin-model";\n`;

if (!source.includes('from "./member-admin-model"')) {
  if (!source.includes(importAnchor)) {
    throw new Error("Supabase import anchor not found");
  }
  source = source.replace(importAnchor, imports);
}

const definitionsStart = source.indexOf("type Member = {");
const componentStart = source.indexOf("export default function ManageMembersPage() {");
if (definitionsStart === -1 || componentStart === -1 || definitionsStart >= componentStart) {
  throw new Error("Member model definition block not found");
}
source = `${source.slice(0, definitionsStart)}${source.slice(componentStart)}`;

const cacheCall = source.indexOf('        "admin:members",');
if (cacheCall === -1) throw new Error("admin:members cache call not found");

const loaderStart = source.indexOf("        async () => {", cacheCall);
const optionsStart = source.indexOf(
  "        { ttlMs: 45_000, forceRefresh },",
  loaderStart,
);
if (loaderStart === -1 || optionsStart === -1 || loaderStart >= optionsStart) {
  throw new Error("Inline member loader block not found");
}
source = `${source.slice(0, loaderStart)}        fetchMemberAdminSnapshot,\n${source.slice(optionsStart)}`;

await writeFile(target, source);
