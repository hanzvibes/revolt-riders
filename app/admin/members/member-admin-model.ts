export type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
  join_date: string | null;
  club_role: string | null;
  total_km: number;
};

export type Detail = {
  member_external_id: string;
  nickname_override: string | null;
  motorcycle: string | null;
  city_override: string | null;
};

export type MemberAccount = {
  id: string;
  member_external_id: string;
  role: string;
  status: "active" | "inactive" | "pending";
};

export type MemberAdminSnapshot = {
  members: Member[];
  details: Detail[];
  accounts: MemberAccount[];
};

export type MemberForm = {
  memberId: string;
  fullName: string;
  nickname: string;
  city: string;
  joinDate: string;
  clubRole: string;
  totalKm: string;
  motorcycle: string;
};

export const emptyForm: MemberForm = {
  memberId: "",
  fullName: "",
  nickname: "",
  city: "",
  joinDate: "",
  clubRole: "",
  totalKm: "0",
  motorcycle: "",
};

export const roles = [
  "member",
  "road_captain",
  "treasurer",
  "admin",
  "superadmin",
] as const;

export const getInitials = (name: string, nickname: string | null) => {
  const text = (nickname || name || "RR").trim();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
};

export const getRoleClass = (role: string | null) => {
  const normalizedRole = (role ?? "").toUpperCase().trim();
  if (normalizedRole === "PRESIDENT") return "badge-president";
  if (normalizedRole === "FOUNDER") return "badge-founder";
  if (normalizedRole === "EXCECUTOR" || normalizedRole === "EXECUTOR") {
    return "badge-executor";
  }
  if (normalizedRole === "NEGOSIATOR") return "badge-negosiator";
  if (normalizedRole === "CAPROS") return "badge-capros";
  if (normalizedRole === "PROSPEK") return "badge-prospek";
  if (normalizedRole === "VIRGIN") return "badge-virgin";
  if (normalizedRole === "LIFE MEMBER" || normalizedRole === "LIFEMEMBER") {
    return "badge-lifemember";
  }
  if (normalizedRole.includes("CAPTAIN")) return "badge-rc";
  if (
    normalizedRole.includes("ADMIN") ||
    normalizedRole.includes("KETUA") ||
    normalizedRole.includes("SEKRETARIS") ||
    normalizedRole.includes("BENDAHARA")
  ) {
    return "badge-admin";
  }
  return "";
};
