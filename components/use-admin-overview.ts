"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useDataCache } from "@/context/data-cache-context";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Account, AdminEventRecord, PendingRequest, Member, Invitation, Rsvp, BulkLink, ManagedAccount, secureToken, downloadLinks } from "./admin-overview-model";

export function useAdminOverview() {

  const { confirmAction } = useActionDialog();
  const {
    account: cachedAccount,
    loading: authLoading,
    fetchWithCache,
    invalidateCache,
  } = useDataCache();
  const [account, setAccount] = useState<Account | null>(null);
  const [events, setEvents] = useState<AdminEventRecord[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [memberId, setMemberId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [rsvpEvent, setRsvpEvent] = useState("");
  const [checkinEvent, setCheckinEvent] = useState("");
  const [invitation, setInvitation] = useState("");
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinExpiresAt, setCheckinExpiresAt] = useState("");
  const [checkinUrl, setCheckinUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState<BulkLink[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const publishedEvents = useMemo(
    () => events.filter((event) => event.status === "published"),
    [events],
  );
  const activeMembers = members;
  const selectedRsvpEvent = rsvpEvent || publishedEvents[0]?.id || "";
  const selectedRsvpEventRecord = events.find(
    (event) => event.id === selectedRsvpEvent,
  );
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.member_external_id, member])),
    [members],
  );

  const eventStats = useMemo(() => {
    const invited = invitations.filter(
      (row) => row.event_id === selectedRsvpEvent,
    );
    const answers = rsvps.filter((row) => row.event_id === selectedRsvpEvent);
    const responseByMember = new Map(
      answers.map((row) => [row.member_external_id, row]),
    );
    const attending = answers.filter((row) => row.status === "attending");
    return {
      invited: invited.length,
      attending: attending.length,
      declined: answers.filter((row) => row.status === "declined").length,
      maybe: answers.filter((row) => row.status === "maybe").length,
      noResponse: Math.max(invited.length - responseByMember.size, 0),
      guests: attending.reduce(
        (total, row) => total + Math.max(row.guest_count || 0, 0),
        0,
      ),
      responseRate: invited.length
        ? Math.round((responseByMember.size / invited.length) * 100)
        : 0,
      attendees: answers
        .slice()
        .sort((a, b) => b.responded_at.localeCompare(a.responded_at))
        .map((rsvp) => ({
          rsvp,
          member: memberById.get(rsvp.member_external_id),
        })),
    };
  }, [invitations, memberById, rsvps, selectedRsvpEvent]);

  const load = async (forceRefresh = false) => {
    const effectiveAccount = cachedAccount;
    setAccount(effectiveAccount as Account | null);
    const isActiveAdmin =
      effectiveAccount?.status === "active" &&
      ["admin", "superadmin"].includes(effectiveAccount.role);
    const isSuperadmin =
      isActiveAdmin && effectiveAccount?.role === "superadmin";

    if (!isActiveAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }

    try {
      const data = await fetchWithCache(
        "admin_dashboard_overview",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [
            eventResult,
            requestResult,
            memberResult,
            invitationResult,
            rsvpResult,
            managedAccountResult,
          ] = await Promise.all([
            supabase
              .from("events")
              .select(
                "id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status,counts_as_mandatory,official_distance_km",
              )
              .order("start_at", { ascending: false }),
            supabase
              .from("member_account_requests")
              .select("id,user_id,member_external_id,email")
              .eq("status", "pending")
              .order("created_at"),
            supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname")
              .order("full_name"),
            supabase
              .from("event_invitations")
              .select("event_id,member_external_id"),
            supabase
              .from("event_rsvps")
              .select(
                "event_id,member_external_id,status,guest_count,responded_at",
              ),
            isSuperadmin
              ? supabase
                  .from("member_accounts")
                  .select("id,member_external_id,role,status")
                  .order("member_external_id")
              : Promise.resolve({ data: [] }),
          ]);
          return {
            events: ((eventResult.data ?? []) as AdminEventRecord[]).map(
              (event) => ({
                ...event,
                official_distance_km:
                  event.official_distance_km === null
                    ? null
                    : Number(event.official_distance_km),
              }),
            ),
            requests: (requestResult.data ?? []) as PendingRequest[],
            members: (memberResult.data ?? []) as Member[],
            invitations: (invitationResult.data ?? []) as Invitation[],
            rsvps: (rsvpResult.data ?? []) as Rsvp[],
            managedAccounts: (managedAccountResult.data ?? []) as ManagedAccount[],
          };
        },
        { ttlMs: 60 * 1000, forceRefresh },
      );

      setEvents(data.events);
      setRequests(data.requests);
      setMembers(data.members);
      setInvitations(data.invitations);
      setRsvps(data.rsvps);
      setManagedAccounts(data.managedAccounts);
    } catch {
      setError("Gagal memuat data dashboard pengurus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-rsvp-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_rsvps" },
        () => {
          invalidateCache("admin_dashboard_overview");
          void load(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_invitations" },
        () => {
          invalidateCache("admin_dashboard_overview");
          void load(true);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, cachedAccount]);


  const generateInvite = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setInvitation("");
    const token = secureToken();
    const tokenHash = await sha256(token);
    const { error: upsertError } = await getSupabaseBrowserClient()
      .from("event_invitations")
      .upsert(
        {
          event_id: selectedEvent,
          member_external_id: memberId.trim().toUpperCase(),
          token_hash: tokenHash,
        },
        { onConflict: "event_id,member_external_id" },
      );
    if (upsertError) setError(upsertError.message);
    else {
      setInvitation(`${window.location.origin}/undangan/${token}`);
      invalidateCache("admin_dashboard_overview");
      await load(true);
    }
  };

  const generateBulkInvites = async () => {
    if (!selectedEvent) return setError("Pilih agenda terlebih dahulu.");
    const event = events.find((row) => row.id === selectedEvent);
    if (!event) return setError("Agenda tidak ditemukan.");
    const existing = invitations.filter(
      (row) => row.event_id === selectedEvent,
    ).length;
    if (
      existing > 0 &&
      !await confirmAction({
        title: "Generate ulang undangan?",
        description: `Agenda ini sudah memiliki ${existing} undangan. Link lama akan dinonaktifkan dan diganti dengan link baru.`,
        confirmLabel: "Generate Ulang",
        cancelLabel: "Batal",
      })
    )
      return;
    setBulkLoading(true);
    setError("");
    setMessage("");
    setBulkLinks([]);
    try {
      const tokens = activeMembers.map((member) => ({
        member,
        token: secureToken(),
      }));
      const rows = await Promise.all(
        tokens.map(async ({ member, token }) => ({
          event_id: selectedEvent,
          member_external_id: member.member_external_id,
          token_hash: await sha256(token),
        })),
      );
      const { error: upsertError } = await getSupabaseBrowserClient()
        .from("event_invitations")
        .upsert(rows, { onConflict: "event_id,member_external_id" });
      if (upsertError) throw upsertError;
      const links = tokens.map(({ member, token }) => ({
        memberId: member.member_external_id,
        name: member.nickname || member.full_name,
        url: `${window.location.origin}/undangan/${token}`,
      }));
      setBulkLinks(links);
      downloadLinks(links, event.title);
      setMessage(
        `${links.length} undangan personal dibuat. CSV link sudah diunduh; simpan sebelum meninggalkan halaman.`,
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
  };

  const generateCheckinCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCheckinCode("");
    setCheckinExpiresAt("");
    setCheckinUrl("");
    const raw = `RR-${secureToken().slice(0, 12).toUpperCase()}`;
    const codeHash = await sha256(raw);
    const supabase = getSupabaseBrowserClient();
    const now = Date.now();
    const activeUntil = new Date(now + 12 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase.rpc(
      "create_event_checkin_code",
      {
        p_event_id: checkinEvent,
        p_code_hash: codeHash,
        p_active_until: activeUntil,
      },
    );
    if (insertError) setError(insertError.message);
    else {
      setCheckinCode(raw);
      setCheckinExpiresAt(activeUntil);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCheckinUrl(`${origin}/check-in?code=${encodeURIComponent(raw)}`);
    }
  };

  const approveRequest = async (request: PendingRequest) => {
    setError("");
    const { error: approveError } = await getSupabaseBrowserClient().rpc(
      "approve_member_account_request",
      { p_request_id: request.id, p_role: "member" },
    );
    if (approveError) return setError(approveError.message);
    setMessage(
      `${request.member_external_id} berhasil diverifikasi sebagai member.`,
    );
    invalidateCache("admin_dashboard_overview");
    await load(true);
  };

  const rejectRequest = async (request: PendingRequest) => {
    if (
      !await confirmAction({
        title: "Tolak pendaftaran?",
        description: `${request.member_external_id} (${request.email}) akan ditolak dan ID RR dibuka kembali untuk pendaftaran ulang.`,
        confirmLabel: "Tolak Pendaftaran",
        cancelLabel: "Batal",
        destructive: true,
      })
    )
      return;
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc(
      "reject_member_account_request",
      { p_request_id: request.id },
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMessage(
      `Pendaftaran ${request.member_external_id} dibatalkan. ID RR telah dibuka kembali untuk pendaftaran.`,
    );
    invalidateCache("admin_dashboard_overview");
    await load(true);
  };

  const changeRole = async (
    managedAccount: ManagedAccount,
    nextRole: ManagedAccount["role"],
  ) => {
    if (managedAccount.role === nextRole) return;
    if (
      !await confirmAction({
        title: "Ubah role member?",
        description: `${managedAccount.member_external_id} akan memiliki role ${nextRole.replaceAll("_", " ")}.`,
        confirmLabel: "Ubah Role",
        cancelLabel: "Batal",
      })
    )
      return;
    setError("");
    setMessage("");
    const { error: roleError } = await getSupabaseBrowserClient().rpc(
      "set_member_account_role",
      { p_account_id: managedAccount.id, p_role: nextRole },
    );
    if (roleError) return setError(roleError.message);
    setMessage(
      `Role ${managedAccount.member_external_id} diperbarui menjadi ${nextRole.replaceAll("_", " ")}.`,
    );
    invalidateCache("admin_dashboard_overview");
    await load(true);
  };


  return { authLoading, invalidateCache, account, events, requests, members, rsvps, managedAccounts, memberId, setMemberId, selectedEvent, setSelectedEvent, setRsvpEvent, checkinEvent, setCheckinEvent, invitation, checkinCode, checkinExpiresAt, checkinUrl, bulkLinks, message, error, loading, bulkLoading, publishedEvents, activeMembers, selectedRsvpEvent, selectedRsvpEventRecord, memberById, eventStats, load, generateInvite, generateBulkInvites, generateCheckinCode, approveRequest, rejectRequest, changeRole };

}
