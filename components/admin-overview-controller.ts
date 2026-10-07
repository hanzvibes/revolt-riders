"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  fetchAdminOverviewSnapshot,
  type AdminAccount,
  type AdminOverviewSnapshot,
  type BulkLink,
  type ManagedAccount,
  type PendingRequest,
} from "./admin-overview-data";

const EMPTY_SNAPSHOT: AdminOverviewSnapshot = {
  events: [],
  requests: [],
  members: [],
  invitations: [],
  rsvps: [],
  managedAccounts: [],
};

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

export function useAdminOverviewController() {
  const { confirmAction } = useActionDialog();
  const {
    account: cachedAccount,
    loading: authLoading,
    fetchWithCache,
    invalidateCache,
  } = useDataCache();

  const account = cachedAccount as AdminAccount | null;
  const [snapshot, setSnapshot] =
    useState<AdminOverviewSnapshot>(EMPTY_SNAPSHOT);
  const [memberId, setMemberId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [rsvpEvent, setRsvpEvent] = useState("");
  const [checkinEvent, setCheckinEvent] = useState("");
  const [invitation, setInvitation] = useState("");
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinExpiresAt, setCheckinExpiresAt] =
    useState("");
  const [checkinUrl, setCheckinUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState<BulkLink[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const isActiveAdmin =
    account?.status === "active" &&
    ["admin", "superadmin"].includes(account.role);
  const isSuperadmin =
    isActiveAdmin && account?.role === "superadmin";

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!isActiveAdmin) {
        if (!authLoading) setLoading(false);
        return;
      }

      try {
        const data =
          await fetchWithCache<AdminOverviewSnapshot>(
            "admin_dashboard_overview",
            () =>
              fetchAdminOverviewSnapshot(Boolean(isSuperadmin)),
            {
              ttlMs: 60 * 1000,
              forceRefresh,
            },
          );
        setSnapshot(data);
      } catch {
        setError("Gagal memuat data dashboard pengurus.");
      } finally {
        setLoading(false);
      }
    },
    [
      authLoading,
      fetchWithCache,
      isActiveAdmin,
      isSuperadmin,
    ],
  );

  useEffect(() => {
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authLoading, load]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-rsvp-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_rsvps",
        },
        () => {
          invalidateCache("admin_dashboard_overview");
          void load(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_invitations",
        },
        () => {
          invalidateCache("admin_dashboard_overview");
          void load(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [invalidateCache, load]);

  const publishedEvents = useMemo(
    () =>
      snapshot.events.filter(
        (event) => event.status === "published",
      ),
    [snapshot.events],
  );

  const selectedRsvpEvent =
    rsvpEvent || publishedEvents[0]?.id || "";
  const selectedRsvpEventRecord = snapshot.events.find(
    (event) => event.id === selectedRsvpEvent,
  );

  const memberById = useMemo(
    () =>
      new Map(
        snapshot.members.map((member) => [
          member.member_external_id,
          member,
        ]),
      ),
    [snapshot.members],
  );

  const eventStats = useMemo(() => {
    const invited = snapshot.invitations.filter(
      (row) => row.event_id === selectedRsvpEvent,
    );
    const answers = snapshot.rsvps.filter(
      (row) => row.event_id === selectedRsvpEvent,
    );
    const responseByMember = new Map(
      answers.map((row) => [
        row.member_external_id,
        row,
      ]),
    );
    const attending = answers.filter(
      (row) => row.status === "attending",
    );

    return {
      invited: invited.length,
      attending: attending.length,
      declined: answers.filter(
        (row) => row.status === "declined",
      ).length,
      maybe: answers.filter(
        (row) => row.status === "maybe",
      ).length,
      noResponse: Math.max(
        invited.length - responseByMember.size,
        0,
      ),
      guests: attending.reduce(
        (total, row) =>
          total + Math.max(row.guest_count || 0, 0),
        0,
      ),
      responseRate: invited.length
        ? Math.round(
            (responseByMember.size / invited.length) * 100,
          )
        : 0,
      attendees: answers
        .slice()
        .sort((a, b) =>
          b.responded_at.localeCompare(a.responded_at),
        )
        .map((rsvp) => ({
          rsvp,
          member: memberById.get(
            rsvp.member_external_id,
          ),
        })),
    };
  }, [
    memberById,
    selectedRsvpEvent,
    snapshot.invitations,
    snapshot.rsvps,
  ]);

  const refresh = useCallback(() => {
    invalidateCache("admin_dashboard_overview");
    void load(true);
  }, [invalidateCache, load]);

  const generateInvite = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      setInvitation("");

      const token = secureToken();
      const tokenHash = await sha256(token);
      const { error: upsertError } =
        await getSupabaseBrowserClient()
          .from("event_invitations")
          .upsert(
            {
              event_id: selectedEvent,
              member_external_id: memberId
                .trim()
                .toUpperCase(),
              token_hash: tokenHash,
            },
            {
              onConflict:
                "event_id,member_external_id",
            },
          );

      if (upsertError) {
        setError(upsertError.message);
        return;
      }

      setInvitation(
        window.location.origin +
          "/undangan/" +
          token,
      );
      invalidateCache("admin_dashboard_overview");
      await load(true);
    },
    [
      invalidateCache,
      load,
      memberId,
      selectedEvent,
    ],
  );

  const generateBulkInvites = useCallback(async () => {
    if (!selectedEvent) {
      setError("Pilih agenda terlebih dahulu.");
      return;
    }

    const event = snapshot.events.find(
      (row) => row.id === selectedEvent,
    );
    if (!event) {
      setError("Agenda tidak ditemukan.");
      return;
    }

    const existing = snapshot.invitations.filter(
      (row) => row.event_id === selectedEvent,
    ).length;

    if (
      existing > 0 &&
      !(await confirmAction({
        title: "Generate ulang undangan?",
        description:
          "Agenda ini sudah memiliki " +
          existing +
          " undangan. Link lama akan dinonaktifkan dan diganti dengan link baru.",
        confirmLabel: "Generate Ulang",
        cancelLabel: "Batal",
      }))
    ) {
      return;
    }

    setBulkLoading(true);
    setError("");
    setMessage("");
    setBulkLinks([]);

    try {
      const tokens = snapshot.members.map((member) => ({
        member,
        token: secureToken(),
      }));
      const rows = await Promise.all(
        tokens.map(async ({ member, token }) => ({
          event_id: selectedEvent,
          member_external_id:
            member.member_external_id,
          token_hash: await sha256(token),
        })),
      );
      const { error: upsertError } =
        await getSupabaseBrowserClient()
          .from("event_invitations")
          .upsert(rows, {
            onConflict:
              "event_id,member_external_id",
          });

      if (upsertError) throw upsertError;

      const links = tokens.map(
        ({ member, token }) => ({
          memberId: member.member_external_id,
          name:
            member.nickname || member.full_name,
          url:
            window.location.origin +
            "/undangan/" +
            token,
        }),
      );

      setBulkLinks(links);
      downloadAdminInviteLinks(links, event.title);
      setMessage(
        links.length +
          " undangan personal dibuat. CSV link sudah diunduh; simpan sebelum meninggalkan halaman.",
      );
      invalidateCache("admin_dashboard_overview");
      await load(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Undangan massal belum berhasil dibuat.",
      );
    } finally {
      setBulkLoading(false);
    }
  }, [
    confirmAction,
    invalidateCache,
    load,
    selectedEvent,
    snapshot.events,
    snapshot.invitations,
    snapshot.members,
  ]);

  const generateCheckinCode = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      setCheckinCode("");
      setCheckinExpiresAt("");
      setCheckinUrl("");

      const raw =
        "RR-" +
        secureToken().slice(0, 12).toUpperCase();
      const codeHash = await sha256(raw);
      const now = Date.now();
      const activeUntil = new Date(
        now + 12 * 60 * 60 * 1000,
      ).toISOString();

      const { error: insertError } =
        await getSupabaseBrowserClient().rpc(
          "create_event_checkin_code",
          {
            p_event_id: checkinEvent,
            p_code_hash: codeHash,
            p_active_until: activeUntil,
          },
        );

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setCheckinCode(raw);
      setCheckinExpiresAt(activeUntil);
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "";
      setCheckinUrl(
        origin +
          "/check-in?code=" +
          encodeURIComponent(raw),
      );
    },
    [checkinEvent],
  );

  const approveRequest = useCallback(
    async (request: PendingRequest) => {
      setError("");
      const { error: approveError } =
        await getSupabaseBrowserClient().rpc(
          "approve_member_account_request",
          {
            p_request_id: request.id,
            p_role: "member",
          },
        );

      if (approveError) {
        setError(approveError.message);
        return;
      }

      setMessage(
        request.member_external_id +
          " berhasil diverifikasi sebagai member.",
      );
      invalidateCache("admin_dashboard_overview");
      await load(true);
    },
    [invalidateCache, load],
  );

  const rejectRequest = useCallback(
    async (request: PendingRequest) => {
      const confirmed = await confirmAction({
        title: "Tolak pendaftaran?",
        description:
          request.member_external_id +
          " (" +
          request.email +
          ") akan ditolak dan ID RR dibuka kembali untuk pendaftaran ulang.",
        confirmLabel: "Tolak Pendaftaran",
        cancelLabel: "Batal",
        destructive: true,
      });

      if (!confirmed) return;

      setError("");
      setMessage("");

      const { error: rpcError } =
        await getSupabaseBrowserClient().rpc(
          "reject_member_account_request",
          {
            p_request_id: request.id,
          },
        );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setMessage(
        "Pendaftaran " +
          request.member_external_id +
          " dibatalkan. ID RR telah dibuka kembali untuk pendaftaran.",
      );
      invalidateCache("admin_dashboard_overview");
      await load(true);
    },
    [confirmAction, invalidateCache, load],
  );

  const changeRole = useCallback(
    async (
      managedAccount: ManagedAccount,
      nextRole: ManagedAccount["role"],
    ) => {
      if (managedAccount.role === nextRole) return;

      const confirmed = await confirmAction({
        title: "Ubah role member?",
        description:
          managedAccount.member_external_id +
          " akan memiliki role " +
          nextRole.replaceAll("_", " ") +
          ".",
        confirmLabel: "Ubah Role",
        cancelLabel: "Batal",
      });

      if (!confirmed) return;

      setError("");
      setMessage("");

      const { error: roleError } =
        await getSupabaseBrowserClient().rpc(
          "set_member_account_role",
          {
            p_account_id: managedAccount.id,
            p_role: nextRole,
          },
        );

      if (roleError) {
        setError(roleError.message);
        return;
      }

      setMessage(
        "Role " +
          managedAccount.member_external_id +
          " diperbarui menjadi " +
          nextRole.replaceAll("_", " ") +
          ".",
      );
      invalidateCache("admin_dashboard_overview");
      await load(true);
    },
    [confirmAction, invalidateCache, load],
  );

  return {
    account,
    authLoading,
    ...snapshot,
    publishedEvents,
    activeMembers: snapshot.members,
    selectedRsvpEvent,
    selectedRsvpEventRecord,
    memberById,
    eventStats,
    memberId,
    selectedEvent,
    rsvpEvent,
    checkinEvent,
    invitation,
    checkinCode,
    checkinExpiresAt,
    checkinUrl,
    bulkLinks,
    message,
    error,
    loading,
    bulkLoading,
    setMemberId,
    setSelectedEvent,
    setRsvpEvent,
    setCheckinEvent,
    refresh,
    generateInvite,
    generateBulkInvites,
    generateCheckinCode,
    approveRequest,
    rejectRequest,
    changeRole,
  };
}
