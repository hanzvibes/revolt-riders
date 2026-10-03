"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
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
import { MemberAdminForm } from "./member-admin-form";
import {
  emptyForm,
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
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldAlert,
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

        <MemberAdminForm
          open={formOpen}
          onClose={closeForm}
          editing={editing}
          form={form}
          setForm={setForm}
          editingAccount={editingAccount}
          accountRole={accountRole}
          setAccountRole={setAccountRole}
          accountStatus={accountStatus}
          setAccountStatus={setAccountStatus}
          canManageRole={account?.role === "superadmin"}
          canResetSelectedPassword={canResetSelectedPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          showPasswordReset={showPasswordReset}
          setShowPasswordReset={setShowPasswordReset}
          resettingPassword={resettingPassword}
          onResetPassword={resetMemberPassword}
          error={error}
          saving={saving}
          onSubmit={saveMember}
        />
      </div>
    </AppShell>
  );
}
