import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AdminMember,
  BulkLink,
} from "./admin-overview-data";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function csvCell(value: string) {
  return '"' + value.replaceAll('"', '""') + '"';
}

export function downloadAdminInviteLinks(
  links: BulkLink[],
  eventTitle: string,
) {
  const rows = [
    ["Member ID", "Nama", "Link Undangan"],
    ...links.map((link) => [
      link.memberId,
      link.name,
      link.url,
    ]),
  ];
  const csv = rows
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download =
    "undangan-" +
    slugify(eventTitle || "revolt-riders") +
    ".csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export async function createPersonalInvitation({
  eventId,
  memberId,
  origin,
}: {
  eventId: string;
  memberId: string;
  origin: string;
}) {
  const token = secureToken();
  const tokenHash = await sha256(token);
  const { error } = await getSupabaseBrowserClient()
    .from("event_invitations")
    .upsert(
      {
        event_id: eventId,
        member_external_id: memberId.trim().toUpperCase(),
        token_hash: tokenHash,
      },
      {
        onConflict: "event_id,member_external_id",
      },
    );

  if (error) throw error;
  return origin + "/undangan/" + token;
}

export async function createBulkInvitations({
  eventId,
  members,
  origin,
}: {
  eventId: string;
  members: AdminMember[];
  origin: string;
}): Promise<BulkLink[]> {
  const tokens = members.map((member) => ({
    member,
    token: secureToken(),
  }));
  const rows = await Promise.all(
    tokens.map(async ({ member, token }) => ({
      event_id: eventId,
      member_external_id: member.member_external_id,
      token_hash: await sha256(token),
    })),
  );
  const { error } = await getSupabaseBrowserClient()
    .from("event_invitations")
    .upsert(rows, {
      onConflict: "event_id,member_external_id",
    });

  if (error) throw error;

  return tokens.map(({ member, token }) => ({
    memberId: member.member_external_id,
    name: member.nickname || member.full_name,
    url: origin + "/undangan/" + token,
  }));
}

export async function createAdminCheckinCode({
  eventId,
  origin,
}: {
  eventId: string;
  origin: string;
}) {
  const raw =
    "RR-" + secureToken().slice(0, 12).toUpperCase();
  const codeHash = await sha256(raw);
  const activeUntil = new Date(
    Date.now() + 12 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await getSupabaseBrowserClient().rpc(
    "create_event_checkin_code",
    {
      p_event_id: eventId,
      p_code_hash: codeHash,
      p_active_until: activeUntil,
    },
  );

  if (error) throw error;

  return {
    code: raw,
    activeUntil,
    url:
      origin +
      "/check-in?code=" +
      encodeURIComponent(raw),
  };
}
