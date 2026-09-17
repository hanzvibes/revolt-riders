"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { FloatingActionButton } from "@/components/floating-action-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Check, Pencil, Search, ShieldAlert, UsersRound } from "lucide-react";
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

export default function ManageMembersPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
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
        .order("full_name"),
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
  const results = useMemo(
    () =>
      members.filter((member) =>
        `${member.member_external_id} ${member.full_name} ${member.nickname || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [members, query],
  );

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setError("");
  };
  const openNew = () => {
    setForm(emptyForm);
    setEditing(false);
    setFormOpen(true);
    setError("");
    setMessage("");
  };
  const openEdit = (member: Member) => {
    const detail = detailByMember.get(member.member_external_id);
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
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const saveMember = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const { error: saveError } = await getSupabaseBrowserClient().rpc(
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
    if (saveError) setError(saveError.message);
    else {
      setMessage(
        `Member ${form.memberId.toUpperCase()} berhasil ${editing ? "diperbarui" : "ditambahkan"}.`,
      );
      setFormOpen(false);
      setForm(emptyForm);
      await load();
    }
    setSaving(false);
  };

  const changeStatus = async (
    memberAccount: MemberAccount,
    status: "active" | "inactive",
  ) => {
    if (memberAccount.status === status) return;
    if (
      !window.confirm(
        `${status === "inactive" ? "Nonaktifkan" : "Aktifkan"} akun ${memberAccount.member_external_id}? Histori komunitas tetap disimpan.`,
      )
    )
      return;
    setError("");
    setMessage("");
    const { error: statusError } = await getSupabaseBrowserClient().rpc(
      "set_member_account_status",
      { p_account_id: memberAccount.id, p_status: status },
    );
    if (statusError) setError(statusError.message);
    else {
      setMessage(`Status ${memberAccount.member_external_id} diperbarui.`);
      await load();
    }
  };

  const changeRole = async (memberAccount: MemberAccount, role: string) => {
    if (memberAccount.role === role) return;
    if (
      !window.confirm(
        `Ubah role ${memberAccount.member_external_id} menjadi ${role}?`,
      )
    )
      return;
    setError("");
    setMessage("");
    const { error: roleError } = await getSupabaseBrowserClient().rpc(
      "set_member_account_role",
      { p_account_id: memberAccount.id, p_role: role },
    );
    if (roleError) setError(roleError.message);
    else {
      setMessage(`Role ${memberAccount.member_external_id} diperbarui.`);
      await load();
    }
  };

  if (loading)
    return (
      <AppShell active="Kelola Member" title="Kelola Member">
        <div className="page-wrap">
          <p>Memeriksa izin…</p>
        </div>
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
            <ShieldAlert />
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
        <div className="page-intro native-page-head">
          <div>
            <em>MEMBER DIRECTORY</em>
            <h2>Kelola Member</h2>
            <p>Tambah dan atur data member.</p>
          </div>
        </div>
        {message && (
          <p className="success-message">
            <Check />
            {message}
          </p>
        )}
        {!formOpen && error && <p className="error-message">{error}</p>}
        <section className="member-management card">
          <div className="section-title">
            <span>
              <em>DATA MEMBER</em>
              <h3>{members.length} member terdaftar</h3>
            </span>
            <UsersRound />
          </div>
          <div className="search-box">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau RR-ID"
            />
          </div>
          <div className="member-management-list">
            {results.map((member) => {
              const detail = detailByMember.get(member.member_external_id);
              const memberAccount = accountByMember.get(
                member.member_external_id,
              );
              const displayName =
                detail?.nickname_override ||
                member.nickname ||
                member.full_name;
              return (
                <article key={member.member_external_id}>
                  <i>{displayName.slice(0, 2).toUpperCase()}</i>
                  <span>
                    <b>{displayName}</b>
                    <small>
                      {member.member_external_id} ·{" "}
                      {detail?.motorcycle || member.club_role || "Member"}
                    </small>
                  </span>
                  <em
                    className={
                      memberAccount?.status === "active"
                        ? "member-active"
                        : "member-waiting"
                    }
                  >
                    {memberAccount?.status || "Belum ada akun"}
                  </em>
                  <button
                    className="member-edit-action"
                    onClick={() => openEdit(member)}
                    aria-label={`Edit ${displayName}`}
                  >
                    <Pencil />
                  </button>
                  {memberAccount && (
                    <div className="member-account-controls">
                      {account.role === "superadmin" && (
                        <select
                          value={memberAccount.role}
                          onChange={(event) =>
                            void changeRole(memberAccount, event.target.value)
                          }
                          aria-label={`Role ${member.member_external_id}`}
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      )}
                      <select
                        value={
                          memberAccount.status === "inactive"
                            ? "inactive"
                            : "active"
                        }
                        onChange={(event) =>
                          void changeStatus(
                            memberAccount,
                            event.target.value as "active" | "inactive",
                          )
                        }
                        aria-label={`Status ${member.member_external_id}`}
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        <FloatingActionButton label="Tambah member" onClick={openNew} />
        <ModalSheet
          open={formOpen}
          onClose={closeForm}
          eyebrow={editing ? "EDIT MEMBER" : "MEMBER BARU"}
          title={editing ? form.memberId : "Tambah data member"}
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
              Kota
              <input
                value={form.city}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                maxLength={80}
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
                value={form.clubRole}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clubRole: event.target.value,
                  }))
                }
                maxLength={80}
              />
            </label>
            <label>
              Motor
              <input
                value={form.motorcycle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    motorcycle: event.target.value,
                  }))
                }
                maxLength={120}
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
            {error && <p className="error-message">{error}</p>}
            <div className="sheet-actions">
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
