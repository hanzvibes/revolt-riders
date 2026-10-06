"use client";

import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import {
  Activity,
  BarChart3,
  Bike,
  CalendarDays,
  CircleDollarSign,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminInsightsSnapshot } from "./insights-data";
import {
  calculateInsights,
  type InsightsSnapshot,
} from "./insights-model";

const EMPTY_SNAPSHOT: InsightsSnapshot = {
  accounts: [],
  profiles: [],
  publishedEvents: 0,
  invitations: [],
  rsvps: [],
  attendance: [],
  rides: [],
  cash: [],
  audits: [],
};

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const number = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

export default function AdminInsightsPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();
  const [snapshot, setSnapshot] = useState<InsightsSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const allowed =
    account?.status === "active" &&
    ["admin", "superadmin"].includes(account.role);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (accessLoading) return;
      if (
        !account ||
        account.status !== "active" ||
        !["admin", "superadmin"].includes(account.role)
      ) {
        setLoading(false);
        return;
      }

      if (!forceRefresh) setLoading(true);
      setError("");

      try {
        const nextSnapshot = await fetchWithCache<InsightsSnapshot>(
          "admin:insights",
          fetchAdminInsightsSnapshot,
          { ttlMs: 30_000, forceRefresh },
        );
        setSnapshot(nextSnapshot);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Analytics belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [accessLoading, account, fetchWithCache],
  );

  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  const analytics = useMemo(() => calculateInsights(snapshot), [snapshot]);
  const profileByMemberId = useMemo(
    () =>
      new Map(
        snapshot.profiles.map((profile) => [profile.member_external_id, profile]),
      ),
    [snapshot.profiles],
  );
  const accountByUserId = useMemo(
    () =>
      new Map(
        snapshot.accounts.map((memberAccount) => [
          memberAccount.user_id,
          memberAccount.member_external_id,
        ]),
      ),
    [snapshot.accounts],
  );

  const getActorDisplay = (actorId: string | null) => {
    if (!actorId) return "Sistem / Undangan Publik";
    const externalId = accountByUserId.get(actorId);
    if (!externalId) return "Akun Pengurus";
    const profile = profileByMemberId.get(externalId);
    const name = profile?.nickname || profile?.full_name;
    return name ? `${name} (${externalId})` : externalId;
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
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akses admin diperlukan"
            description="Analytics dan audit trail hanya tersedia untuk Admin dan Superadmin aktif."
            action={
              <a className="primary-action" href={account ? "/profil" : "/login"}>
                {account ? "LIHAT STATUS AKUN" : "MASUK"}
              </a>
            }
          />
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
            <p>
              Ringkasan aktivitas komunitas dan perubahan penting yang tercatat
              otomatis.
            </p>
          </div>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

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

          {snapshot.audits.length === 0 ? (
            <p className="system-message">
              Belum ada aktivitas setelah audit trail diaktifkan.
            </p>
          ) : (
            <div className="audit-list admin-audit-list">
              {snapshot.audits.map((audit) => {
                const actorLabel = getActorDisplay(audit.actor_id);
                return (
                  <article key={audit.id}>
                    <div className="admin-audit-main">
                      <i className="admin-audit-mark">
                        {audit.action.slice(0, 1).toUpperCase()}
                      </i>
                      <span className="admin-audit-copy">
                        <b className="admin-audit-title">
                          {audit.action.toUpperCase()} ·{" "}
                          {audit.entity_type.replaceAll("_", " ")}
                        </b>
                        <small className="admin-audit-meta">
                          Oleh: <strong>{actorLabel}</strong>
                          {audit.entity_id
                            ? ` · Ref: ${audit.entity_id.slice(0, 8)}`
                            : ""}
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
