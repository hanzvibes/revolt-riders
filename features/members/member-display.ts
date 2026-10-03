export function getMemberInitials(name: string, nickname: string | null) {
  const text = (nickname || name || "RR").trim();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

export function getMemberRoleClass(role: string | null) {
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
}
