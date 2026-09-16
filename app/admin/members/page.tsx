"use client";

import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Search, ShieldAlert, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Account = { role: string };
type Member = { member_external_id: string; full_name: string; nickname: string | null; city: string | null; club_role: string | null };
type Detail = { member_external_id: string; nickname_override: string | null; motorcycle: string | null; city_override: string | null };
type MemberAccount = { id: string; member_external_id: string; role: string; status: "active" | "inactive" | "pending" };

export default function ManageMembersPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [details, setDetails] = useState<Detail[]>([]);
  const [accounts, setAccounts] = useState<MemberAccount[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const accountResult = user ? await supabase.from("member_accounts").select("role").eq("user_id", user.id).maybeSingle() : { data: null };
    setAccount(accountResult.data as Account | null);
    if (!accountResult.data || !["admin", "superadmin"].includes(accountResult.data.role)) { setLoading(false); return; }
    const [memberResult, detailResult, accountListResult] = await Promise.all([
      supabase.from("member_profiles").select("member_external_id,full_name,nickname,city,club_role").order("full_name"),
      supabase.from("member_details").select("member_external_id,nickname_override,motorcycle,city_override"),
      supabase.from("member_accounts").select("id,member_external_id,role,status").order("member_external_id"),
    ]);
    if (memberResult.error || detailResult.error || accountListResult.error) setError(memberResult.error?.message || detailResult.error?.message || accountListResult.error?.message || "Data member belum dapat dimuat.");
    setMembers((memberResult.data ?? []) as Member[]); setDetails((detailResult.data ?? []) as Detail[]); setAccounts((accountListResult.data ?? []) as MemberAccount[]); setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const detailByMember = useMemo(() => new Map(details.map((detail) => [detail.member_external_id, detail])), [details]);
  const accountByMember = useMemo(() => new Map(accounts.map((memberAccount) => [memberAccount.member_external_id, memberAccount])), [accounts]);
  const results = useMemo(() => members.filter((member) => `${member.member_external_id} ${member.full_name} ${member.nickname || ""}`.toLowerCase().includes(query.toLowerCase())), [members, query]);

  const changeStatus = async (memberAccount: MemberAccount, status: "active" | "inactive") => {
    if (memberAccount.status === status) return;
    if (!window.confirm(`${status === "inactive" ? "Nonaktifkan" : "Aktifkan"} akun ${memberAccount.member_external_id}? Histori komunitas tetap disimpan.`)) return;
    setError(""); setMessage("");
    const { error: statusError } = await getSupabaseBrowserClient().rpc("set_member_account_status", { p_account_id: memberAccount.id, p_status: status });
    if (statusError) setError(statusError.message); else { setMessage(`Status ${memberAccount.member_external_id} diperbarui.`); await load(); }
  };

  if (loading) return <AppShell active="Kelola Member" title="Kelola Member"><div className="page-wrap"><p>Memeriksa izin…</p></div></AppShell>;
  if (!account || !["admin", "superadmin"].includes(account.role)) return <AppShell active="Kelola Member" title="Kelola Member"><div className="page-wrap"><section className="empty-state card"><ShieldAlert/><h2>Akses admin diperlukan</h2><p>Halaman ini hanya tersedia untuk Admin dan Superadmin.</p><a className="primary-action" href="/login">MASUK</a></section></div></AppShell>;

  return <AppShell active="Kelola Member" title="Kelola Member"><div className="page-wrap"><div className="page-intro"><div><em>MEMBER DIRECTORY</em><h2>Kelola Member</h2><p>Nonaktifkan akun tanpa menghapus riwayat riding, RSVP, atau kehadiran.</p></div></div><section className="member-management card"><div className="section-title"><span><em>DATA MEMBER</em><h3>{members.length} member terdaftar</h3></span><UsersRound/></div><div className="search-box"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau RR-ID"/></div>{message && <p className="success-message">{message}</p>}{error && <p className="error-message">{error}</p>}<div className="member-management-list">{results.map((member) => { const detail = detailByMember.get(member.member_external_id); const memberAccount = accountByMember.get(member.member_external_id); const displayName = detail?.nickname_override || member.nickname || member.full_name; return <article key={member.member_external_id}><i>{displayName.slice(0, 2).toUpperCase()}</i><span><b>{displayName}</b><small>{member.member_external_id} · {detail?.motorcycle || member.club_role || "Member"}</small></span><em className={memberAccount?.status === "active" ? "member-active" : "member-waiting"}>{memberAccount?.status || "belum punya akun"}</em>{memberAccount ? <select value={memberAccount.status === "inactive" ? "inactive" : "active"} onChange={(event) => void changeStatus(memberAccount, event.target.value as "active" | "inactive")} aria-label={`Status ${member.member_external_id}`}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select> : <UserRound/>}</article>; })}</div></section></div></AppShell>;
}
