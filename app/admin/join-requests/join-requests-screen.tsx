"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  UserX,
  UsersRound,
  X,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/instagram";
import { useCallback, useEffect, useMemo, useState } from "react";

type JoinRequest = {
  id: string;
  full_name: string;
  birth_place: string;
  birth_date: string;
  city: string;
  instagram: string;
  whatsapp: string;
  status: "pending" | "accepted" | "confirmed" | "active" | "rejected" | "expired";
  confirmation_token: string | null;
  accepted_at: string | null;
  confirmed_at: string | null;
  activated_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  assigned_member_id: string | null;
  created_at: string;
};
type JoinRequestsSnapshot = {
  requests: JoinRequest[];
  suggestedMemberId: string;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function AdminJoinRequestsPage() {
  const { account, loading: authLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const isStaff = Boolean(account && ["admin", "superadmin", "road_captain"].includes(account.role));

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "accepted" | "confirmed" | "active" | "archived">("pending");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

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

  // Modals state
  const [detailItem, setDetailItem] = useState<JoinRequest | null>(null);
  const [rejectItem, setRejectItem] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activateItem, setActivateItem] = useState<JoinRequest | null>(null);
  const [suggestedMemberId, setSuggestedMemberId] = useState("RR-028");
  const [customMemberId, setCustomMemberId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Load Data
  const loadRequests = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError("");

      const snapshot = await fetchWithCache<JoinRequestsSnapshot>(
        "admin:join-requests",
        async () => {
          const supabase = getSupabaseBrowserClient();

          const [requestsResult, profilesResult] = await Promise.all([
            supabase
              .from("join_requests")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("member_profiles")
              .select("member_external_id"),
          ]);

          if (requestsResult.error) throw requestsResult.error;
          if (profilesResult.error) throw profilesResult.error;

          let maxNum = 27;
          for (const profile of profilesResult.data ?? []) {
            const match = profile.member_external_id?.match(/^RR-(\d+)$/);
            if (!match) continue;
            const value = Number.parseInt(match[1], 10);
            if (Number.isFinite(value) && value > maxNum) maxNum = value;
          }

          return {
            requests: (requestsResult.data ?? []) as JoinRequest[],
            suggestedMemberId: `RR-${String(maxNum + 1).padStart(3, "0")}`,
          };
        },
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

  // Status counts
  const counts = useMemo(() => {
    const p = requests.filter((r) => r.status === "pending").length;
    const a = requests.filter((r) => r.status === "accepted").length;
    const c = requests.filter((r) => r.status === "confirmed").length;
    const act = requests.filter((r) => r.status === "active").length;
    const arc = requests.filter((r) => r.status === "rejected" || r.status === "expired").length;
    return { all: requests.length, pending: p, accepted: a, confirmed: c, active: act, archived: arc };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Tab filter
      if (tab === "pending" && r.status !== "pending") return false;
      if (tab === "accepted" && r.status !== "accepted") return false;
      if (tab === "confirmed" && r.status !== "confirmed") return false;
      if (tab === "active" && r.status !== "active") return false;
      if (tab === "archived" && r.status !== "rejected" && r.status !== "expired") return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.full_name.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.whatsapp.includes(q) ||
          r.instagram.toLowerCase().includes(q) ||
          (r.assigned_member_id && r.assigned_member_id.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [requests, tab, search]);

  // Actions
  const handleAccept = async (item: JoinRequest) => {
    setActionLoading(true);

    try {
      const { error: rpcErr } = await getSupabaseBrowserClient().rpc(
        "accept_join_request",
        { p_request_id: item.id },
      );

      if (rpcErr) throw rpcErr;

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
      const { error: rpcErr } = await getSupabaseBrowserClient().rpc(
        "reject_join_request",
        {
          p_request_id: rejectItem.id,
          p_reason: rejectReason.trim() || null,
        },
      );

      if (rpcErr) throw rpcErr;

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
      const { error: rpcErr } = await getSupabaseBrowserClient().rpc(
        "activate_join_request",
        {
          p_request_id: activateItem.id,
          p_member_id: memberIdToAssign,
        },
      );

      if (rpcErr) throw rpcErr;

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

  // WhatsApp helpers
  const getWhatsAppLink = (item: JoinRequest, customMsg?: string) => {
    let cleanWa = item.whatsapp.replace(/[^0-9]/g, "");
    if (cleanWa.startsWith("08")) cleanWa = "628" + cleanWa.slice(2);

    let defaultMsg = `Halo ${item.full_name}, kami dari Pengurus Revolt Riders Situbondo.`;

    if (item.status === "accepted" && item.confirmation_token) {
      const confirmUrl = `${typeof window !== "undefined" ? window.location.origin : "https://revolt-riders.com"}/join/confirm/${item.confirmation_token}`;
      defaultMsg = `Halo ${item.full_name}! Pendaftaran Anda di Revolt Riders telah DISETUJUI oleh pengurus. Silakan lakukan konfirmasi komitmen bergabung Anda dalam 7 hari melalui tautan resmi berikut:\n\n${confirmUrl}\n\nSalam Satu Aspal!`;
    } else if (item.status === "active" && item.assigned_member_id) {
      defaultMsg = `Selamat bergabung ${item.full_name}! Pendaftaran Anda telah DIRESMIKAN. Nomor Anggota (ID RR) resmi Anda adalah: ${item.assigned_member_id}. Silakan masuk ke Portal Member untuk melengkapi profil motor Anda. Salam Satu Aspal!`;
    }

    return `https://wa.me/${cleanWa}?text=${encodeURIComponent(customMsg || defaultMsg)}`;
  };

  const copyConfirmationLink = (item: JoinRequest) => {
    if (!item.confirmation_token) return;
    const url = `${window.location.origin}/join/confirm/${item.confirmation_token}`;
    navigator.clipboard.writeText(url);
    showToast(`Link konfirmasi untuk ${item.full_name} berhasil disalin ke clipboard!`, "success");
  };

  const getStatusBadge = (status: JoinRequest["status"]) => {
    switch (status) {
      case "pending":
        return <span className="join-badge join-badge-pending">Pending</span>;
      case "accepted":
        return <span className="join-badge join-badge-accepted">Accepted</span>;
      case "confirmed":
        return <span className="join-badge join-badge-confirmed">Confirmed</span>;
      case "active":
        return <span className="join-badge join-badge-active">Active</span>;
      case "rejected":
        return <span className="join-badge join-badge-rejected">Rejected</span>;
      case "expired":
        return <span className="join-badge join-badge-expired">Expired</span>;
    }
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
        {/* Header & Refresh */}
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

        {/* 1. Status Filter Tabs (Segmented & Responsive) */}
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

        {/* 2. Search Bar Toolbar */}
        <div className="admin-member-search-wrap">
          <Search className="search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        {/* 3. Main List: Desktop / Tablet Table (>= 768px) */}
        <div className="admin-member-table-card">
          <div className="admin-member-table-wrap">
            <table className="admin-member-table">
              <thead>
                <tr>
                  <th>Calon Member</th>
                  <th>Domisili & Instagram</th>
                  <th>WhatsApp & Pendaftaran</th>
                  <th>Status Verifikasi</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "40px 16px" }}>
                      <UserPlus size={40} style={{ color: "var(--red)", margin: "0 auto 10px" }} />
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--ink)" }}>
                        Tidak Ada Data Pendaftaran
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>
                        {search
                          ? "Tidak ada calon member yang cocok dengan kata kunci pencarian Anda."
                          : tab === "pending"
                          ? "Bagus! Saat ini tidak ada pendaftaran baru yang menunggu verifikasi."
                          : "Belum ada data pendaftar pada kategori status ini."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => (
                    <tr key={item.id}>
                      {/* 1. Calon Member */}
                      <td>
                        <div className="admin-table-rider-cell">
                          <div className="member-avatar" style={{ width: 34, height: 34, fontSize: "0.68rem" }}>
                            {getInitials(item.full_name)}
                          </div>
                          <div className="admin-table-rider-names">
                            <span className="admin-table-rider-name" title={item.full_name}>
                              {item.full_name}
                            </span>
                            <span className="admin-table-rider-sub">
                              TTL: {item.birth_place},{" "}
                              {item.birth_date
                                ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.birth_date))
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Domisili & IG */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.72rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#1e293b" }}>
                            <MapPin size={13} style={{ color: "var(--red)", flexShrink: 0 }} />
                            {item.city}
                          </span>
                          <a
                            href={`https://instagram.com/${item.instagram.replace(/^@/, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              color: "#e1306c",
                              fontWeight: 700,
                              textDecoration: "none",
                            }}
                          >
                            <InstagramIcon size={12} />
                            <span>@{item.instagram.replace(/^@/, "")}</span>
                          </a>
                        </div>
                      </td>

                      {/* 3. WhatsApp & Daftar */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.72rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, color: "#334155" }}>
                            <Phone size={12} style={{ color: "#16a34a", flexShrink: 0 }} />
                            {item.whatsapp}
                          </span>
                          <span style={{ color: "#94a3b8", fontSize: "0.68rem" }}>
                            Daftar: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.created_at))}
                          </span>
                        </div>
                      </td>

                      {/* 4. Status Verifikasi */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {getStatusBadge(item.status)}
                            {item.assigned_member_id && (
                              <span className="member-id-tag" style={{ background: "rgba(229, 29, 42, 0.08)", color: "var(--red)", border: "1px solid rgba(229, 29, 42, 0.22)", padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 800 }}>
                                {item.assigned_member_id}
                              </span>
                            )}
                          </div>

                          {item.status === "accepted" && item.confirmation_token && (
                            <button
                              type="button"
                              onClick={() => copyConfirmationLink(item)}
                              className="join-action-copy"
                              title="Salin tautan konfirmasi pendaftar"
                            >
                              <Copy size={11} />
                              <span>Salin Link</span>
                            </button>
                          )}

                          {item.status === "confirmed" && (
                            <span style={{ fontSize: "0.66rem", color: "#166534", fontWeight: 800 }}>
                              ✓ Komitmen Terkonfirmasi
                            </span>
                          )}

                          {item.status === "rejected" && item.rejection_reason && (
                            <span style={{ fontSize: "0.65rem", color: "#dc2626", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.rejection_reason}>
                              Alasan: {item.rejection_reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Aksi */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                          {/* WhatsApp Quick Chat */}
                          <a
                            href={getWhatsAppLink(item)}
                            target="_blank"
                            rel="noreferrer"
                            className="join-action-btn join-action-wa"
                            title="Hubungi via WhatsApp"
                          >
                            <MessageCircle size={13} />
                            <span>WA</span>
                          </a>

                          {/* Accept (if pending) */}
                          {item.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => void handleAccept(item)}
                              disabled={actionLoading}
                              className="join-action-btn join-action-accept"
                              title="Setujui pendaftaran calon member"
                            >
                              <Check size={13} />
                              <span>Setujui</span>
                            </button>
                          )}

                          {/* Activate (if confirmed or accepted) */}
                          {(item.status === "confirmed" || item.status === "accepted") && (
                            <button
                              type="button"
                              onClick={() => {
                                setActivateItem(item);
                                setCustomMemberId(suggestedMemberId);
                              }}
                              disabled={actionLoading}
                              className="join-action-btn join-action-activate"
                              title="Terbitkan nomor ID RR resmi"
                            >
                              <Sparkles size={13} />
                              <span>Aktivasi</span>
                            </button>
                          )}

                          {/* Reject (if pending or accepted) */}
                          {(item.status === "pending" || item.status === "accepted") && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectItem(item);
                                setRejectReason("");
                              }}
                              disabled={actionLoading}
                              className="join-action-btn join-action-reject"
                              title="Tolak permohonan pendaftaran"
                            >
                              Tolak
                            </button>
                          )}

                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="join-action-btn join-action-detail"
                            title="Lihat detail lengkap calon member"
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Mobile View: Clean & Uniform Cards (< 768px) */}
        <div className="admin-join-cards-mobile">
          {filteredRequests.length === 0 ? (
            <section className="empty-state card">
              <UserPlus size={40} style={{ color: "var(--red)", margin: "0 auto 10px" }} />
              <h3>Tidak Ada Data Pendaftaran</h3>
              <p>
                {search
                  ? "Tidak ada calon member yang cocok dengan kata kunci pencarian Anda."
                  : tab === "pending"
                  ? "Bagus! Saat ini tidak ada pendaftaran baru yang menunggu verifikasi."
                  : "Belum ada data pendaftar pada kategori status ini."}
              </p>
            </section>
          ) : (
            filteredRequests.map((item) => (
              <article key={item.id} className="admin-join-card">
                {/* Head: Avatar, Name, Status Badge, ID */}
                <div className="admin-join-card-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div className="member-avatar" style={{ width: 38, height: 38, fontSize: "0.72rem", flexShrink: 0 }}>
                      {getInitials(item.full_name)}
                    </div>
                    <div className="admin-join-card-name-group">
                      <span className="admin-join-card-name">{item.full_name}</span>
                      <span className="admin-join-card-sub">
                        Daftar: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.created_at))}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    {getStatusBadge(item.status)}
                    {item.assigned_member_id && (
                      <span className="member-id-tag" style={{ background: "rgba(229, 29, 42, 0.08)", color: "var(--red)", border: "1px solid rgba(229, 29, 42, 0.22)", padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 800 }}>
                        {item.assigned_member_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body: Info Rows */}
                <div className="admin-join-card-body">
                  <div className="admin-join-card-info-row">
                    <MapPin size={13} style={{ color: "var(--red)", flexShrink: 0 }} />
                    <span>Domisili: <b>{item.city}</b> (TTL: {item.birth_place},{" "}
                      {item.birth_date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(new Date(item.birth_date)) : "-"}
                    )</span>
                  </div>

                  <div className="admin-join-card-info-row" style={{ justifyContent: "space-between" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Phone size={13} style={{ color: "#16a34a", flexShrink: 0 }} />
                      <b>{item.whatsapp}</b>
                    </span>
                    <a
                      href={`https://instagram.com/${item.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#e1306c", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      <InstagramIcon size={12} />
                      <span>@{item.instagram.replace(/^@/, "")}</span>
                    </a>
                  </div>

                  {item.status === "accepted" && item.confirmation_token && (
                    <div style={{ paddingTop: 4, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Tautan Konfirmasi:</span>
                      <button
                        type="button"
                        onClick={() => copyConfirmationLink(item)}
                        className="join-action-copy"
                      >
                        <Copy size={11} />
                        <span>Salin Link</span>
                      </button>
                    </div>
                  )}

                  {item.status === "confirmed" && (
                    <div style={{ fontSize: "0.68rem", color: "#166534", fontWeight: 800 }}>
                      ✓ Calon telah konfirmasi kesiapan bergabung
                    </div>
                  )}

                  {item.status === "rejected" && item.rejection_reason && (
                    <div style={{ fontSize: "0.68rem", color: "#dc2626" }}>
                      Alasan: {item.rejection_reason}
                    </div>
                  )}
                </div>

                {/* Footer: Action Buttons */}
                <div className="admin-join-card-actions">
                  <a
                    href={getWhatsAppLink(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="join-action-btn join-action-wa"
                    style={{ flex: 1 }}
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>

                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => void handleAccept(item)}
                      disabled={actionLoading}
                      className="join-action-btn join-action-accept"
                      style={{ flex: 1.2 }}
                    >
                      <Check size={14} />
                      <span>Setujui</span>
                    </button>
                  )}

                  {(item.status === "confirmed" || item.status === "accepted") && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivateItem(item);
                        setCustomMemberId(suggestedMemberId);
                      }}
                      disabled={actionLoading}
                      className="join-action-btn join-action-activate"
                      style={{ flex: 1.2 }}
                    >
                      <Sparkles size={14} />
                      <span>Aktivasi</span>
                    </button>
                  )}

                  {(item.status === "pending" || item.status === "accepted") && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectItem(item);
                        setRejectReason("");
                      }}
                      disabled={actionLoading}
                      className="join-action-btn join-action-reject"
                    >
                      Tolak
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    className="join-action-btn join-action-detail"
                    aria-label="Lihat detail lengkap"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Floating Toast Notification (Zero push) */}
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

      {/* Detail Modal with Integrated Actions */}
      {detailItem && (
        <ModalSheet
          open={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          eyebrow="DETAIL CALON MEMBER"
          title="Informasi Lengkap Pendaftaran"
        >
          <div className="join-detail-container">
            {/* Hero Head */}
            <div className="join-detail-hero">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="member-avatar" style={{ width: 44, height: 44, fontSize: "0.85rem" }}>
                  {getInitials(detailItem.full_name)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>{detailItem.full_name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    {getStatusBadge(detailItem.status)}
                    {detailItem.assigned_member_id && (
                      <span className="member-id-tag" style={{ background: "rgba(229, 29, 42, 0.08)", color: "var(--red)", border: "1px solid rgba(229, 29, 42, 0.22)", padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 800 }}>
                        {detailItem.assigned_member_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sections 2-column grid */}
            <div className="join-detail-sections">
              {/* Box 1: Identitas Pribadi */}
              <div className="join-detail-box">
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--ink)", paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 5 }}>
                  <UsersRound size={13} style={{ color: "var(--red)" }} />
                  <span>IDENTITAS PRIBADI</span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Tempat, Tanggal Lahir</span>
                  <span className="join-detail-val">
                    {detailItem.birth_place},{" "}
                    {detailItem.birth_date
                      ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(detailItem.birth_date))
                      : "—"}
                  </span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Domisili / Kota</span>
                  <span className="join-detail-val">{detailItem.city}</span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Nomor WhatsApp</span>
                  <span className="join-detail-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {detailItem.whatsapp}
                    <a
                      href={getWhatsAppLink(detailItem)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#16a34a", fontWeight: 800, fontSize: "0.72rem", textDecoration: "none" }}
                    >
                      Chat WA ↗
                    </a>
                  </span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Akun Instagram</span>
                  <span className="join-detail-val">
                    <a
                      href={`https://instagram.com/${detailItem.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#e1306c", fontWeight: 800, textDecoration: "none" }}
                    >
                      @{detailItem.instagram.replace(/^@/, "")} ↗
                    </a>
                  </span>
                </div>
              </div>

              {/* Box 2: Riwayat Pendaftaran */}
              <div className="join-detail-box">
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--ink)", paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={13} style={{ color: "var(--red)" }} />
                  <span>RIWAYAT STATUS SELEKSI</span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Waktu Registrasi Masuk</span>
                  <span className="join-detail-val" style={{ color: "#475569" }}>
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.created_at))} WIB
                  </span>
                </div>

                {detailItem.accepted_at && (
                  <div className="join-detail-row">
                    <span className="join-detail-label">Disetujui Pengurus Pada</span>
                    <span className="join-detail-val" style={{ color: "#1e40af" }}>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.accepted_at))} WIB
                    </span>
                  </div>
                )}

                {detailItem.confirmed_at && (
                  <div className="join-detail-row">
                    <span className="join-detail-label">Konfirmasi Komitmen Calon</span>
                    <span className="join-detail-val" style={{ color: "#166534" }}>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.confirmed_at))} WIB
                    </span>
                  </div>
                )}

                {detailItem.activated_at && (
                  <div className="join-detail-row">
                    <span className="join-detail-label">Diresmikan Sebagai Member</span>
                    <span className="join-detail-val" style={{ color: "#86198f" }}>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.activated_at))} WIB
                    </span>
                  </div>
                )}

                {detailItem.rejection_reason && (
                  <div className="join-detail-row">
                    <span className="join-detail-label" style={{ color: "#dc2626" }}>Alasan Penolakan</span>
                    <span className="join-detail-val" style={{ color: "#b91c1c" }}>
                      {detailItem.rejection_reason}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Action Footer inside Modal */}
            <div className="join-detail-modal-footer">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="join-action-btn join-action-detail"
              >
                Tutup
              </button>

              <a
                href={getWhatsAppLink(detailItem)}
                target="_blank"
                rel="noreferrer"
                className="join-action-btn join-action-wa"
              >
                <MessageCircle size={14} />
                <span>Chat WhatsApp</span>
              </a>

              {(detailItem.status === "pending" || detailItem.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailItem;
                    setDetailItem(null);
                    setRejectItem(target);
                    setRejectReason("");
                  }}
                  disabled={actionLoading}
                  className="join-action-btn join-action-reject"
                >
                  Tolak
                </button>
              )}

              {detailItem.status === "pending" && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleAccept(detailItem);
                    setDetailItem(null);
                  }}
                  disabled={actionLoading}
                  className="join-action-btn join-action-accept"
                >
                  <Check size={14} />
                  <span>Setujui Pendaftaran</span>
                </button>
              )}

              {(detailItem.status === "confirmed" || detailItem.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailItem;
                    setDetailItem(null);
                    setActivateItem(target);
                    setCustomMemberId(suggestedMemberId);
                  }}
                  disabled={actionLoading}
                  className="join-action-btn join-action-activate"
                >
                  <Sparkles size={14} />
                  <span>Aktivasi Member Resmi</span>
                </button>
              )}
            </div>
          </div>
        </ModalSheet>
      )}

      {/* Reject Confirmation Modal */}
      {rejectItem && (
        <ModalSheet
          open={Boolean(rejectItem)}
          onClose={() => setRejectItem(null)}
          eyebrow="TOLAK PENDAFTARAN"
          title="Konfirmasi Penolakan"
        >
          <div style={{ fontSize: "0.82rem" }}>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "0 0 14px" }}>
              Apakah Anda yakin ingin menolak permohonan dari <b>{rejectItem.full_name}</b>? Pendaftar yang ditolak dapat
              mengajukan pendaftaran ulang di kemudian hari.
            </p>

            <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, marginBottom: 6 }}>
              Alasan Penolakan (Opsional):
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Nomor WhatsApp tidak dapat dihubungi atau data belum lengkap."
              style={{
                width: "100%",
                minHeight: 80,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "10px",
                marginBottom: 20,
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                style={{
                  background: "#f1f5f9",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {actionLoading ? "Memproses…" : "Ya, Tolak Permohonan"}
              </button>
            </div>
          </div>
        </ModalSheet>
      )}

      {/* Activate Member Modal */}
      {activateItem && (
        <ModalSheet
          open={Boolean(activateItem)}
          onClose={() => setActivateItem(null)}
          eyebrow="AKTIVASI ANGGOTA RESMI"
          title="Penerbitan ID RR"
        >
          <div style={{ fontSize: "0.82rem" }}>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "0 0 14px" }}>
              Calon anggota <b>{activateItem.full_name}</b> akan resmi didaftarkan ke basis data keanggotaan Revolt Riders.
              Data akan otomatis tampil di Statistik Club, Direktori Member, dan Klasemen Leaderboard.
            </p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, marginBottom: 6, color: "#334155" }}>
                Nomor Anggota (ID RR Resmi):
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={customMemberId}
                  onChange={(e) => setCustomMemberId(e.target.value.toUpperCase())}
                  placeholder="RR-028"
                  style={{
                    flex: 1,
                    border: "1.5px solid var(--red)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                />
              </div>
              <small style={{ color: "#64748b", marginTop: 5, display: "block" }}>
                Saran sistem nomor urut berikutnya: <b>{suggestedMemberId}</b>. Anda dapat mengubah nomor jika diperlukan.
              </small>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setActivateItem(null)}
                style={{
                  background: "#f1f5f9",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={actionLoading}
                style={{
                  background: "var(--red)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} />
                <span>{actionLoading ? "Mengaktivasi…" : "AKTIFKAN RESMI"}</span>
              </button>
            </div>
          </div>
        </ModalSheet>
      )}
    </AppShell>
  );
}
