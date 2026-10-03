"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import {
  resetMemberAccountPassword,
  syncMemberAccountAccess,
  upsertMemberProfile,
} from "./member-admin-actions";
import { fetchMemberAdminSnapshot } from "./member-admin-data";
import {
  MemberAdminDesktopTable,
  MemberAdminMobileCards,
} from "./member-admin-directory";
import {
  emptyForm,
  roles,
  type Detail,
  type Member,
  type MemberAccount,
  type MemberAdminSnapshot,
  type MemberForm,
} from "./member-admin-model";
import {
  deriveMemberAdminView,
  type MemberFilterTab,
} from "./member-admin-view";
import {
  Check,
  CheckCircle2,
  Clock,
  Gauge,
  KeyRound,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

export default function ManageMembersPage() {
  const { confirmAction } = useActionDialog();
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [members, setMembers] = useState<Member[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<MemberFilterTab>("all");

  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MemberAccount | null>(null);
  const [accountRole, setAccountRole] = useState<string>("member");
  const [accountStatus, setAccountStatus] = useState<"active" | "inactive">("active");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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
        fetchMemberAdminSnapshot,
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
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  const {
    detailByMember,
    accountByMember,
    withAccountCount,
    withoutAccountCount,
    results,
  } = useMemo(
    () =>
      deriveMemberAdminView({
        members,
        details,
        accounts,
        query,
        filterTab,
      }),
    [members, details, accounts, query, filterTab],
  );

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setEditingAccount(null);
    setNewPassword("");
    setShowPasswordReset(false);
    setResettingPassword(false);
    setError("");
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditing(false);
    setEditingAccount(null);
    setAccountRole("member");
    setAccountStatus("active");
    setNewPassword("");
    setShowPasswordReset(false);
    setResettingPassword(false);
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
    setNewPassword("");
    setShowPasswordReset(false);
    setResettingPassword(false);
    setFormOpen(true);
    setError("");
  };

  const canResetSelectedPassword =
    Boolean(editingAccount) &&
    (account?.role === "superadmin" ||
      !["admin", "superadmin"].includes(editingAccount?.role ?? ""));

  const resetMemberPassword = async () => {
    if (!editingAccount) return;
    if (newPassword.length < 8) {
      showToast("Password minimal 8 karakter.", "error");
      return;
    }

    const confirmed = await confirmAction({
      title: `Reset password ${form.memberId}?`,
      description:
        "Password lama akan langsung diganti. Member bisa masuk memakai password baru setelah proses ini berhasil.",
      confirmLabel: "RESET PASSWORD",
      cancelLabel: "BATAL",
      destructive: true,
    });
    if (!confirmed) return;

    setResettingPassword(true);
    setError("");

    try {
      await resetMemberAccountPassword(form.memberId, newPassword);
      setNewPassword("");
      setShowPasswordReset(false);
      showToast(`Password ${form.memberId} berhasil direset.`, "success");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Password gagal direset.";
      setError(message);
      showToast(message, "error");
    } finally {
      setResettingPassword(false);
    }
  };

  const saveMember = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const saveError = await upsertMemberProfile(form);
    if (saveError) {
      setError(saveError.message);
      showToast(saveError.message, "error");
      setSaving(false);
      return;
    }

    if (editing && editingAccount) {
      try {
        await syncMemberAccountAccess({
          linkedAccount: editingAccount,
          accountStatus,
          accountRole,
          canManageRole: account?.role === "superadmin",
        });
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

        <MemberAdminDesktopTable
          results={results}
          detailByMember={detailByMember}
          accountByMember={accountByMember}
          onEdit={openEdit}
        />
        <MemberAdminMobileCards
          results={results}
          detailByMember={detailByMember}
          accountByMember={accountByMember}
          onEdit={openEdit}
        />

        <FloatingActionButton label="Member baru" onClick={openNew} />

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

            {editing && editingAccount && (
              <div className="member-modal-section">
                <div className="member-modal-section-title">
                  <ShieldCheck size={13} style={{ color: "var(--red)" }} />
                  <span>3. Akses Akun Aplikasi</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "var(--rr-type-caption)",
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

                <div
                  style={{
                    marginTop: 12,
                    padding: "12px",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 8,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "var(--ink)",
                    }}
                  >
                    <KeyRound size={14} style={{ color: "var(--red)" }} />
                    <span>Reset Password Member</span>
                  </div>

                  {canResetSelectedPassword ? (
                    <>
                      <p
                        style={{
                          margin: "0 0 9px",
                          fontSize: "0.7rem",
                          lineHeight: 1.5,
                          color: "#64748b",
                        }}
                      >
                        Gunakan saat member lupa password. Password lama langsung
                        diganti setelah dikonfirmasi.
                      </p>

                      {showPasswordReset ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 8,
                            alignItems: "end",
                          }}
                        >
                          <label style={{ margin: 0 }}>
                            Password Baru
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              minLength={8}
                              autoComplete="new-password"
                              placeholder="Minimal 8 karakter"
                              disabled={resettingPassword}
                            />
                          </label>
                          <button
                            type="button"
                            className="outline-action"
                            onClick={() => void resetMemberPassword()}
                            disabled={resettingPassword || newPassword.length < 8}
                            style={{ minHeight: 42, whiteSpace: "nowrap" }}
                          >
                            <KeyRound size={13} />
                            {resettingPassword ? "MEMPROSES…" : "RESET"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="outline-action"
                          onClick={() => setShowPasswordReset(true)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <KeyRound size={13} />
                          RESET PASSWORD
                        </button>
                      )}
                    </>
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.7rem",
                        lineHeight: 1.5,
                        color: "#64748b",
                      }}
                    >
                      Hanya Superadmin yang dapat mereset password akun Admin
                      atau Superadmin.
                    </p>
                  )}
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
