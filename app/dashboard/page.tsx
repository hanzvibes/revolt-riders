"use client";

import { AppShell } from "@/components/app-shell";
import { CommunityFeed } from "@/components/community-feed";
import { CountUpNumber } from "@/components/count-up-number";
import { useDataCache } from "@/context/data-cache-context";
import { getRiderProgress } from "@/lib/rider-progression";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Gauge,
  ScanLine,
  Trophy,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardStats = {
  total_members: number;
  total_km: number;
  cash_balance: number;
  last_updated: string | null;
};

type LoggedInMember = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  club_role: string | null;
  total_km: number;
  touring_count: number;
  ride_dates: string[];
};

export default function DashboardPage() {
  const { user, account, loading: authLoading, fetchWithCache } = useDataCache();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentMember, setCurrentMember] = useState<LoggedInMember | null>(null);
  const [profileCount, setProfileCount] = useState(0);
  const [profileTotalKm, setProfileTotalKm] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadSocialHome() {
      const supabase = getSupabaseBrowserClient();

      const clubStatsPromise: Promise<DashboardStats | null> = user
        ? fetchWithCache<DashboardStats | null>(
            "dashboard_club_stats",
            async () => {
              const { data, error } = await supabase.rpc("get_member_dashboard_stats");
              if (error) throw error;
              return (data?.[0] ?? null) as DashboardStats | null;
            },
            { ttlMs: 2 * 60 * 1000 },
          ).catch(() => null)
        : Promise.resolve(null);

      const profileStatsPromise = fetchWithCache<{ count: number; totalKm: number }>(
        "dashboard_member_profiles_stats",
        async () => {
          const { data, count, error } = await supabase
            .from("member_profiles")
            .select("total_km", { count: "exact" });

          if (error) return { count: 0, totalKm: 0 };

          const totalKm = ((data ?? []) as { total_km: number | string | null }[]).reduce(
            (sum, item) => sum + (Number(item.total_km) || 0),
            0,
          );

          return { count: count || 0, totalKm };
        },
        { ttlMs: 3 * 60 * 1000 },
      ).catch(() => ({ count: 0, totalKm: 0 }));

      const memberPromise: Promise<LoggedInMember | null | undefined> =
        user && account?.member_external_id
          ? fetchWithCache<LoggedInMember | null>(
              `dashboard_member_profile_${account.member_external_id}`,
              async () => {
                const [profileResult, detailsResult, rideResult] = await Promise.all([
                  supabase
                    .from("member_profiles")
                    .select("member_external_id,full_name,nickname,club_role,total_km")
                    .eq("member_external_id", account.member_external_id)
                    .maybeSingle(),
                  supabase
                    .from("member_details")
                    .select("nickname_override")
                    .eq("member_external_id", account.member_external_id)
                    .maybeSingle(),
                  supabase
                    .from("ride_logs")
                    .select("created_at", { count: "exact" })
                    .eq("member_external_id", account.member_external_id)
                    .eq("status", "approved")
                    .order("created_at", { ascending: false })
                    .limit(60),
                ]);

                if (!profileResult.data) return null;

                return {
                  member_external_id: profileResult.data.member_external_id,
                  full_name: profileResult.data.full_name,
                  nickname:
                    detailsResult.data?.nickname_override ||
                    profileResult.data.nickname ||
                    null,
                  club_role: profileResult.data.club_role || null,
                  total_km: Number(profileResult.data.total_km) || 0,
                  touring_count: rideResult.count || 0,
                  ride_dates: ((rideResult.data ?? []) as { created_at: string }[]).map(
                    (ride) => ride.created_at,
                  ),
                };
              },
              { ttlMs: 2 * 60 * 1000 },
            ).catch(() => undefined)
          : Promise.resolve(undefined);

      const [clubStats, profileStats, member] = await Promise.all([
        clubStatsPromise,
        profileStatsPromise,
        memberPromise,
      ]);

      if (!active) return;
      setStats(clubStats);
      setProfileCount(profileStats.count);
      setProfileTotalKm(profileStats.totalKm);
      if (member !== undefined) {
        setCurrentMember(member);
      } else if (!user || !account?.member_external_id) {
        setCurrentMember(null);
      }
    }

    void loadSocialHome();

    return () => {
      active = false;
    };
  }, [user, account, fetchWithCache]);

  const userInitials = useMemo(() => {
    if (currentMember) {
      const parts = (currentMember.nickname || currentMember.full_name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0]?.slice(0, 2).toUpperCase() || "RR";
    }

    return user?.email?.slice(0, 2).toUpperCase() || "RR";
  }, [currentMember, user]);

  const memberName =
    currentMember?.nickname ||
    currentMember?.full_name ||
    account?.member_external_id ||
    (user ? "Rider Revolt" : "Guest Rider");

  const memberId = account?.member_external_id || "MEMBER";
  const memberRole = currentMember?.club_role || account?.role || "Member";
  const hasActiveMember = Boolean(
    user && !authLoading && account?.status === "active" && currentMember,
  );

  const riderProgress = getRiderProgress({
    totalKm: currentMember?.total_km ?? 0,
    approvedRideCount: currentMember?.touring_count ?? 0,
    approvedRideDates: currentMember?.ride_dates ?? [],
    activeMember: hasActiveMember,
  });

  const totalRiders = stats?.total_members || profileCount;
  const totalKm = stats?.total_km ? Number(stats.total_km) : profileTotalKm;

  return (
    <AppShell active="Home" title="Beranda">
      <div className="dashboard-social-home-v2 dashboard-social-home-v3">
        <section className="home-profile-card" aria-labelledby="home-member-name">
          <div className="home-profile-main">
            <div className="home-profile-avatar" aria-hidden="true">
              {userInitials}
            </div>

            <div className="home-profile-copy">
              <small>
                {hasActiveMember
                  ? "Member Revolt Riders"
                  : "Revolt Riders Member Network"}
              </small>
              <h2 id="home-member-name">{memberName}</h2>
              <p>
                {hasActiveMember
                  ? `@${memberId} · ${memberRole}`
                  : "Masuk untuk membuka aktivitas dan identitas member."}
              </p>
            </div>

            <Link
              className="home-profile-button"
              href={hasActiveMember ? "/profil" : "/login"}
            >
              {hasActiveMember ? "Profil" : "Masuk"}
              <ChevronRight aria-hidden="true" />
            </Link>
          </div>

          <div className="home-personal-stats" aria-label="Ringkasan rider">
            <span>
              <strong>
                {hasActiveMember ? (
                  <CountUpNumber
                    value={currentMember?.total_km ?? 0}
                    maximumFractionDigits={1}
                  />
                ) : (
                  "—"
                )}
              </strong>
              <small>KM riding</small>
            </span>
            <span>
              <strong>
                {hasActiveMember ? (
                  <CountUpNumber value={currentMember?.touring_count ?? 0} />
                ) : (
                  "—"
                )}
              </strong>
              <small>Ride resmi</small>
            </span>
            <span>
              <strong>
                {hasActiveMember
                  ? String(riderProgress.level.level).padStart(2, "0")
                  : "—"}
              </strong>
              <small>Road level</small>
            </span>
          </div>
        </section>

        {hasActiveMember && (
          <section
            className="home-feed-card home-road-progress home-road-progress--hero"
            aria-labelledby="home-road-title"
          >
            <header className="home-post-header">
              <span className="home-post-icon">
                <Flame aria-hidden="true" />
              </span>
              <span>
                <strong id="home-road-title">Road progress</strong>
                <small>Perjalanan rider kamu</small>
              </span>
              <Link href="/profil" aria-label="Buka achievements">
                <ChevronRight aria-hidden="true" />
              </Link>
            </header>

            <div className="home-road-hero-grid">
              <div className="home-road-main">
                <span>
                  <small>
                    ROAD LEVEL {String(riderProgress.level.level).padStart(2, "0")}
                  </small>
                  <strong>{riderProgress.level.title}</strong>
                </span>
                <b>{Math.round(riderProgress.levelProgress)}%</b>
              </div>

              <div
                className="home-road-summary"
                aria-label="Ringkasan progress pribadi"
              >
                <span>
                  <strong>
                    <CountUpNumber
                      value={currentMember?.total_km ?? 0}
                      maximumFractionDigits={1}
                    />
                  </strong>
                  <small>KM resmi</small>
                </span>
                <span>
                  <strong>
                    {riderProgress.level.nextKm
                      ? new Intl.NumberFormat("id-ID").format(
                          riderProgress.remainingKm,
                        )
                      : "MAX"}
                  </strong>
                  <small>
                    {riderProgress.level.nextKm
                      ? "KM menuju level"
                      : "Level tertinggi"}
                  </small>
                </span>
              </div>
            </div>

            <div
              className="home-road-track"
              role="progressbar"
              aria-label="Progress road level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(riderProgress.levelProgress)}
            >
              <i style={{ width: `${riderProgress.levelProgress}%` }} />
            </div>

            <div className="home-road-meta">
              <span>
                <Flame aria-hidden="true" /> {riderProgress.streakMonths} bulan
                streak
              </span>
              <Link href="/profil">
                {riderProgress.unlockedBadges.length} badge
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        <nav className="home-story-row" aria-label="Akses cepat">
          <Link href="/check-in">
            <span>
              <ScanLine aria-hidden="true" />
            </span>
            <small>Check-in</small>
          </Link>
          <Link href="/riding">
            <span>
              <Bike aria-hidden="true" />
            </span>
            <small>Riding</small>
          </Link>
          <Link href="/member">
            <span>
              <UsersRound aria-hidden="true" />
            </span>
            <small>Member</small>
          </Link>
          <Link href="/leaderboard">
            <span>
              <Trophy aria-hidden="true" />
            </span>
            <small>Ranking</small>
          </Link>
        </nav>

        <div className="home-feed-layout">
          <main className="home-feed" aria-label="Feed Revolt Riders">
            <CommunityFeed />
          </main>

          <aside className="home-side-rail" aria-label="Ringkasan komunitas">
            <section className="home-side-card">
              <header>
                <strong>Komunitas</strong>
                <small>Revolt Riders sekarang</small>
              </header>

              <div className="home-community-list">
                <span>
                  <UsersRound aria-hidden="true" />
                  <b>
                    <CountUpNumber value={totalRiders} />
                  </b>
                  <small>Member resmi</small>
                </span>
                <span>
                  <Gauge aria-hidden="true" />
                  <b>
                    <CountUpNumber
                      value={totalKm}
                      maximumFractionDigits={0}
                    />
                  </b>
                  <small>Total KM</small>
                </span>
                <span>
                  <CircleDollarSign aria-hidden="true" />
                  <b>
                    {user ? (
                      <CountUpNumber
                        value={Number(stats?.cash_balance ?? 0)}
                        maximumFractionDigits={1}
                        formatOptions={{
                          style: "currency",
                          currency: "IDR",
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }}
                      />
                    ) : (
                      "Privat"
                    )}
                  </b>
                  <small>Saldo kas</small>
                </span>
              </div>
            </section>

            <section className="home-side-card home-partner-card">
              <header>
                <strong>Support & partner</strong>
                <small>Ekosistem komunitas</small>
              </header>
              <div className="home-partner-list">
                <figure>
                  <div>
                    <Image
                      src="/bold-riders-situbondo.jpg"
                      alt="Bold Riders Situbondo"
                      fill
                      sizes="52px"
                    />
                  </div>
                  <figcaption>Bold Riders Situbondo</figcaption>
                </figure>
                <figure>
                  <div>
                    <Image src="/frtn.jpg" alt="FRTN" fill sizes="52px" />
                  </div>
                  <figcaption>FRTN</figcaption>
                </figure>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
