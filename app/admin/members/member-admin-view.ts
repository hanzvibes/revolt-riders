import type { Detail, Member, MemberAccount } from "./member-admin-model";

export type MemberFilterTab = "all" | "with_account" | "without_account";

type MemberAdminViewInput = {
  members: Member[];
  details: Detail[];
  accounts: MemberAccount[];
  query: string;
  filterTab: MemberFilterTab;
};

export const deriveMemberAdminView = ({
  members,
  details,
  accounts,
  query,
  filterTab,
}: MemberAdminViewInput) => {
  const detailByMember = new Map(
    details.map((detail) => [detail.member_external_id, detail]),
  );
  const accountByMember = new Map(
    accounts.map((memberAccount) => [
      memberAccount.member_external_id,
      memberAccount,
    ]),
  );

  const withAccountCount = members.filter((member) =>
    accountByMember.has(member.member_external_id),
  ).length;
  const withoutAccountCount = members.length - withAccountCount;
  const normalizedQuery = query.trim().toLowerCase();

  const results = members.filter((member) => {
    const hasAccount = accountByMember.has(member.member_external_id);
    if (filterTab === "with_account" && !hasAccount) return false;
    if (filterTab === "without_account" && hasAccount) return false;

    if (!normalizedQuery) return true;
    const detail = detailByMember.get(member.member_external_id);
    return (
      member.member_external_id.toLowerCase().includes(normalizedQuery) ||
      member.full_name.toLowerCase().includes(normalizedQuery) ||
      (member.nickname ?? "").toLowerCase().includes(normalizedQuery) ||
      (member.city ?? "").toLowerCase().includes(normalizedQuery) ||
      (detail?.motorcycle ?? "").toLowerCase().includes(normalizedQuery)
    );
  });

  return {
    detailByMember,
    accountByMember,
    withAccountCount,
    withoutAccountCount,
    results,
  };
};
