"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
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

export default function AdminJoinRequestsPage() {
  const { account, loading: authLoading } = useMemberAccess();
  const isStaff = Boolean(account && ["admin", "superadmin", "road_captain"].includes(account.role));

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pending" | "accepted" | "confirmed" | "active" | "archived">("pending");

  // Modals state
  const [detailItem, setDetailItem] = useState<JoinRequest | null>(null);
  const [rejectItem, setRejectItem] = useState<JoinRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activateItem, setActivateItem] = useState<JoinRequest | null>(null);
  const [suggestedMemberId, setSuggestedMemberId] = useState("RR-028");
  const [customMemberId, setCustomMemberId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Data
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const supabase = getSupabaseBrowserClient();

      const { data, error: qErr } = await supabase
        .from("join_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;

      setRequests((data ?? []) as JoinRequest[]);

      // Calculate next Member ID
      const { data: profiles } = await supabase
        .from("member_profiles")
        .select("member_external_id");

      if (profiles && profiles.length > 0) {
        let maxNum = 27;
        for (const p of profiles) {
          const m = p.member_external_id?.match(/^RR-(\d+)$/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        const nextId = `RR-${String(maxNum + 1).padStart(3, "0")}`;
        setSuggestedMemberId(nextId);
        setCustomMemberId(nextId);
      }
    } catch (err) {
      const rawMsg = (err as { message?: string })?.message || "";
      if (rawMsg.includes("join_requests") || rawMsg.includes("schema cache")) {
        setError("Tabel join_requests belum dibuat di Supabase. Silakan jalankan file migrasi 20260918000300_add_join_requests_and_public_landing.sql di SQL Editor Supabase.");
      } else if (rawMsg) {
        setError(rawMsg);
      } else {
        setError("Gagal memuat data pendaftaran.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
    setError("");
    setSuccess("");

    try {
      const supabase = getSupabaseBrowserClient();

      const { data, error: rpcErr } = await supabase.rpc("accept_join_request", {
        p_request_id: item.id,
      });

      if (rpcErr) throw rpcErr;

      setSuccess(`Pendaftaran ${item.full_name} berhasil disetujui (Accepted).`);
      void loadRequests();
    } catch (err) {
      // Fallback direct update
      try {
        const supabase = getSupabaseBrowserClient();
        const token = item.confirmation_token || Math.random().toString(36).substring(2) + Date.now().toString(36);
        const { error: updErr } = await supabase
          .from("join_requests")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
            confirmation_token: token,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updErr) throw updErr;

        setSuccess(`Pendaftaran ${item.full_name} berhasil disetujui (Accepted).`);
        void loadRequests();
      } catch (innerErr) {
        setError(innerErr instanceof Error ? innerErr.message : "Gagal menyetujui pendaftaran.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectItem) return;
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = getSupabaseBrowserClient();

      const { error: rpcErr } = await supabase.rpc("reject_join_request", {
        p_request_id: rejectItem.id,
        p_reason: rejectReason.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      setSuccess(`Pendaftaran ${rejectItem.full_name} telah ditolak.`);
      setRejectItem(null);
      setRejectReason("");
      void loadRequests();
    } catch (err) {
      // Fallback direct update
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: updErr } = await supabase
          .from("join_requests")
          .update({
            status: "rejected",
            rejected_at: new Date().toISOString(),
            rejection_reason: rejectReason.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rejectItem.id);

        if (updErr) throw updErr;

        setSuccess(`Pendaftaran ${rejectItem.full_name} telah ditolak.`);
        setRejectItem(null);
        setRejectReason("");
        void loadRequests();
      } catch (innerErr) {
        setError(innerErr instanceof Error ? innerErr.message : "Gagal menolak pendaftaran.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activateItem) return;
    const memberIdToAssign = (customMemberId || suggestedMemberId).trim().toUpperCase();

    if (!memberIdToAssign.match(/^RR-\d{3,}$/)) {
      setError("Format ID RR harus RR-XXX (contoh: RR-028)");
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = getSupabaseBrowserClient();

      const { data, error: rpcErr } = await supabase.rpc("activate_join_request", {
        p_request_id: activateItem.id,
        p_member_id: memberIdToAssign,
      });

      if (rpcErr) throw rpcErr;

      setSuccess(`Member resmi berhasil diaktivasi dengan ID ${memberIdToAssign}!`);
      setActivateItem(null);
      void loadRequests();
    } catch (err) {
      // Fallback direct update + insert
      try {
        const supabase = getSupabaseBrowserClient();

        // 1. Insert into member_profiles
        const { error: insErr } = await supabase.from("member_profiles").insert({
          member_external_id: memberIdToAssign,
          full_name: activateItem.full_name,
          nickname: activateItem.full_name.split(" ")[0],
          city: activateItem.city,
          join_date: new Date().toISOString().split("T")[0],
          club_role: "VIRGIN",
          total_km: 0,
          source_file: "JOIN_REQUEST",
        });

        if (insErr) throw insErr;

        // 2. Update join request to active
        const { error: updErr } = await supabase
          .from("join_requests")
          .update({
            status: "active",
            activated_at: new Date().toISOString(),
            assigned_member_id: memberIdToAssign,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activateItem.id);

        if (updErr) throw updErr;

        setSuccess(`Member resmi berhasil diaktivasi dengan ID ${memberIdToAssign}!`);
        setActivateItem(null);
        void loadRequests();
      } catch (innerErr) {
        setError(innerErr instanceof Error ? innerErr.message : "Gagal mengaktivasi member.");
      }
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
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getStatusBadge = (status: JoinRequest["status"]) => {
    switch (status) {
      case "pending":
        return <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>Pending</span>;
      case "accepted":
        return <span style={{ background: "#eff6ff", color: "#1e40af", padding: "4px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>Accepted</span>;
      case "confirmed":
        return <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>Confirmed</span>;
      case "active":
        return <span style={{ background: "#fae8ff", color: "#86198f", padding: "4px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>Active</span>;
      case "rejected":
        return <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>Rejected</span>;
      case "expired":
        return <span style={{ background: "#f1f5f9", color: "#64748b", padding: "4px 8px", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 800 }}>Expired</span>;
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

          <button onClick={() => void loadRequests()} disabled={loading}>
            <RefreshCw className={loading ? "spin" : ""} size={16} />
            <span>Segarkan</span>
          </button>
        </section>

        {/* Notifications */}
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message"><CheckCircle2 size={17} />{success}</p>}

        {/* Status Filter Tabs */}
        <div className="agenda-tabs" role="tablist" aria-label="Filter status pendaftaran" style={{ marginBottom: 20 }}>
          <button
            role="tab"
            aria-selected={tab === "pending"}
            className={tab === "pending" ? "active" : ""}
            onClick={() => setTab("pending")}
          >
            <Clock size={15} />
            Pending <b>{counts.pending}</b>
          </button>

          <button
            role="tab"
            aria-selected={tab === "accepted"}
            className={tab === "accepted" ? "active" : ""}
            onClick={() => setTab("accepted")}
          >
            <Check size={15} />
            Accepted <b>{counts.accepted}</b>
          </button>

          <button
            role="tab"
            aria-selected={tab === "confirmed"}
            className={tab === "confirmed" ? "active" : ""}
            onClick={() => setTab("confirmed")}
          >
            <UserCheck size={15} />
            Confirmed <b>{counts.confirmed}</b>
          </button>

          <button
            role="tab"
            aria-selected={tab === "active"}
            className={tab === "active" ? "active" : ""}
            onClick={() => setTab("active")}
          >
            <ShieldCheck size={15} />
            Active <b>{counts.active}</b>
          </button>

          <button
            role="tab"
            aria-selected={tab === "archived"}
            className={tab === "archived" ? "active" : ""}
            onClick={() => setTab("archived")}
          >
            <UserX size={15} />
            Arsip <b>{counts.archived}</b>
          </button>

          <button
            role="tab"
            aria-selected={tab === "all"}
            className={tab === "all" ? "active" : ""}
            onClick={() => setTab("all")}
          >
            <UsersRound size={15} />
            Semua <b>{counts.all}</b>
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-box" style={{ maxWidth: "100%", marginBottom: 20 }}>
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, domisili, nomor WhatsApp, atau akun Instagram…"
          />
        </div>

        {/* Main List Table / Cards */}
        {loading ? (
          <p className="system-message">Memuat data pendaftar…</p>
        ) : filteredRequests.length === 0 ? (
          <section className="empty-state card">
            <UserPlus size={44} style={{ color: "var(--red)", margin: "0 auto 12px" }} />
            <h2>Tidak Ada Data Pendaftaran</h2>
            <p>
              {search
                ? "Tidak ada pendaftar yang cocok dengan kata kunci pencarian Anda."
                : tab === "pending"
                ? "Bagus! Saat ini tidak ada pendaftaran baru yang menunggu verifikasi."
                : "Belum ada data pendaftar pada kategori status ini."}
            </p>
          </section>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredRequests.map((item) => (
              <article
                key={item.id}
                className="card"
                style={{
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "minmax(200px, 1.3fr) minmax(140px, 1fr) minmax(130px, 0.9fr) auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                {/* 1. Name & Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{item.full_name}</strong>
                    {getStatusBadge(item.status)}
                    {item.assigned_member_id && (
                      <span style={{ background: "#171819", color: "#fff", padding: "2px 7px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 900 }}>
                        {item.assigned_member_id}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <span><MapPin size={13} style={{ verticalAlign: "-2px", color: "var(--red)" }} /> {item.city}</span>
                    <span><InstagramIcon size={13} style={{ verticalAlign: "-2px" }} /> @{item.instagram}</span>
                  </div>
                </div>

                {/* 2. Contact & Dates */}
                <div style={{ fontSize: "0.74rem" }}>
                  <div style={{ color: "#334155", fontWeight: 700, marginBottom: 3 }}>
                    <Phone size={13} style={{ verticalAlign: "-2px", color: "#16a34a" }} /> {item.whatsapp}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.68rem" }}>
                    Daftar: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.created_at))}
                  </div>
                </div>

                {/* 3. Action Links / Copy Token */}
                <div>
                  {item.status === "accepted" && item.confirmation_token && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => copyConfirmationLink(item)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: 7,
                          padding: "6px 9px",
                          fontSize: "0.68rem",
                          fontWeight: 750,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {copiedId === item.id ? <Check size={13} style={{ color: "#16a34a" }} /> : <Copy size={13} />}
                        <span>{copiedId === item.id ? "Disalin!" : "Link Konfirmasi"}</span>
                      </button>
                    </div>
                  )}

                  {item.status === "confirmed" && (
                    <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 800 }}>
                      ✓ Siap Aktivasi Member
                    </span>
                  )}
                </div>

                {/* 4. Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  {/* WhatsApp Direct Button */}
                  <a
                    href={getWhatsAppLink(item)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "#22c55e",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    title="Hubungi via WhatsApp"
                  >
                    <MessageCircle size={15} />
                    <span>WhatsApp</span>
                  </a>

                  {/* Accept (if pending) */}
                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => handleAccept(item)}
                      disabled={actionLoading}
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: 0,
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Check size={14} />
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
                      style={{
                        background: "var(--red)",
                        color: "#fff",
                        border: 0,
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Sparkles size={14} />
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
                      style={{
                        background: "#fff",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Tolak
                    </button>
                  )}

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => setDetailItem(item)}
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      border: 0,
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                    title="Lihat Detail"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <ModalSheet
          open={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          eyebrow="DETAIL CALON MEMBER"
          title="Informasi Pendaftaran"
        >
          <div style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>{detailItem.full_name}</h3>
              {getStatusBadge(detailItem.status)}
            </div>

            <dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "10px 14px", margin: "16px 0" }}>
              <dt style={{ color: "#64748b", fontWeight: 700 }}>Tempat, Tgl Lahir:</dt>
              <dd style={{ margin: 0, color: "#0f172a", fontWeight: 750 }}>
                {detailItem.birth_place},{" "}
                {detailItem.birth_date
                  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(detailItem.birth_date))
                  : "-"}
              </dd>

              <dt style={{ color: "#64748b", fontWeight: 700 }}>Domisili / Kota:</dt>
              <dd style={{ margin: 0, color: "#0f172a" }}>{detailItem.city}</dd>

              <dt style={{ color: "#64748b", fontWeight: 700 }}>Nomor WhatsApp:</dt>
              <dd style={{ margin: 0, color: "#0f172a", fontWeight: 750 }}>
                {detailItem.whatsapp}{" "}
                <a
                  href={getWhatsAppLink(detailItem)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#16a34a", marginLeft: 8, fontWeight: 800 }}
                >
                  Buka Chat ↗
                </a>
              </dd>

              <dt style={{ color: "#64748b", fontWeight: 700 }}>Instagram:</dt>
              <dd style={{ margin: 0 }}>
                <a
                  href={`https://instagram.com/${detailItem.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#e1306c", fontWeight: 800 }}
                >
                  @{detailItem.instagram} ↗
                </a>
              </dd>

              <dt style={{ color: "#64748b", fontWeight: 700 }}>Waktu Daftar:</dt>
              <dd style={{ margin: 0, color: "#64748b" }}>
                {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(
                  new Date(detailItem.created_at)
                )}{" "}
                WIB
              </dd>

              {detailItem.accepted_at && (
                <>
                  <dt style={{ color: "#64748b", fontWeight: 700 }}>Disetujui Pada:</dt>
                  <dd style={{ margin: 0, color: "#1e40af" }}>
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(
                      new Date(detailItem.accepted_at)
                    )}{" "}
                    WIB
                  </dd>
                </>
              )}

              {detailItem.confirmed_at && (
                <>
                  <dt style={{ color: "#64748b", fontWeight: 700 }}>Dikonfirmasi Pada:</dt>
                  <dd style={{ margin: 0, color: "#166534" }}>
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(
                      new Date(detailItem.confirmed_at)
                    )}{" "}
                    WIB
                  </dd>
                </>
              )}

              {detailItem.assigned_member_id && (
                <>
                  <dt style={{ color: "#64748b", fontWeight: 700 }}>ID RR Diberikan:</dt>
                  <dd style={{ margin: 0, color: "var(--red)", fontWeight: 900 }}>{detailItem.assigned_member_id}</dd>
                </>
              )}

              {detailItem.rejection_reason && (
                <>
                  <dt style={{ color: "#64748b", fontWeight: 700 }}>Alasan Penolakan:</dt>
                  <dd style={{ margin: 0, color: "#dc2626" }}>{detailItem.rejection_reason}</dd>
                </>
              )}
            </dl>

            <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                style={{
                  background: "#f1f5f9",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontSize: "0.78rem",
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                Tutup
              </button>
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
                fontSize: "0.78rem",
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
                  fontSize: "0.78rem",
                  fontWeight: 750,
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
                  fontSize: "0.78rem",
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
                    fontWeight: 900,
                    fontSize: "0.95rem",
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
                  fontSize: "0.78rem",
                  fontWeight: 750,
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
                  fontSize: "0.78rem",
                  fontWeight: 850,
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
