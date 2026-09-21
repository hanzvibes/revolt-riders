"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { useDataCache } from "@/context/data-cache-context";
import type { AnnouncementRecord, EventRecord } from "@/lib/domain";
import { formatEventDate, formatShortDate } from "@/lib/domain";
import { getRiderProgress } from "@/lib/rider-progression";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Database,
  Flame,
  Gauge,
  MapPin,
  ScanLine,
  ShieldCheck,
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
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentMember, setCurrentMember] = useState<LoggedInMember | null>(null);
  const [profileCount, setProfileCount] = useState<number>(0);
  const [profileTotalKm, setProfileTotalKm] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      try {
        const supabase = getSupabaseBrowserClient();

        const eventsPromise = fetchWithCache<EventRecord[]>(
          "dashboard_upcoming_events",
          async () => {
            const { data, error: evErr } = await supabase
              .from("events")
              .select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status")
              .eq("status", "published")
              .gte("start_at", new Date().toISOString())
              .order("start_at")
              .limit(3);
            if (evErr) throw evErr;
            return (data ?? []) as EventRecord[];
          },
          { ttlMs: 3 * 60 * 1000 },
        );

        const bulletinPromise = fetchWithCache<AnnouncementRecord[]>(
          "dashboard_latest_announcements",
          async () => {
            const { data, error: blErr } = await supabase
              .from("announcements")
              .select("id,title,body,published_at")
              .eq("is_published", true)
              .order("published_at", { ascending: false })
              .limit(1);
            if (blErr) throw blErr;
            return (data ?? []) as AnnouncementRecord[];
          },
          { ttlMs: 5 * 60 * 1000 },
        );

        const clubStatsPromise: Promise<DashboardStats | null> = user
          ? fetchWithCache<DashboardStats | null>(
              "dashboard_club_stats",
              async () => {
                const { data, error: stErr } = await supabase.rpc("get_member_dashboard_stats");
                if (stErr) throw stErr;
                return (data?.[0] ?? null) as DashboardStats | null;
              },
              { ttlMs: 2 * 60 * 1000 },
            ).catch(() => null)
          : Promise.resolve(null);

        const profileStatsPromise: Promise<{ count: number; totalKm: number } | null> =
          fetchWithCache<{ count: number; totalKm: number }>(
            "dashboard_member_profiles_stats",
            async () => {
              const { data, count, error: pErr } = await supabase
                .from("member_profiles")
                .select("total_km", { count: "exact" });
              if (pErr) return { count: 0, totalKm: 0 };
              const kmSum = ((data ?? []) as { total_km: number | string | null }[]).reduce(
                (sum: number, r) => sum + (Number(r.total_km) || 0),
                0,
              );
              return { count: count || 0, totalKm: kmSum };
            },
            { ttlMs: 3 * 60 * 1000 },
          ).catch(() => null);

        const memberPromise: Promise<LoggedInMember | null | undefined> =
          user && account?.member_external_id
            ? fetchWithCache<LoggedInMember | null>(
                `dashboard_member_profile_${account.member_external_id}`,
                async () => {
                  const [pRes, dRes, rLogs] = await Promise.all([
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
                  if (!pRes.data) return null;
                  return {
                    member_external_id: pRes.data.member_external_id,
                    full_name: pRes.data.full_name,
                    nickname: dRes.data?.nickname_override || pRes.data.nickname || null,
                    club_role: pRes.data.club_role || null,
                    total_km: Number(pRes.data.total_km) || 0,
                    touring_count: rLogs.count || 0,
                    ride_dates: ((rLogs.data ?? []) as { created_at: string }[]).map(
                      (ride) => ride.created_at,
                    ),
                  };
                },
                { ttlMs: 2 * 60 * 1000 },
              ).catch(() => undefined)
            : Promise.resolve(undefined);

        const [eventsData, bulletinData, clubStats, profileStats, memberData] =
          await Promise.all([
            eventsPromise,
            bulletinPromise,
            clubStatsPromise,
            profileStatsPromise,
            memberPromise,
          ]);

        if (active) {
          if (profileStats) {
            setProfileCount(profileStats.count);
            setProfileTotalKm(profileStats.totalKm);
          }
          if (memberData !== undefined) {
            setCurrentMember(memberData);
          }
          setEvents(eventsData);
          setAnnouncements(bulletinData);
          setStats(clubStats);
          setError("");
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Data belum dapat dimuat.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboardData();
    return () => {
      active = false;
    };
  }, [user, account, fetchWithCache]);

  const nextEvent = events[0];

  const totalRidersCount = stats?.total_members || profileCount;
  const totalKmAccumulated = stats?.total_km ? Number(stats.total_km) : profileTotalKm;

  const userInitials = useMemo(() => {
    if (currentMember) {
      const parts = (currentMember.nickname || currentMember.full_name).trim().split(/\s+/);
      return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return "RR";
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

  return (
    <AppShell active="Home" title="Beranda">
      <div className="dashboard-social-home-v2">
        <section className="home-profile-card" aria-labelledby="home-member-name">
          <div className="home-profile-main">
            <div className="home-profile-avatar" aria-hidden="true">{userInitials}</div>
            <div className="home-profile-copy">
              <small>{hasActiveMember ? "Member Revolt Riders" : "Revolt Riders Member Network"}</small>
              <h2 id="home-member-name">{memberName}</h2>
              <p>{hasActiveMember ? "@" + memberId + " · " + memberRole : "Masuk untuk membuka aktivitas dan identitas member."}</p>
            </div>
            <Link className="home-profile-button" href={hasActiveMember ? "/profil" : "/login"}>
              {hasActiveMember ? "Profil" : "Masuk"} <ChevronRight aria-hidden="true" />
            </Link>
          </div>

          <div className="home-personal-stats" aria-label="Ringkasan rider">
            <span>
              <strong>{hasActiveMember ? <CountUpNumber value={currentMember?.total_km ?? 0} maximumFractionDigits={1} /> : "—"}</strong>
              <small>KM riding</small>
            </span>
            <span>
              <strong>{hasActiveMember ? <CountUpNumber value={currentMember?.touring_count ?? 0} /> : "—"}</strong>
              <small>Ride resmi</small>
            </span>
            <span>
              <strong>{hasActiveMember ? String(riderProgress.level.level).padStart(2, "0") : "—"}</strong>
              <small>Road level</small>
            </span>
          </div>
        </section>

        <nav className="home-story-row" aria-label="Akses cepat">
          <Link href="/check-in"><span><ScanLine aria-hidden="true" /></span><small>Check-in</small></Link>
          <Link href="/riding"><span><Bike aria-hidden="true" /></span><small>Riding</small></Link>
          <Link href="/member"><span><UsersRound aria-hidden="true" /></span><small>Member</small></Link>
          <Link href="/leaderboard"><span><Trophy aria-hidden="true" /></span><small>Ranking</small></Link>
        </nav>

        <div className="home-feed-layout">
          <main className="home-feed" aria-label="Feed Revolt Riders">
            <article className="home-feed-card home-event-post">
              <header className="home-post-header">
                <Image src="/revolt-riders-logo.jpg" alt="" width={44} height={44} className="home-post-avatar" />
                <span>
                  <strong>Revolt Riders</strong>
                  <small><ShieldCheck aria-hidden="true" /> Agenda komunitas</small>
                </span>
                <Link href="/agenda" aria-label="Lihat semua agenda"><ChevronRight aria-hidden="true" /></Link>
              </header>

              {nextEvent ? (
                <>
                  <Link className="home-featured-event" href={"/agenda#" + nextEvent.slug}>
                    <div className="home-event-date">
                      <small>{formatShortDate(nextEvent.start_at).month}</small>
                      <strong>{formatShortDate(nextEvent.start_at).day}</strong>
                    </div>
                    <div className="home-event-copy">
                      <small>{nextEvent.type}</small>
                      <h3>{nextEvent.title}</h3>
                      <p><MapPin aria-hidden="true" />{nextEvent.location_name ?? "Lokasi segera diumumkan"}</p>
                      <p><CalendarDays aria-hidden="true" />{formatEventDate(nextEvent.start_at)}</p>
                    </div>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                  <footer className="home-post-actions">
                    <Link href={"/agenda#" + nextEvent.slug}>Buka agenda</Link>
                    <Link href={hasActiveMember ? "/profil" : "/login"}>{hasActiveMember ? "Lihat profil" : "Masuk member"}</Link>
                  </footer>
                </>
              ) : (
                <div className="home-feed-empty">
                  <Database aria-hidden="true" />
                  <span><b>Belum ada agenda baru.</b><small>Agenda berikutnya akan tampil otomatis di beranda.</small></span>
                </div>
              )}
            </article>

            {announcements[0] ? (
              <article className="home-feed-card home-bulletin-post">
                <header className="home-post-header">
                  <span className="home-post-icon"><ShieldCheck aria-hidden="true" /></span>
                  <span><strong>Buletin resmi</strong><small>Informasi komunitas</small></span>
                  <Link href="/bulletin" aria-label="Buka buletin"><ChevronRight aria-hidden="true" /></Link>
                </header>
                <Link className="home-bulletin-body" href="/bulletin">
                  <h3>{announcements[0].title}</h3>
                  <p>{announcements[0].body}</p>
                  <span>Baca selengkapnya <ChevronRight aria-hidden="true" /></span>
                </Link>
              </article>
            ) : (
              <article className="home-feed-card home-bulletin-post">
                <header className="home-post-header">
                  <span className="home-post-icon"><ShieldCheck aria-hidden="true" /></span>
                  <span><strong>Buletin resmi</strong><small>Informasi komunitas</small></span>
                </header>
                <div className="home-feed-empty">
                  <Database aria-hidden="true" />
                  <span><b>Belum ada pengumuman baru.</b><small>Info resmi komunitas akan tampil di sini.</small></span>
                </div>
              </article>
            )}

            <section className="home-feed-card home-agenda-list" aria-labelledby="home-agenda-title">
              <header className="home-post-header">
                <span className="home-post-icon"><CalendarDays aria-hidden="true" /></span>
                <span>
                  <strong id="home-agenda-title">Agenda berikutnya</strong>
                  <small>{events.length ? events.length + " agenda aktif" : "Belum ada agenda"}</small>
                </span>
                <Link href="/agenda" aria-label="Lihat semua agenda"><ChevronRight aria-hidden="true" /></Link>
              </header>

              {loading && <p className="home-feed-message" role="status" aria-live="polite">Memuat agenda terbaru…</p>}
              {error && <p className="error-message" role="alert">{error}</p>}
              {!loading && !error && events.length === 0 && (
                <div className="home-feed-empty">
                  <Database aria-hidden="true" />
                  <span><b>Belum ada agenda yang dipublikasikan.</b><small>Touring dan kopdar akan muncul otomatis di sini.</small></span>
                </div>
              )}

              {!loading && !error && events.map((event, idx) => {
                const d = formatShortDate(event.start_at);
                return (
                  <Link className="home-agenda-row" href={"/agenda#" + event.slug} key={event.id}>
                    <time><strong>{d.day}</strong><small>{d.month}</small></time>
                    <span>
                      <small>{idx === 0 ? "Terdekat · " : ""}{event.type}</small>
                      <b>{event.title}</b>
                      <em>{formatEventDate(event.start_at)}</em>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
            </section>

            {hasActiveMember && (
              <section className="home-feed-card home-road-progress" aria-labelledby="home-road-title">
                <header className="home-post-header">
                  <span className="home-post-icon"><Flame aria-hidden="true" /></span>
                  <span><strong id="home-road-title">Road progress</strong><small>Perjalanan rider kamu</small></span>
                  <Link href="/profil" aria-label="Buka achievements"><ChevronRight aria-hidden="true" /></Link>
                </header>
                <div className="home-road-main">
                  <span>
                    <small>ROAD LEVEL {String(riderProgress.level.level).padStart(2, "0")}</small>
                    <strong>{riderProgress.level.title}</strong>
                  </span>
                  <b>{Math.round(riderProgress.levelProgress)}%</b>
                </div>
                <div className="home-road-track" role="progressbar" aria-label="Progress road level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(riderProgress.levelProgress)}>
                  <i style={{ width: String(riderProgress.levelProgress) + "%" }} />
                </div>
                <div className="home-road-meta">
                  <span><Flame aria-hidden="true" /> {riderProgress.streakMonths} bulan streak</span>
                  <span>{riderProgress.level.nextKm ? new Intl.NumberFormat("id-ID").format(riderProgress.remainingKm) + " KM lagi" : "Level tertinggi"}</span>
                  <Link href="/profil">{riderProgress.unlockedBadges.length} badge <ChevronRight aria-hidden="true" /></Link>
                </div>
              </section>
            )}
          </main>

          <aside className="home-side-rail" aria-label="Ringkasan komunitas">
            <section className="home-side-card">
              <header><strong>Komunitas</strong><small>Revolt Riders sekarang</small></header>
              <div className="home-community-list">
                <span><UsersRound aria-hidden="true" /><b><CountUpNumber value={totalRidersCount} /></b><small>Member resmi</small></span>
                <span><Gauge aria-hidden="true" /><b><CountUpNumber value={totalKmAccumulated} maximumFractionDigits={0} /></b><small>Total KM</small></span>
                <span>
                  <CircleDollarSign aria-hidden="true" />
                  <b>{stats || user ? <CountUpNumber value={Number(stats?.cash_balance ?? 0)} maximumFractionDigits={1} formatOptions={{ style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 1 }} /> : "Privat"}</b>
                  <small>Saldo kas</small>
                </span>
              </div>
            </section>

            <section className="home-side-card home-partner-card">
              <header><strong>Support & partner</strong><small>Ekosistem komunitas</small></header>
              <div className="home-partner-list">
                <figure>
                  <div><Image src="/bold-riders-situbondo.jpg" alt="Bold Riders Situbondo" fill sizes="56px" /></div>
                  <figcaption>Bold Riders Situbondo</figcaption>
                </figure>
                <figure>
                  <div><Image src="/frtn.jpg" alt="FRTN" fill sizes="56px" /></div>
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
