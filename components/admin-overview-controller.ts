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
  approveAdminAccountRequest,
  changeAdminAccountRole,
  rejectAdminAccountRequest,
} from "./admin-overview-account-actions";
import {
  createAdminCheckinCode,
  createBulkInvitations,
  createPersonalInvitation,
  downloadAdminInviteLinks,
} from "./admin-overview-invitation-actions";
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

export { downloadAdminInviteLinks };

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

  const refreshAfterMutation = useCallback(async () => {
    invalidateCache("admin_dashboard_overview");
    await load(true);
  }, [invalidateCache, load]);

  const generateInvite = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      setInvitation("");

      try {
        const url = await createPersonalInvitation({
          eventId: selectedEvent,
          memberId,
          origin: window.location.origin,
        });
        setInvitation(url);
        await refreshAfterMutation();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Undangan belum berhasil dibuat.",
        );
      }
    },
    [memberId, refreshAfterMutation, selectedEvent],
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
      const links = await createBulkInvitations({
        eventId: selectedEvent,
        members: snapshot.members,
        origin: window.location.origin,
      });

      setBulkLinks(links);
      downloadAdminInviteLinks(links, event.title);
      setMessage(
        links.length +
          " undangan personal dibuat. CSV link sudah diunduh; simpan sebelum meninggalkan halaman.",
      );
      await refreshAfterMutation();
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
    refreshAfterMutation,
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

      try {
        const result = await createAdminCheckinCode({
          eventId: checkinEvent,
          origin:
            typeof window !== "undefined"
              ? window.location.origin
              : "",
        });
        setCheckinCode(result.code);
        setCheckinExpiresAt(result.activeUntil);
        setCheckinUrl(result.url);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Kode check-in belum berhasil dibuat.",
        );
      }
    },
    [checkinEvent],
  );

  const approveRequest = useCallback(
    async (request: PendingRequest) => {
      setError("");

      try {
        await approveAdminAccountRequest(request);
        setMessage(
          request.member_external_id +
            " berhasil diverifikasi sebagai member.",
        );
        await refreshAfterMutation();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Permintaan akun belum dapat disetujui.",
        );
      }
    },
    [refreshAfterMutation],
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

      try {
        await rejectAdminAccountRequest(request);
        setMessage(
          "Pendaftaran " +
            request.member_external_id +
            " dibatalkan. ID RR telah dibuka kembali untuk pendaftaran.",
        );
        await refreshAfterMutation();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Pendaftaran belum dapat ditolak.",
        );
      }
    },
    [confirmAction, refreshAfterMutation],
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

      try {
        await changeAdminAccountRole(
          managedAccount,
          nextRole,
        );
        setMessage(
          "Role " +
            managedAccount.member_external_id +
            " diperbarui menjadi " +
            nextRole.replaceAll("_", " ") +
            ".",
        );
        await refreshAfterMutation();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Role member belum dapat diperbarui.",
        );
      }
    },
    [confirmAction, refreshAfterMutation],
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
