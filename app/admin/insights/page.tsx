"use client";

import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Activity, BarChart3, Bike, CalendarDays, CircleDollarSign, ShieldAlert, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Account = { user_id: string; member_external_id: string; role: string; status: string };
type MemberProfile = { member_external_id: string; full_name: string; nickname: string | null };
type Event = { id: string; status: string };
type Invitation = { event_id: string; member_external_id: string };
type Rsvp = { event_id: string; member_external_id: string; status: string };
type Attendance = { event_id: string; member_external_id: string };
type Ride = { status: string; distance_km: number | string | null };
type Cash = { transaction_type: "income" | "expense" | "advance"; amount: number | string };
type Audit = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

export default function AdminInsightsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [cash, setCash] = useState<Cash[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const allowed = account?.status === "active" && ["admin", "superadmin"].includes(account.role);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const accountResult = user ? await supabase.from("member_accounts").select("user_id,member_external_id,role,status").eq("user_id", user.id).maybeSingle() : { data: null, error: null };
      if (!active) return;
      const current = accountResult.data as Account | null;
      setAccount(current);
      if (!current || current.status !== "active" || !["admin", "superadmin"].includes(current.role)) { setLoading(false); return; }

      const results = await Promise.all([
        supabase.from("member_accounts").select("user_id,member_external_id,role,status"),
        supabase.from("member_profiles").select("member_external_id,full_name,nickname"),
        supabase.from("events").select("id,status"),
        supabase.from("event_invitations").select("event_id,member_external_id"),
        supabase.from("event_rsvps").select("event_id,member_external_id,status"),
        supabase.from("event_attendance").select("event_id,member_external_id"),
        supabase.from("ride_logs").select("status,distance_km"),
        supabase.from("cash_transactions").select("transaction_type,amount"),
        supabase.from("club_cash_transactions").select("transaction_type,amount"),
        supabase.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(100),
      ]);
      if (!active) return;
      const failed = results.find((result) => result.error)?.error;
      if (failed) setError(failed.message);
      setAccounts((results[0].data ?? []) as Account[]);
      setProfiles((results[1].data ?? []) as MemberProfile[]);
      setEvents((results[2].data ?? []) as Event[]);
      setInvitations((results[3].data ?? []) as Invitation[]);
      setRsvps((results[4].data ?? []) as Rsvp[]);
      setAttendance((results[5].data ?? []) as Attendance[]);
      setRides((results[6].data ?? []) as Ride[]);
      setCash([...(results[7].data ?? []), ...(results[8].data ?? [])] as Cash[]);
      setAudits((results[9].data ?? []) as Audit[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const analytics = useMemo(() => {
    const responses = new Set(rsvps.map((row) => `${row.event_id}:${row.member_external_id}`)).size;
    const attending = new Set(rsvps.filter((row) => row.status === "attending").map((row) => `${row.event_id}:${row.member_external_id}`)).size;
    const checkedIn = new Set(attendance.map((row) => `${row.event_id}:${row.member_external_id}`)).size;
    const totalKm = rides.filter((row) => row.status === "approved").reduce((total, row) => total + Number(row.distance_km ?? 0), 0);
    const income = cash.filter((row) => row.transaction_type === "income").reduce((total, row) => total + Number(row.amount), 0);
    const expense = cash.filter((row) => row.transaction_type === "expense").reduce((total, row) => total + Number(row.amount), 0);
    return { activeMembers: accounts.filter((row) => row.status === "active").length, publishedEvents: events.filter((row) => row.status === "published").length, responseRate: invitations.length ? Math.round((responses / invitations.length) * 100) : 0, attendanceRate: attending ? Math.round((checkedIn / attending) * 100) : 0, totalKm, balance: income - expense };
  }, [accounts, attendance, cash, events, invitations, rides, rsvps]);

  const profileByMemberId = useMemo(() => new Map(profiles.map((p) => [p.member_external_id, p])), [profiles]);
  const accountByUserId = useMemo(() => new Map(accounts.map((a) => [a.user_id, a.member_external_id])), [accounts]);

  const getActorDisplay = (actorId: string | null) => {
    if (!actorId) return "Sistem / Undangan Publik";
    const extId = accountByUserId.get(actorId);
    if (!extId) return "Akun Pengurus";
    const prof = profileByMemberId.get(extId);
    const name = prof?.nickname || prof?.full_name;
    return name ? `${name} (${extId})` : extId;
  };

  if (loading) {
    return (
      <AppShell active="Analytics" title="Analytics">
        <PageSkeleton title="Memuat Analytics & Audit Trail..." />
      </AppShell>
    );
  }
  if (!allowed) {
    return (
      <AppShell active="Analytics" title="Analytics">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akses admin diperlukan</h2>
            <p>Analytics dan audit trail hanya tersedia untuk Admin dan Superadmin aktif.</p>
            <a className="primary-action" href={account ? "/profil" : "/login"}>
              {account ? "LIHAT STATUS AKUN" : "MASUK"}
            </a>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Analytics" title="Analytics">
      <div className="page-wrap">
        <div className="page-intro">
          <div>
            <em>PRODUCTION INSIGHTS</em>
            <h2>Analytics & Audit Trail</h2>
            <p>Ringkasan aktivitas komunitas dan perubahan penting yang tercatat otomatis.</p>
          </div>
        </div>
        {error && <p className="error-message">{error}</p>}
        <section className="analytics-grid">
          <article className="card">
            <UsersRound />
            <small>MEMBER AKTIF</small>
            <b>{analytics.activeMembers}</b>
          </article>
          <article className="card">
            <CalendarDays />
            <small>AGENDA PUBLISHED</small>
            <b>{analytics.publishedEvents}</b>
          </article>
          <article className="card">
            <BarChart3 />
            <small>RSVP RESPONSE RATE</small>
            <b>{analytics.responseRate}%</b>
          </article>
          <article className="card">
            <Activity />
            <small>ATTENDANCE RATE</small>
            <b>{analytics.attendanceRate}%</b>
          </article>
          <article className="card">
            <Bike />
            <small>KM DISETUJUI</small>
            <b>{number(analytics.totalKm)} KM</b>
          </article>
          <article className="card">
            <CircleDollarSign />
            <small>SALDO TERHITUNG</small>
            <b>{money(analytics.balance)}</b>
          </article>
        </section>

        <section className="card audit-panel" style={{ marginTop: "20px" }}>
          <div className="section-title">
            <span>
              <em>AUDIT TRAIL</em>
              <h3>100 aktivitas terbaru</h3>
            </span>
            <Activity />
          </div>
          {audits.length === 0 ? (
            <p className="system-message">Belum ada aktivitas setelah audit trail diaktifkan.</p>
          ) : (
            <div
              className="audit-list"
              style={{
                maxHeight: "440px",
                overflowY: "auto",
                paddingRight: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {audits.map((audit) => {
                const actorLabel = getActorDisplay(audit.actor_id);
                return (
                  <article
                    key={audit.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderTop: "1px solid var(--line)",
                      gap: "12px",
                      fontSize: "0.78rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <i
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: "#f1f2f3",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          fontSize: "0.7rem",
                          color: "var(--red)",
                          flexShrink: 0,
                          fontStyle: "normal",
                        }}
                      >
                        {audit.action.slice(0, 1).toUpperCase()}
                      </i>
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <b style={{ fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {audit.action.toUpperCase()} · {audit.entity_type.replaceAll("_", " ")}
                        </b>
                        <small style={{ color: "var(--muted)", fontSize: "0.65rem", marginTop: "1px" }}>
                          Oleh: <strong style={{ color: "var(--ink)", fontWeight: 700 }}>{actorLabel}</strong>
                          {audit.entity_id ? ` · Ref: ${audit.entity_id.slice(0, 8)}` : ""}
                        </small>
                      </span>
                    </div>
                    <time
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(audit.created_at))}{" "}
                      WIB
                    </time>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

