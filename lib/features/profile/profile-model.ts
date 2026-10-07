export function getProfileRoleClass(role: string | null) {
  const normalized = (role ?? "").toUpperCase().trim();
  if (normalized === "PRESIDENT") return "badge-president";
  if (normalized === "FOUNDER") return "badge-founder";
  if (normalized === "EXCECUTOR" || normalized === "EXECUTOR") return "badge-executor";
  if (normalized === "NEGOSIATOR") return "badge-negosiator";
  if (normalized === "CAPROS") return "badge-capros";
  if (normalized === "PROSPEK") return "badge-prospek";
  if (normalized === "VIRGIN") return "badge-virgin";
  if (normalized === "LIFE MEMBER" || normalized === "LIFEMEMBER") return "badge-lifemember";
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

export function getProfileRideStats(
  rides: readonly { status: string }[],
  rsvps: readonly { status: string }[],
) {
  return {
    approvedRidesCount: rides.filter((ride) => ride.status === "approved").length,
    attendedAgendaCount: rsvps.filter((rsvp) => rsvp.status === "attending").length,
  };
}
