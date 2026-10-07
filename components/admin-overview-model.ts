import { type EventRecord } from "@/lib/domain";

export type Account = { role: string; status: "pending" | "active" | "inactive" };
export type AdminEventRecord = EventRecord & {
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
};
export type PendingRequest = {
  id: string;
  user_id: string;
  member_external_id: string;
  email: string | null;
};
export type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
};
export type Invitation = { event_id: string; member_external_id: string };
export type Rsvp = {
  event_id: string;
  member_external_id: string;
  status: "attending" | "declined" | "maybe";
  guest_count: number;
  responded_at: string;
};
export type BulkLink = { memberId: string; name: string; url: string };
export type ManagedAccount = {
  id: string;
  member_external_id: string;
  role: "member" | "road_captain" | "treasurer" | "admin" | "superadmin";
  status: string;
};
export const roles: ManagedAccount["role"][] = [
  "member",
  "road_captain",
  "treasurer",
  "admin",
  "superadmin",
];

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function secureToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function downloadLinks(links: BulkLink[], eventTitle: string) {
  const rows = [
    ["Member ID", "Nama", "Link Undangan"],
    ...links.map((link) => [link.memberId, link.name, link.url]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `undangan-${slugify(eventTitle || "revolt-riders")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}
