"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Check,
  CheckCircle2,
  Clock,
  Gauge,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
  join_date: string | null;
  club_role: string | null;
  total_km: number;
};
type Detail = {
  member_external_id: string;
  nickname_override: string | null;
  motorcycle: string | null;
  city_override: string | null;
};
type MemberAccount = {
  id: string;
  member_external_id: string;
  role: string;
  status: "active" | "inactive" | "pending";
};
type MemberAdminSnapshot = {
  members: Member[];
  details: Detail[];
  accounts: MemberAccount[];
};

type MemberForm = {
  memberId: string;
  fullName: string;
  nickname: string;
  city: string;
  joinDate: string;
  clubRole: string;
  totalKm: string;
  motorcycle: string;
};

const emptyForm: MemberForm = {
  memberId: "",
  fullName: "",
  nickname: "",
  city: "",
  joinDate: "",
  clubRole: "",
  totalKm: "0",
  motorcycle: "",
};
const roles = ["member", "road_captain", "treasurer", "admin", "superadmin"];

const getInitials = (name: string, nickname: string | null) => {
  const text = (nickname || name || "RR").trim();
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
};

const getRoleClass = (role: string | null) => {
  const r = (role ?? "").toUpperCase().trim();
  if (r === "PRESIDENT") return "badge-president";
  if (r === "FOUNDER") return "badge-founder";
  if (r === "EXCECUTOR" || r === "EXECUTOR") return "badge-executor";
  if (r === "NEGOSIATOR") return "badge-negosiator";
  if (r === "CAPROS") return "badge-capros";
  if (r === "PROSPEK") return "badge-prospek";
  if (r === "VIRGIN") return "badge-virgin";
  if (r === "LIFE MEMBER" || r === "LIFEMEMBER") return "badge-lifemember";
  if (r.includes("CAPTAIN")) return "badge-rc";
  if (
    r.includes("ADMIN") ||
    r.includes("KETUA") ||
    r.includes("SEKRETARIS") ||
    r.includes("BENDAHARA")
  )
    return "badge-admin";
  return "";
};

export default function ManageMembersPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [members, setMembers] = useState<Member[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "with_account" | "without_account">("all");

  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MemberAccount | null>(null);
  const [accountRole, setAccountRole] = useState<string>("member");
  const [accountStatus, setAccountStatus] = useState<"active" | "inactive">("active");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const load = useCallback(async (forceRefresh = false) => {
    if (accessLoading) return;

    if (
      account?.status !== "active" ||
      !["admin", "superadmin"].includes(account.role)
    ) {
      setLoading(false);
      return;
    }

    if (!forceRefresh) setLoading(true);
    setError("");

    try {
      const snapshot = await fetchWithCache<MemberAdminSnapshot>(
        "admin:members",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [memberResult, detailResult, accountListResult] =
            await Promise.all([
              supabase
                .from("member_profiles")
                .select(
                  "member_external_id,full_name,nickname,city,join_date,club_role,total_km",
                )
                .order("member_external_id"),
              supabase
                .from("member_details")
                .select(
                  "member_external_id,nickname_override,motorcycle,city_override",
                ),
              supabase
                .from("member_accounts")
                .select("id,member_external_id,role,status")
                .order("member_external_id"),
            ]);

          const failed =
            memberResult.error ||
            detailResult.error ||
            accountListResult.error;
          if (failed) throw failed;

          return {
            members: ((memberResult.data ?? []) as Member[]).map((member) => ({
              ...member,
              total_km: Number(member.total_km),
            })),
            details: (detailResult.data ?? []) as Detail[],
            accounts: (accountListResult.data ?? []) as MemberAccount[],
          };
        },
        { ttlMs: 45_000, forceRefresh },
      );

      setMembers(snapshot.members);
      setDetails(snapshot.details);
      setAccounts(snapshot.accounts);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Data member belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessLoading, account, fetchWithCache]);

  useEffect(() => {
    if (!accessLoading) invalidateCache("admin:members");
      void load(true);
  }, [accessLoading, load]);

  const detailByMember = useMemo(
    () => new Map(details.map((detail) => [detail.member_external_id, detail])),
    [details],
  );
  const accountByMember = useMemo(
    () =>
      new Map(
        accounts.map((memberAccount) => [
          memberAccount.member_external_id,
          memberAccount,
        ]),
      ),
    [accounts],
  );

  // Tab counts
  const withAccountCount = useMemo(
    () => members.filter((m) => accountByMember.has(m.member_external_id)).length,
    [members, accountByMember],
  );
  const withoutAccountCount = members.length - withAccountCount;

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return members.filter((member) => {
      // 1. Filter Tab
      const hasAcc = accountByMember.has(member.member_external_id);
      if (filterTab === "with_account" && !hasAcc) return false;
      if (filterTab === "without_account" && hasAcc) return false;

      // 2. Search Query
      if (!normalized) return true;
      const detail = detailByMember.get(member.member_external_id);
      return (
        member.member_external_id.toLowerCase().includes(normalized) ||
        member.full_name.toLowerCase().includes(normalized) ||
        (member.nickname ?? "").toLowerCase().includes(normalized) ||
        (member.city ?? "").toLowerCase().includes(normalized) ||
        (detail?.motorcycle ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [members, query, filterTab, accountByMember, detailByMember]);

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setEditingAccount(null);
    setError("");
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditing(false);
    setEditingAccount(null);
    setAccountRole("member");
    setAccountStatus("active");
    setFormOpen(true);
    setError("");
  };

  const openEdit = (member: Member) => {
    const detail = detailByMember.get(member.member_external_id);
    const linkedAccount = accountByMember.get(member.member_external_id) || null;

    setForm({
      memberId: member.member_external_id,
      fullName: member.full_name,
      nickname: member.nickname ?? "",
      city: member.city ?? "",
      joinDate: member.join_date ?? "",
      clubRole: member.club_role ?? "",
      totalKm: String(member.total_km),
      motorcycle: detail?.motorcycle ?? "",
    });
    setEditing(true);
    setEditingAccount(linkedAccount);
    if (linkedAccount) {
      setAccountRole(linkedAccount.role);
      setAccountStatus(linkedAccount.status === "inactive" ? "inactive" : "active");
    }
    setFormOpen(true);
    setError("");
  };

  const saveMember = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const supabase = getSupabaseBrowserClient();

    // 1. Update/insert member profile
    const { error: saveError } = await supabase.rpc(
      "upsert_member_profile",
      {
        p_member_external_id: form.memberId.trim().toUpperCase(),
        p_full_name: form.fullName.trim(),
        p_nickname: form.nickname.trim() || null,
        p_city: form.city.trim() || null,
        p_join_date: form.joinDate || null,
        p_club_role: form.clubRole.trim() || null,
        p_total_km: Number(form.totalKm || 0),
        p_motorcycle: form.motorcycle.trim() || null,
      },
    );

    if (saveError) {
      setError(saveError.message);
      showToast(saveError.message, "error");
      setSaving(false);
      return;
    }

    // 2. Update linked account role and status if changed
    if (editing && editingAccount) {
      try {
        if (accountStatus !== editingAccount.status) {
          await supabase.rpc("set_member_account_status", {
            p_account_id: editingAccount.id,
            p_status: accountStatus,
          });
        }
        if (account?.role === "superadmin" && accountRole !== editingAccount.role) {
          await supabase.rpc("set_member_account_role", {
            p_account_id: editingAccount.id,
            p_role: accountRole,
          });
        }
      } catch (accErr) {
        console.warn("Account update notice:", accErr);
      }
    }

    showToast(
      `Data ${form.memberId.toUpperCase()} berhasil ${editing ? "diperbarui" : "ditambahkan"}.`,
      "success",
    );
    setFormOpen(false);
    setForm(emptyForm);
    setEditingAccount(null);
    invalidateCache("member_profiles_list");
    invalidateCache("admin_dashboard_overview");
    invalidateCache("dashboard_club_stats");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("admin:members");
      await load(true);
    setSaving(false);
  };

  if (loading)
    return (
      <AppShell active="Kelola Member" title="Manajemen Member">
        <PageSkeleton title="Memuat Direktori Member..." />
      </AppShell>
    );

  if (
    !account ||
    account.status !== "active" ||
    !["admin", "superadmin"].includes(account.role)
  )
    return (
      <AppShell active="Kelola Member" title="Manajemen Member">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert size={44} style={{ color: "var(--red)", margin: "0 auto 12px" }} />
            <h2>Akses admin diperlukan</h2>
            <p>
              Halaman ini hanya tersedia untuk akun aktif Admin dan Superadmin.
            </p>
            <a className="primary-action" href={account ? "/profil" : "/login"}>
              {account ? "LIHAT STATUS AKUN" : "MASUK"}
            </a>
          </section>
        </div>
      </AppShell>
    );

  return (
    <AppShell active="Kelola Member" title="Manajemen Member">
      <div className="page-wrap">
        {/* Header section */}
        <div className="page-intro native-page-head">
          <div>
            <em>Direktori member</em>
            <h2>Kelola Member ({members.length} Riders)</h2>
            <p>Atur data anggota resmi, nomor registrasi RR, dan akses akun aplikasi.</p>
          </div>
          <button
            type="button"
            className="outline-action"
            onClick={() => {
              invalidateCache("member_profiles_list");
              invalidateCache("admin_dashboard_overview");
              invalidateCache("dashboard_club_stats");
              invalidateCache("admin:members");
      void load(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw className={loading ? "spin" : ""} style={{ width: 14, height: 14 }} />
            <span>SEGARKAN</span>
          </button>
        </div>

        {/* 1. Filter Tabs (Segmented & Responsive) */}
        <div className="admin-member-tabs" role="tablist" aria-label="Filter status akun member">
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "all"}
            className={`admin-member-tab-btn ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            <UsersRound size={15} />
            <span>Semua Member</span>
            <span className="admin-member-tab-badge">{members.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "with_account"}
            className={`admin-member-tab-btn ${filterTab === "with_account" ? "active" : ""}`}
            onClick={() => setFilterTab("with_account")}
          >
            <UserCheck size={15} />
            <span>Punya Akun</span>
            <span className="admin-member-tab-badge">{withAccountCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === "without_account"}
            className={`admin-member-tab-btn ${filterTab === "without_account" ? "active" : ""}`}
            onClick={() => setFilterTab("without_account")}
          >
            <Clock size={15} />
            <span>Belum Ada Akun</span>
            <span className="admin-member-tab-badge">{withoutAccountCount}</span>
          </button>
        </div>

        {/* 2. Search Bar Toolbar */}
        <div className="admin-member-search-wrap">
          <Search className="search-icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari berdasarkan ID RR, nama rider, motor, atau domisili kota…"
          />
          {query && (
            <button
              type="button"
              className="admin-member-search-clear"
              onClick={() => setQuery("")}
              aria-label="Hapus kata kunci pencarian"
              title="Hapus pencarian"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 3. Desktop & Tablet View: Structured Admin Data Table (>= 768px) */}
        <div className="admin-member-table-card">
          <div className="admin-member-table-wrap">
            <table className="admin-member-table">
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>ID Registrasi</th>
                  <th>Jabatan Club</th>
                  <th>Motor & Kota</th>
                  <th>Total KM</th>
                  <th>Status Akun</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px" }}>
                      <UsersRound size={36} style={{ color: "var(--red)", margin: "0 auto 8px" }} />
                      <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "var(--ink)" }}>
                        Member Tidak Ditemukan
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>
                        Tidak ada data member yang cocok dengan kata kunci atau filter saat ini.
                      </div>
                    </td>
                  </tr>
                ) : (
                  results.map((member) => {
                    const detail = detailByMember.get(member.member_external_id);
                    const memberAccount = accountByMember.get(member.member_external_id);
                    const displayName =
                      detail?.nickname_override ||
                      member.nickname ||
                      member.full_name;
                    const hasDifferentFullName =
                      member.full_name && member.full_name !== displayName;
                    const initials = getInitials(member.full_name, member.nickname);
                    const roleClass = getRoleClass(member.club_role);

                    return (
                      <tr key={member.member_external_id}>
                        {/* 1. Rider */}
                        <td>
                          <div className="admin-table-rider-cell">
                            <div
                              className="member-avatar"
                              style={{ width: 34, height: 34, fontSize: "0.68rem" }}
                            >
                              {initials}
                            </div>
                            <div className="admin-table-rider-names">
                              <span className="admin-table-rider-name" title={displayName}>
                                {displayName}
                              </span>
                              {hasDifferentFullName ? (
                                <span className="admin-table-rider-sub" title={member.full_name}>
                                  {member.full_name}
                                </span>
                              ) : (
                                <span className="admin-table-rider-sub" style={{ color: "#94a3b8" }}>
                                  {member.nickname ? `@${member.nickname}` : "Official Member"}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. ID RR */}
                        <td>
                          <span
                            className="member-id-tag"
                            style={{
                              background: "rgba(229, 29, 42, 0.08)",
                              color: "var(--red)",
                              border: "1px solid rgba(229, 29, 42, 0.22)",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {member.member_external_id}
                          </span>
                        </td>

                        {/* 3. Jabatan Club */}
                        <td>
                          {member.club_role ? (
                            <span className={`member-role-badge ${roleClass}`}>
                              {member.club_role}
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>—</span>
                          )}
                        </td>

                        {/* 4. Motor & Kota */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.72rem" }}>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>
                              {detail?.motorcycle || (
                                <span style={{ color: "#94a3b8", fontWeight: 400 }}>Motor belum diatur</span>
                              )}
                            </span>
                            <span style={{ color: "#64748b", fontSize: "0.68rem" }}>
                              {member.city || (
                                <span style={{ color: "#cbd5e1" }}>Kota belum diatur</span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* 5. Total KM */}
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontWeight: 800,
                              color: "var(--ink)",
                              fontSize: "0.74rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Gauge size={12} style={{ color: "var(--red)" }} />
                            {new Intl.NumberFormat("id-ID").format(member.total_km)} KM
                          </span>
                        </td>

                        {/* 6. Status Akun */}
                        <td>
                          {memberAccount ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: "0.66rem",
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: "5px",
                                background:
                                  memberAccount.status === "active" ? "#f0fdf4" : "#fef2f2",
                                color:
                                  memberAccount.status === "active" ? "#15803d" : "#b91c1c",
                                border:
                                  memberAccount.status === "active"
                                    ? "1px solid #bbf7d0"
                                    : "1px solid #fecaca",
                                whiteSpace: "nowrap",
                              }}
                              title={`Akun: ${memberAccount.role.replace("_", " ")} (${
                                memberAccount.status === "active" ? "Aktif" : "Nonaktif"
                              })`}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background:
                                    memberAccount.status === "active" ? "#16a34a" : "#dc2626",
                                  flexShrink: 0,
                                }}
                              />
                              {memberAccount.role.replace("_", " ")} ({memberAccount.status === "active" ? "Aktif" : "Nonaktif"})
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                padding: "3px 8px",
                                borderRadius: "5px",
                                background: "#f8fafc",
                                color: "#94a3b8",
                                border: "1px solid #e2e8f0",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Belum Ada Akun
                            </span>
                          )}
                        </td>

                        {/* 7. Aksi */}
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="admin-table-edit-btn"
                            onClick={() => openEdit(member)}
                            aria-label={`Edit data ${displayName}`}
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Mobile View: Clean & Uniform Member Cards (< 768px) */}
        <div className="admin-member-cards-mobile">
          {results.length === 0 ? (
            <section className="empty-state card">
              <UsersRound size={40} style={{ color: "var(--red)", margin: "0 auto 10px" }} />
              <h3>Member Tidak Ditemukan</h3>
              <p>Tidak ada data anggota yang cocok dengan kata kunci atau filter saat ini.</p>
            </section>
          ) : (
            results.map((member) => {
              const detail = detailByMember.get(member.member_external_id);
              const memberAccount = accountByMember.get(member.member_external_id);
              const displayName =
                detail?.nickname_override ||
                member.nickname ||
                member.full_name;
              const initials = getInitials(member.full_name, member.nickname);
              const roleClass = getRoleClass(member.club_role);
              const subParts = [
                member.full_name && member.full_name !== displayName ? member.full_name : null,
                detail?.motorcycle || null,
                member.city || null,
              ].filter(Boolean);
              const subText = subParts.length > 0 ? subParts.join(" · ") : "Data motor/domisili belum diatur";

              return (
                <article
                  key={member.member_external_id}
                  className="admin-mobile-card"
                  onClick={() => openEdit(member)}
                >
                  {/* Top: Avatar, Name, ID, Jabatan */}
                  <div className="admin-mobile-card-head">
                    <div
                      className="member-avatar"
                      style={{ width: 36, height: 36, fontSize: "0.7rem", flexShrink: 0 }}
                    >
                      {initials}
                    </div>
                    <div className="admin-mobile-card-title">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span
                          style={{
                            fontSize: "0.86rem",
                            fontWeight: 800,
                            color: "var(--ink)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={displayName}
                        >
                          {displayName}
                        </span>
                        <span
                          className="member-id-tag"
                          style={{
                            background: "rgba(229, 29, 42, 0.08)",
                            color: "var(--red)",
                            border: "1px solid rgba(229, 29, 42, 0.22)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontSize: "0.66rem",
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {member.member_external_id}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        {member.club_role && (
                          <span className={`member-role-badge ${roleClass}`} style={{ flexShrink: 0 }}>
                            {member.club_role}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: subParts.length > 0 ? "#64748b" : "#94a3b8",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {subText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: KM, Account Status, Edit Button */}
                  <div className="admin-mobile-card-footer">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          fontWeight: 800,
                          color: "var(--ink)",
                        }}
                      >
                        <Gauge size={11} style={{ color: "var(--red)" }} />
                        {new Intl.NumberFormat("id-ID").format(member.total_km)} KM
                      </span>
                      <span style={{ color: "#cbd5e1" }}>•</span>
                      {memberAccount ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background:
                              memberAccount.status === "active" ? "#f0fdf4" : "#fef2f2",
                            color:
                              memberAccount.status === "active" ? "#15803d" : "#b91c1c",
                            border:
                              memberAccount.status === "active"
                                ? "1px solid #bbf7d0"
                                : "1px solid #fecaca",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background:
                                memberAccount.status === "active" ? "#16a34a" : "#dc2626",
                            }}
                          />
                          {memberAccount.role.replace("_", " ")} ({memberAccount.status === "active" ? "Aktif" : "Nonaktif"})
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "#f8fafc",
                            color: "#94a3b8",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          Belum Ada Akun
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="admin-table-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(member);
                      }}
                      aria-label={`Edit ${displayName}`}
                      style={{ padding: "4px 8px", flexShrink: 0 }}
                    >
                      <Pencil size={11} />
                      <span>Edit</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Floating Action Button for adding new member */}
        <FloatingActionButton label="Member baru" onClick={openNew} />

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

        {/* Modal Sheet for Add & Edit Member (Structured 2-Column Grid) */}
        <ModalSheet
          open={formOpen}
          onClose={closeForm}
          eyebrow={editing ? "EDIT MEMBER" : "MEMBER BARU"}
          title={
            editing
              ? `${form.memberId} · ${form.fullName || "Member"}`
              : "Tambah data member baru"
          }
        >
          <form className="sheet-form member-sheet-form member-modal-form" onSubmit={saveMember}>
            {/* Seksi 1: Data Profil Member */}
            <div className="member-modal-section">
              <div className="member-modal-section-title">
                <UsersRound size={13} style={{ color: "var(--red)" }} />
                <span>1. Profil Member Resmi</span>
              </div>

              <div className="member-modal-grid-2">
                <label>
                  Member ID
                  <input
                    value={form.memberId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        memberId: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="RR-001"
                    pattern="RR-[0-9]{3,}"
                    disabled={editing}
                    required
                  />
                </label>

                <label>
                  Nama Lengkap
                  <input
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                    maxLength={120}
                    placeholder="Nama lengkap sesuai KTP"
                    required
                  />
                </label>
              </div>

              <div className="member-modal-grid-2">
                <label>
                  Nickname / Panggilan
                  <input
                    value={form.nickname}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nickname: event.target.value,
                      }))
                    }
                    maxLength={80}
                    placeholder="Nama panggilan di club"
                  />
                </label>

                <label>
                  Jabatan Club
                  <input
                    list="club-role-options"
                    value={form.clubRole}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clubRole: event.target.value,
                      }))
                    }
                    maxLength={80}
                    placeholder="PRESIDENT, FOUNDER, dll."
                  />
                  <datalist id="club-role-options">
                    <option value="PRESIDENT" />
                    <option value="FOUNDER" />
                    <option value="EXCECUTOR" />
                    <option value="NEGOSIATOR" />
                    <option value="CAPROS" />
                    <option value="PROSPEK" />
                    <option value="VIRGIN" />
                    <option value="LIFE MEMBER" />
                  </datalist>
                </label>
              </div>

              <label>
                Tanggal Bergabung
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      joinDate: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            {/* Seksi 2: Kendaraan & Jarak Tempuh */}
            <div className="member-modal-section">
              <div className="member-modal-section-title">
                <Gauge size={13} style={{ color: "var(--red)" }} />
                <span>2. Data Kendaraan & Jarak Tempuh</span>
              </div>

              <div className="member-modal-grid-2">
                <label>
                  Kendaraan / Motor
                  <input
                    value={form.motorcycle}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        motorcycle: event.target.value,
                      }))
                    }
                    maxLength={120}
                    placeholder="Contoh: Yamaha R15 / CB150R"
                  />
                </label>

                <label>
                  Kota Domisili
                  <input
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    maxLength={80}
                    placeholder="Situbondo"
                  />
                </label>
              </div>

              <label>
                Total KM Komunitas
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.totalKm}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      totalKm: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            {/* Seksi 3: Akses Akun Aplikasi */}
            {editing && editingAccount && (
              <div className="member-modal-section">
                <div className="member-modal-section-title">
                  <ShieldCheck size={13} style={{ color: "var(--red)" }} />
                  <span>3. Akses Akun Aplikasi</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.62rem",
                      background: "#f0fdf4",
                      color: "#166534",
                      padding: "2px 7px",
                      borderRadius: 4,
                      fontWeight: 800,
                    }}
                  >
                    Terhubung
                  </span>
                </div>

                <div className="member-modal-grid-2">
                  {account?.role === "superadmin" ? (
                    <label>
                      Role Akun Aplikasi
                      <select
                        value={accountRole}
                        onChange={(e) => setAccountRole(e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label>
                      Role Akun Aplikasi
                      <input value={accountRole.replace("_", " ")} disabled />
                    </label>
                  )}

                  <label>
                    Status Login Akun
                    <select
                      value={accountStatus}
                      onChange={(e) => setAccountStatus(e.target.value as "active" | "inactive")}
                    >
                      <option value="active">Aktif (Dapat Login)</option>
                      <option value="inactive">Nonaktif (Diblokir)</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {editing && !editingAccount && (
              <div className="member-modal-section">
                <div className="member-modal-section-title">
                  <ShieldCheck size={13} style={{ color: "#94a3b8" }} />
                  <span>3. Akses Akun Aplikasi</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#64748b",
                    fontSize: "0.75rem",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Clock size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  <span>
                    Member ini belum mendaftarkan akun login di aplikasi. Akun akan terhubung otomatis saat member mendaftar dengan ID RR ini.
                  </span>
                </div>
              </div>
            )}

            {error && <p className="error-message" style={{ marginTop: 4 }}>{error}</p>}

            <div className="sheet-actions" style={{ marginTop: 12 }}>
              <button className="primary-action" disabled={saving}>
                {saving ? (
                  "MENYIMPAN…"
                ) : (
                  <>
                    <Check />
                    SIMPAN MEMBER
                  </>
                )}
              </button>
              <button
                type="button"
                className="outline-action"
                onClick={closeForm}
              >
                BATAL
              </button>
            </div>
          </form>
        </ModalSheet>
      </div>
    </AppShell>
  );
}
