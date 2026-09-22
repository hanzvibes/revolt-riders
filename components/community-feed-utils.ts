import type { AppRole } from "@/context/data-cache-context";

export const SOCIAL_FEED_STAFF_ROLES: AppRole[] = [
  "road_captain",
  "admin",
  "superadmin",
];

export const socialRoleLabel: Record<AppRole, string> = {
  member: "Member",
  road_captain: "Road Captain",
  treasurer: "Bendahara",
  admin: "Admin",
  superadmin: "Superadmin",
};

export function socialInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? `${words[0][0]}${words[1][0]}`
      : words[0]?.slice(0, 2) || "RR"
  ).toUpperCase();
}

export function socialRelativeDate(value: string | null) {
  if (!value) return "Baru saja";

  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(difference / 60_000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} mnt`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari`;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getSocialUrlDetails(value: string) {
  try {
    const url = new URL(value);
    return {
      hostname: url.hostname.replace(/^www\./, ""),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}
