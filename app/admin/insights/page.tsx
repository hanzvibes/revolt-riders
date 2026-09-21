"use client";

import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Activity, BarChart3, Bike, CalendarDays, CircleDollarSign, ShieldAlert, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Account = { user_id: string; member_external_id: string; status: string };
type MemberProfile = { member_external_id: string; full_name: string; nickname: string | null };
type Rsvp = { event_id: string; member_external_id: string; status: string };
type Attendance = { event_id: string; member_external_id: string };
type Ride = { distance_km: number | string | null };
type Cash = { transaction_type: "income" | "expense" | "advance"; amount: number | string };
type Audit = { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string };
type InsightsSnapshot = {
  accounts: Account[];
  profiles: MemberProfile[];
  publishedEvents: number;
  invitationCount: number;
  rsvps: Rsvp[];
  attendance: Attendance[];
  rides: Ride[];
  cash: Cash[];
  audits: Audit[];
};

const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

export default function AdminInsightsPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [publishedEvents, setPublishedEvents] = useState(0);
  const [invitationCount, setInvitationCount] = useState(0);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [cash, setCash] = useState<Cash[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const allowed = account?.status === "active" && ["admin", "superadmin"].includes(account.role);

  const load = useCallback(async (forceRefresh = false) => {
    if (accessLoading) return;
    if (!account || account.status !== "active" || !["admin", "superadmin"].includes(account.role)) {
      setLoading(false);
      return;
    }

    if (!forceRefresh) setLoading(true);
    setError("");

    try {
      const snapshot = await fetchWithCache<InsightsSnapshot>(
        "admin:insights",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const results = await Promise.all([
            supabase.from("member_accounts").select("user_id,member_external_id,status"),
            supabase.from("member_profiles").select("member_external_id,full_name,nickname"),
            supabase
              .from("events")
              .select("*", { count: "exact", head: true })
              .eq("status", "published"),
            supabase
              .from("event_invitations")
              .select("*", { count: "exact", head: true }),
            supabase.from("event_rsvps").select("event_id,member_external_id,status"),
            supabase.from("event_attendance").select("event_id,member_external_id"),
            supabase
              .from("ride_logs")
              .select("distance_km")
              .eq("status", "approved"),
            supabase.from("cash_transactions").select("transaction_type,amount"),
            supabase.from("club_cash_transactions").select("transaction_type,amount"),
            supabase
              .from("audit_logs")
              .select("id,actor_id,action,entity_type,entity_id,created_at")
              .order("created_at", { ascending: false })
              .limit(100),
          ]);

          const failed = results.find((result) => result.error)?.error;
          if (failed) throw failed;

          return {
            accounts: (results[0].data ?? []) as Account[],
            profiles: (results[1].data ?? []) as MemberProfile[],
            publishedEvents: results[2].count ?? 0,
            invitationCount: results[3].count ?? 0,
            rsvps: (results[4].data ?? []) as Rsvp[],
            attendance: (results[5].data ?? []) as Attendance[],
            rides: (results[6].data ?? []) as Ride[],
            cash: [...(results[7].data ?? []), ...(results[8].data ?? [])] as Cash[],
            audits: (results[9].data ?? []) as Audit[],
          };
        },
        { ttlMs: 30_000, forceRefresh },
      );

      setAccounts(snapshot.accounts);
      setProfiles(snapshot.profiles);
      setPublishedEvents(snapshot.publishedEvents);
      setInvitationCount(snapshot.invitationCount);
      setRsvps(snapshot.rsvps);
      setAttendance(snapshot.attendance);
      setRides(snapshot.rides);
      setCash(snapshot.cash);
      setAudits(snapshot.audits);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Analytics belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessLoading, account, fetchWithCache]);

  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  const analytics = useMemo(() => {
    const responses = new Set(rsvps.map((row) => `${row.event_id}:${row.member_external_id}`)).size;
    const attending = new Set(rsvps.filter((row) => row.status === "attending").map((row) => `${row.event_id}:${row.member_external_id}`)).size;
    const checkedIn = new Set(attendance.map((row) => `${row.event_id}:${row.member_external_id}`)).size;
    const totalKm = rides.reduce(
      (total, row) => total + Number(row.distance_km ?? 0),
      0,
    );
    const income = cash.filter((row) => row.transaction_type === "income").reduce((total, row) => total + Number(row.amount), 0);
    const expense = cash.filter((row) => row.transaction_type === "expense").reduce((total, row) => total + Number(row.amount), 0);
    return {
      activeMembers: accounts.filter((row) => row.status === "active").length,
      publishedEvents,
      responseRate: invitationCount
        ? Math.round((responses / invitationCount) * 100)
        : 0,
      attendanceRate: attending ? Math.round((checkedIn / attending) * 100) : 0,
      totalKm,
      balance: income - expense,
    };
  }, [
    accounts,
    attendance,
    cash,
    invitationCount,
    publishedEvents,
    rides,
    rsvps,
  ]);

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
      <AppShell active="Analytics" title="Analitik & Audit">
        <PageSkeleton title="Memuat Analytics & Audit Trail..." />
      </AppShell>
    );
  }
  if (!allowed) {
    return (
      <AppShell active="Analytics" title="Analitik & Audit">
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
    <AppShell active="Analytics" title="Analitik & Audit">
      <div className="page-wrap">
        <div className="page-intro">
          <div>
            <em>Ringkasan sistem</em>
            <h2>Analitik & audit trail</h2>
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

        <section className="card audit-panel admin-audit-panel">
          <div className="section-title">
            <span>
              <em>Audit trail</em>
              <h3>100 aktivitas terbaru</h3>
            </span>
            <Activity />
          </div>
          {audits.length === 0 ? (
            <p className="system-message">Belum ada aktivitas setelah audit trail diaktifkan.</p>
          ) : (
            <div className="audit-list admin-audit-list">
              {audits.map((audit) => {
                const actorLabel = getActorDisplay(audit.actor_id);
                return (
                  <article key={audit.id}>
                    <div className="admin-audit-main">
                      <i className="admin-audit-mark">
                        {audit.action.slice(0, 1).toUpperCase()}
                      </i>
                      <span className="admin-audit-copy">
                        <b className="admin-audit-title">
                          {audit.action.toUpperCase()} · {audit.entity_type.replaceAll("_", " ")}
                        </b>
                        <small className="admin-audit-meta">
                          Oleh: <strong>{actorLabel}</strong>
                          {audit.entity_id ? ` · Ref: ${audit.entity_id.slice(0, 8)}` : ""}
                        </small>
                      </span>
                    </div>
                    <time className="admin-audit-time">
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

