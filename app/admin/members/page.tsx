"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  Check,
  Clock,
  Gauge,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Account = { role: string; status: "pending" | "active" | "inactive" };
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
  const { invalidateCache } = useDataCache();
  const [account, setAccount] = useState<Account | null>(null);
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const accountResult = user
      ? await supabase
          .from("member_accounts")
          .select("role,status")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
    setAccount(accountResult.data as Account | null);
    if (
      !accountResult.data ||
      accountResult.data.status !== "active" ||
      !["admin", "superadmin"].includes(accountResult.data.role)
    ) {
      setLoading(false);
      return;
    }
    const [memberResult, detailResult, accountListResult] = await Promise.all([
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
    if (memberResult.error || detailResult.error || accountListResult.error)
      setError(
        memberResult.error?.message ||
          detailResult.error?.message ||
          accountListResult.error?.message ||
          "Data member belum dapat dimuat.",
      );
    setMembers(
      ((memberResult.data ?? []) as Member[]).map((member) => ({
        ...member,
        total_km: Number(member.total_km),
      })),
    );
    setDetails((detailResult.data ?? []) as Detail[]);
    setAccounts((accountListResult.data ?? []) as MemberAccount[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

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
    setMessage("");
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
    setMessage("");
  };

  const saveMember = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

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

    setMessage(
      `Data ${form.memberId.toUpperCase()} berhasil ${editing ? "diperbarui" : "ditambahkan"}.`,
    );
    setFormOpen(false);
    setForm(emptyForm);
    setEditingAccount(null);
    invalidateCache("member_profiles_list");
    invalidateCache("admin_dashboard_overview");
    invalidateCache("dashboard_club_stats");
    invalidateCache("riding_leaderboard_data");
    await load();
    setSaving(false);
  };

  if (loading)
    return (
      <AppShell active="Kelola Member" title="Kelola Member">
        <PageSkeleton title="Memuat Direktori Member..." />
      </AppShell>
    );

  if (
    !account ||
    account.status !== "active" ||
    !["admin", "superadmin"].includes(account.role)
  )
    return (
      <AppShell active="Kelola Member" title="Kelola Member">
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
    <AppShell active="Kelola Member" title="Kelola Member">
      <div className="page-wrap">
        {/* Header section */}
        <div className="page-intro native-page-head">
          <div>
            <em>MEMBER DIRECTORY</em>
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
              void load();
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw className={loading ? "spin" : ""} style={{ width: 14, height: 14 }} />
            <span>SEGARKA N</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="agenda-tabs" role="tablist" style={{ marginBottom: 16 }}>
          <button
            role="tab"
            aria-selected={filterTab === "all"}
            className={filterTab === "all" ? "active" : ""}
            onClick={() => setFilterTab("all")}
          >
            <UsersRound size={15} />
            Semua <b>{members.length}</b>
          </button>
          <button
            role="tab"
            aria-selected={filterTab === "with_account"}
            className={filterTab === "with_account" ? "active" : ""}
            onClick={() => setFilterTab("with_account")}
          >
            <UserCheck size={15} />
            Punya Akun <b>{withAccountCount}</b>
          </button>
          <button
            role="tab"
            aria-selected={filterTab === "without_account"}
            className={filterTab === "without_account" ? "active" : ""}
            onClick={() => setFilterTab("without_account")}
          >
            <Clock size={15} />
            Belum Ada Akun <b>{withoutAccountCount}</b>
          </button>
        </div>

        {/* Notifications */}
        {message && (
          <p className="system-message" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <Check size={16} />
            {message}
          </p>
        )}
        {error && <p className="error-message" style={{ marginBottom: 16 }}>{error}</p>}

        {/* Search Bar */}
        <div className="search-box" style={{ maxWidth: "100%", marginBottom: 18 }}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari berdasarkan ID RR, nama panggilan, motor, atau domisili kota…"
          />
        </div>

        {/* Clean, Modern Member Cards List */}
        <div className="member-management-list" style={{ display: "grid", gap: "12px", paddingBottom: "96px" }}>
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

              return (
                <article
                  key={member.member_external_id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px 18px",
                    gap: "10px",
                    borderRadius: "14px",
                    background: "#fff",
                    border: "1px solid var(--line)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                    transition: "border-color 0.18s ease",
                  }}
                >
                  {/* Level 1: Header (Avatar, ID RR, Nickname, Club Role, Edit Button) */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <i
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "#171819",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          fontSize: "0.82rem",
                          flexShrink: 0,
                          fontStyle: "normal",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {displayName.slice(0, 2).toUpperCase()}
                      </i>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            background: "rgba(229, 29, 42, 0.08)",
                            color: "var(--red)",
                            border: "1px solid rgba(229, 29, 42, 0.22)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "0.72rem",
                            fontWeight: 900,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {member.member_external_id}
                        </span>
                        <b style={{ fontSize: "0.95rem", color: "var(--ink)", fontWeight: 800 }}>{displayName}</b>
                        {member.club_role && (
                          <span className={`member-role-badge ${getRoleClass(member.club_role)}`}>
                            {member.club_role}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="member-edit-action"
                      onClick={() => openEdit(member)}
                      aria-label={`Edit ${displayName}`}
                      title={`Edit data ${displayName}`}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        border: "1px solid var(--line)",
                        background: "#f8fafc",
                        display: "grid",
                        placeItems: "center",
                        color: "#475569",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </div>

                  {/* Level 2: Sub-info (Full name, Vehicle, City) */}
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#64748b",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px 12px",
                      paddingLeft: "48px",
                    }}
                  >
                    {member.full_name && member.full_name !== displayName && (
                      <span style={{ color: "#334155", fontWeight: 650 }}>{member.full_name}</span>
                    )}
                    {detail?.motorcycle && (
                      <span>
                        <Bike size={13} style={{ verticalAlign: "-2px", marginRight: "3px", color: "var(--red)" }} />
                        {detail.motorcycle}
                      </span>
                    )}
                    {member.city && (
                      <span>
                        <MapPin size={13} style={{ verticalAlign: "-2px", marginRight: "3px", color: "var(--muted)" }} />
                        {member.city}
                      </span>
                    )}
                  </div>

                  {/* Level 3: Footer Pills (Total KM, App Account Status) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                      paddingLeft: "48px",
                      paddingTop: "8px",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    {/* KM Badge */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#f8fafc",
                        padding: "3px 10px",
                        borderRadius: "7px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <Gauge size={13} style={{ color: "var(--red)" }} />
                      <b style={{ fontSize: "0.74rem", color: "var(--ink)", fontWeight: 800 }}>
                        {new Intl.NumberFormat("id-ID").format(member.total_km)} KM
                      </b>
                    </div>

                    {/* Account Status Badge */}
                    <div>
                      {memberAccount ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 9px",
                            borderRadius: "7px",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            background: memberAccount.status === "active" ? "#f0fdf4" : "#fef2f2",
                            color: memberAccount.status === "active" ? "#15803d" : "#b91c1c",
                            border: memberAccount.status === "active" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: memberAccount.status === "active" ? "#16a34a" : "#dc2626",
                            }}
                          />
                          Akun: {memberAccount.role.replace("_", " ")} ({memberAccount.status === "active" ? "Aktif" : "Nonaktif"})
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 9px",
                            borderRadius: "7px",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            background: "#f8fafc",
                            color: "#94a3b8",
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          Belum Ada Akun
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Floating Action Button for adding new member */}
        <FloatingActionButton label="Member baru" onClick={openNew} />

        {/* Modal Sheet for Add & Edit Member */}
        <ModalSheet
          open={formOpen}
          onClose={closeForm}
          eyebrow={editing ? "EDIT MEMBER" : "MEMBER BARU"}
          title={editing ? `${form.memberId} · ${form.fullName || "Member"}` : "Tambah data member baru"}
        >
          <form className="sheet-form member-sheet-form" onSubmit={saveMember}>
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
              Nama lengkap
              <input
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                maxLength={120}
                required
              />
            </label>

            <label>
              Nickname
              <input
                value={form.nickname}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nickname: event.target.value,
                  }))
                }
                maxLength={80}
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

            <label>
              Tanggal bergabung
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

            <label>
              Jabatan club
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
                placeholder="PRESIDENT, FOUNDER, EXCECUTOR, dll."
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
                placeholder="Contoh: Yamaha Vixion / Honda CB"
              />
            </label>

            <label>
              Total KM
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

            {/* Account Settings Section inside Modal */}
            {editing && editingAccount && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1.5px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <ShieldCheck size={16} style={{ color: "var(--red)" }} />
                  <strong style={{ fontSize: "0.82rem", color: "#0f172a" }}>Akses Akun Aplikasi</strong>
                  <span
                    style={{
                      fontSize: "0.66rem",
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {account.role === "superadmin" ? (
                    <label>
                      Role Akun
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
                      Role Akun
                      <input value={accountRole.replace("_", " ")} disabled />
                    </label>
                  )}

                  <label>
                    Status Akun
                    <select
                      value={accountStatus}
                      onChange={(e) => setAccountStatus(e.target.value as "active" | "inactive")}
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {editing && !editingAccount && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: "0.76rem" }}>
                  <UsersRound size={15} style={{ color: "#94a3b8" }} />
                  <span>Member ini belum memiliki akun login di aplikasi.</span>
                </div>
              </div>
            )}

            {error && <p className="error-message" style={{ marginTop: 12 }}>{error}</p>}

            <div className="sheet-actions" style={{ marginTop: 18 }}>
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
