import type { MemberDisplay } from "./member-data";

export function filterMembers(
  members: MemberDisplay[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return members;

  return members.filter((member) => {
    const target = [
      member.full_name,
      member.nickname ?? "",
      member.member_external_id,
      member.club_role ?? "",
      member.city ?? "",
      member.motorcycle ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return target.includes(normalized);
  });
}

export function getMemberDirectoryTotals(
  members: MemberDisplay[],
) {
  return {
    totalKm: members.reduce(
      (sum, member) => sum + (Number(member.total_km) || 0),
      0,
    ),
    totalActivities: members.reduce(
      (sum, member) => sum + (Number(member.touring_count) || 0),
      0,
    ),
  };
}

export function getMemberInitials(
  name: string,
  nickname: string | null,
) {
  const text = (nickname || name || "RR").trim();
  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return text.slice(0, 2).toUpperCase();
}

export function getMemberRoleClass(role: string | null) {
  const normalized = (role ?? "").toUpperCase().trim();

  if (normalized === "PRESIDENT") return "badge-president";
  if (normalized === "FOUNDER") return "badge-founder";
  if (normalized === "EXCECUTOR" || normalized === "EXECUTOR") {
    return "badge-executor";
  }
  if (normalized === "NEGOSIATOR") return "badge-negosiator";
  if (normalized === "CAPROS") return "badge-capros";
  if (normalized === "PROSPEK") return "badge-prospek";
  if (normalized === "VIRGIN") return "badge-virgin";
  if (normalized === "LIFE MEMBER" || normalized === "LIFEMEMBER") {
    return "badge-lifemember";
  }
  if (normalized.includes("CAPTAIN")) return "badge-rc";
  if (
    normalized.includes("ADMIN") ||
    normalized.includes("KETUA") ||
    normalized.includes("SEKRETARIS") ||
    normalized.includes("BENDAHARA")
  ) {
    return "badge-admin";
  }

  return "";
}
