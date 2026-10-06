"use client";

import { AppShell } from "@/components/app-shell";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import {
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { acceptJoinRequest, activateJoinRequest, rejectJoinRequest } from "./join-requests-actions";
import { fetchJoinRequestsSnapshot } from "./join-requests-data";
import { JoinRequestsDesktopTable } from "./join-requests-desktop-table";
import { JoinRequestsMobileCards } from "./join-requests-mobile-cards";
import { JoinRequestsModals } from "./join-requests-modals";
import {
  filterJoinRequests,
  getJoinRequestCounts,
  type JoinRequest,
  type JoinRequestsSnapshot,
  type JoinRequestTab,
  type JoinRequestToast,
} from "./join-requests-model";
import { getConfirmationLink } from "./join-requests-view";

export default function AdminJoinRequestsPage() {
  const { account, loading: authLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const isStaff = Boolean(account && ["admin", "superadmin", "road_captain"].includes(account.role));

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<JoinRequestTab>("pending");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<JoinRequestToast | null>(null);
  const [detailItem, setDetailItem] = useState<JoinRequest | null>(null);
  const [rejectItem, setRejectItem] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activateItem, setActivateItem] = useState<JoinRequest | null>(null);
  const [suggestedMemberId, setSuggestedMemberId] = useState("RR-028");
  const [customMemberId, setCustomMemberId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
  };

  const loadRequests = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await fetchWithCache<JoinRequestsSnapshot>(
        "admin:join-requests",
        fetchJoinRequestsSnapshot,
        { ttlMs: 30_000, forceRefresh },
      );

      setRequests(snapshot.requests);
      setSuggestedMemberId(snapshot.suggestedMemberId);
      setCustomMemberId((current) => current || snapshot.suggestedMemberId);
    } catch (err) {
      const rawMsg = (err as { message?: string })?.message || "";
      if (rawMsg.includes("join_requests") || rawMsg.includes("schema cache")) {
        setError(
          "Tabel join_requests belum dibuat di Supabase. Silakan jalankan file migrasi 20260918000300_add_join_requests_and_public_landing.sql di SQL Editor Supabase.",
        );
      } else if (rawMsg) {
        setError(rawMsg);
      } else {
        setError("Gagal memuat data pendaftaran.");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithCache]);

  useEffect(() => {
    if (isStaff) {
      void loadRequests();
    }
  }, [isStaff, loadRequests]);

  const counts = useMemo(() => getJoinRequestCounts(requests), [requests]);
  const filteredRequests = useMemo(
    () => filterJoinRequests(requests, tab, search),
    [requests, tab, search],
  );

  const handleAccept = async (item: JoinRequest) => {
    setActionLoading(true);

    try {
      await acceptJoinRequest(item.id);
      showToast(`Pendaftaran ${item.full_name} berhasil disetujui (Accepted).`, "success");
      invalidateCache("admin:join-requests");
      invalidateCache("shell:pending-join-count");
      void loadRequests(true);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal menyetujui pendaftaran.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectItem) return;
    setActionLoading(true);

    try {
      await rejectJoinRequest(rejectItem.id, rejectReason);
      showToast(`Pendaftaran ${rejectItem.full_name} telah ditolak.`, "success");
      setRejectItem(null);
      setRejectReason("");
      invalidateCache("admin:join-requests");
      invalidateCache("shell:pending-join-count");
      void loadRequests(true);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal menolak pendaftaran.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activateItem) return;
    const memberIdToAssign = (customMemberId || suggestedMemberId).trim().toUpperCase();

    if (!memberIdToAssign.match(/^RR-\d{3,}$/)) {
      showToast("Format ID RR harus RR-XXX (contoh: RR-028)", "error");
      return;
    }

    setActionLoading(true);

    try {
      await activateJoinRequest(activateItem.id, memberIdToAssign);
      showToast(
        `Member resmi berhasil diaktivasi dengan ID ${memberIdToAssign}!`,
        "success",
      );
      setActivateItem(null);
      invalidateCache("admin:join-requests");
      invalidateCache("shell:pending-join-count");
      void loadRequests(true);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal mengaktivasi member.",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openReject = (item: JoinRequest) => {
    setRejectItem(item);
    setRejectReason("");
  };

  const openActivate = (item: JoinRequest) => {
    setActivateItem(item);
    setCustomMemberId(suggestedMemberId);
  };

  const copyConfirmationLink = (item: JoinRequest) => {
    if (!item.confirmation_token) return;
    const url = getConfirmationLink(item, window.location.origin);
    if (!url) return;
    navigator.clipboard.writeText(url);
    showToast(`Link konfirmasi untuk ${item.full_name} berhasil disalin ke clipboard!`, "success");
  };

  if (authLoading) {
    return (
      <AppShell active="Join Requests" title="Kelola Join Requests">
        <div className="page-wrap">
          <p className="system-message">Memeriksa hak akses pengurus…</p>
        </div>
      </AppShell>
    );
  }

  if (!isStaff) {
    return (
      <AppShell active="Join Requests" title="Akses Ditolak">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert size={44} style={{ color: "var(--red)", margin: "0 auto 12px" }} />
            <h2>Akses Khusus Pengurus</h2>
            <p>Halaman manajemen Join Requests hanya dapat diakses oleh Road Captain, Admin, atau Superadmin.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Join Requests" title="Kelola Join Requests">
      <div className="page-wrap">
        <section className="page-intro">
          <div>
            <em>PENDAFTARAN ANGGOTA BARU</em>
            <h2>Verifikasi Calon Member</h2>
            <p>Alur seleksi: Pending → Disetujui (Accepted) → Konfirmasi Calon (Confirmed) → Aktivasi Resmi (Active).</p>
          </div>

          <button onClick={() => void loadRequests(true)} disabled={loading}>
            <RefreshCw className={loading ? "spin" : ""} size={16} />
            <span>Segarkan</span>
          </button>
        </section>
        {error && <p className="error-message">{error}</p>}

        <div className="admin-member-tabs" role="tablist" aria-label="Filter status pendaftaran">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pending"}
            className={`admin-member-tab-btn ${tab === "pending" ? "active" : ""}`}
            onClick={() => setTab("pending")}
          >
            <Clock size={15} />
            <span>Pending</span>
            <span className="admin-member-tab-badge">{counts.pending}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "accepted"}
            className={`admin-member-tab-btn ${tab === "accepted" ? "active" : ""}`}
            onClick={() => setTab("accepted")}
          >
            <Check size={15} />
            <span>Accepted</span>
            <span className="admin-member-tab-badge">{counts.accepted}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "confirmed"}
            className={`admin-member-tab-btn ${tab === "confirmed" ? "active" : ""}`}
            onClick={() => setTab("confirmed")}
          >
            <UserCheck size={15} />
            <span>Confirmed</span>
            <span className="admin-member-tab-badge">{counts.confirmed}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "active"}
            className={`admin-member-tab-btn ${tab === "active" ? "active" : ""}`}
            onClick={() => setTab("active")}
          >
            <ShieldCheck size={15} />
            <span>Active</span>
            <span className="admin-member-tab-badge">{counts.active}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "archived"}
            className={`admin-member-tab-btn ${tab === "archived" ? "active" : ""}`}
            onClick={() => setTab("archived")}
          >
            <UserX size={15} />
            <span>Arsip</span>
            <span className="admin-member-tab-badge">{counts.archived}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === "all"}
            className={`admin-member-tab-btn ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            <UsersRound size={15} />
            <span>Semua</span>
            <span className="admin-member-tab-badge">{counts.all}</span>
          </button>
        </div>

        <div className="admin-member-search-wrap">
          <Search className="search-icon" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari berdasarkan nama, domisili kota, nomor WhatsApp, atau akun Instagram…"
          />
          {search && (
            <button
              type="button"
              className="admin-member-search-clear"
              onClick={() => setSearch("")}
              aria-label="Hapus kata kunci pencarian"
              title="Hapus pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <JoinRequestsDesktopTable
          requests={filteredRequests}
          search={search}
          tab={tab}
          actionLoading={actionLoading}
          onAccept={handleAccept}
          onActivate={openActivate}
          onReject={openReject}
          onDetail={setDetailItem}
          onCopyConfirmation={copyConfirmationLink}
        />

        <JoinRequestsMobileCards
          requests={filteredRequests}
          search={search}
          tab={tab}
          actionLoading={actionLoading}
          onAccept={handleAccept}
          onActivate={openActivate}
          onReject={openReject}
          onDetail={setDetailItem}
          onCopyConfirmation={copyConfirmationLink}
        />

        {toast && (
          <aside
            className={`admin-floating-toast toast-${toast.type}`}
            role="status"
            aria-live="polite"
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="toast-icon" size={17} />
            ) : (
              <ShieldAlert className="toast-icon" size={17} />
            )}
            <span>{toast.text}</span>
            <button
              type="button"
              className="admin-floating-toast-close"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
            >
              <X size={15} />
            </button>
          </aside>
        )}
      </div>

      <JoinRequestsModals
        detailItem={detailItem}
        rejectItem={rejectItem}
        rejectReason={rejectReason}
        activateItem={activateItem}
        suggestedMemberId={suggestedMemberId}
        customMemberId={customMemberId}
        actionLoading={actionLoading}
        onCloseDetail={() => setDetailItem(null)}
        onAcceptDetail={async (item) => {
          await handleAccept(item);
          setDetailItem(null);
        }}
        onRejectFromDetail={(item) => {
          setDetailItem(null);
          openReject(item);
        }}
        onActivateFromDetail={(item) => {
          setDetailItem(null);
          openActivate(item);
        }}
        onCloseReject={() => setRejectItem(null)}
        onRejectReasonChange={setRejectReason}
        onReject={handleReject}
        onCloseActivate={() => setActivateItem(null)}
        onCustomMemberIdChange={setCustomMemberId}
        onActivate={handleActivate}
      />
    </AppShell>
  );
}
