"use client";

import { AppShell } from "@/components/app-shell";
import { useDataCache } from "@/context/data-cache-context";
import type { AnnouncementRecord, EventRecord } from "@/lib/domain";
import { formatEventDate, formatShortDate } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Database,
  Gauge,
  MapPin,
  ScanLine,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
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
};

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

        // 1. Fetch upcoming events with cache
        const eventsData = await fetchWithCache<EventRecord[]>(
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

        // 2. Fetch latest announcement with cache
        const bulletinData = await fetchWithCache<AnnouncementRecord[]>(
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

        // 3. Fetch club stats if available
        let clubStats: DashboardStats | null = null;
        if (user) {
          try {
            const statsData = await fetchWithCache<DashboardStats | null>(
              "dashboard_club_stats",
              async () => {
                const { data, error: stErr } = await supabase.rpc("get_member_dashboard_stats");
                if (stErr) throw stErr;
                return (data?.[0] ?? null) as DashboardStats | null;
              },
              { ttlMs: 2 * 60 * 1000 },
            );
            clubStats = statsData;
          } catch {
            clubStats = null;
          }
        }

        // 4. Fetch member profile stats fallback from member_profiles
        try {
          const profileStats = await fetchWithCache<{ count: number; totalKm: number }>(
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
          );
          if (active) {
            setProfileCount(profileStats.count);
            setProfileTotalKm(profileStats.totalKm);
          }
        } catch {
          // ignore
        }

        // 5. Fetch current logged-in member data
        if (user && account?.member_external_id) {
          try {
            const memberData = await fetchWithCache<LoggedInMember | null>(
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
                    .select("id", { count: "exact", head: true })
                    .eq("member_external_id", account.member_external_id)
                    .eq("status", "approved"),
                ]);
                if (!pRes.data) return null;
                return {
                  member_external_id: pRes.data.member_external_id,
                  full_name: pRes.data.full_name,
                  nickname: dRes.data?.nickname_override || pRes.data.nickname || null,
                  club_role: pRes.data.club_role || null,
                  total_km: Number(pRes.data.total_km) || 0,
                  touring_count: rLogs.count || 0,
                };
              },
              { ttlMs: 2 * 60 * 1000 },
            );
            if (active) setCurrentMember(memberData);
          } catch {
            // ignore
          }
        }

        if (active) {
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

  const renderRiderCard = () => {
    if (user && !authLoading) {
      return (
        <section className="rider-status-card">
          <div className="rider-status-header">
            <div className="rider-status-avatar">{userInitials}</div>
            <div className="rider-status-meta">
              <span className="rider-status-name">
                {currentMember?.nickname || currentMember?.full_name || account?.member_external_id || "Rider Revolt"}
              </span>
              <div className="rider-status-sub">
                <span className="member-id-tag">
                  {account?.member_external_id || "MEMBER"}
                </span>
                <span className={`member-role-badge ${getRoleClass(currentMember?.club_role || account?.role || "member")}`}>
                  {currentMember?.club_role || account?.role || "Member"}
                </span>
              </div>
            </div>
          </div>

          <div className="rider-status-metrics">
            <div className="rider-status-metric">
              <small>Total Jarak</small>
              <b>
                {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(
                  currentMember?.total_km ?? 0,
                )}{" "}
                KM
              </b>
            </div>
            <div className="rider-status-metric">
              <small>Touring / Sowan</small>
              <b>{currentMember?.touring_count ?? 0} Agenda</b>
            </div>
          </div>

          <div className="rider-status-actions">
            <a className="dark-action" href="/profil">
              BUKA PROFIL SAYA
            </a>
          </div>
        </section>
      );
    }
    return (
      <section className="profile card">
        <Image src="/revolt-riders-logo.jpg" alt="Revolt Riders" width={92} height={92} priority />
        <em>PORTAL ANGGOTA</em>
        <h3>Akses member internal</h3>
        <p>
          Masuk ke akun untuk mencatat kilometer riding, check-in QR saat kopdar, dan melihat saldo kas komunitas.
        </p>
        <a className="dark-action" href="/login">
          MASUK KE AKUN
        </a>
      </section>
    );
  };

  return (
    <AppShell active="Home" title="Member Hub">
      <div className="dashboard-grid">
        {/* Left Primary Column */}
        <div className="left-column">
          {/* Mobile-only Rider Card placed at top */}
          <div className="mobile-rider-card">
            {renderRiderCard()}
          </div>

          {/* Modern Event Spotlight Hero */}
          <section className="hero">
            <div className="hero-content">
              <div className="hero-eyebrow">
                <span className="hero-tag">{nextEvent ? (nextEvent.type || "AGENDA").toUpperCase() : "PORTAL RESMI"}</span>
                <em>{nextEvent ? "AGENDA TERDEKAT" : "REVOLT RIDERS SITUBONDO"}</em>
              </div>
              <h2>{nextEvent?.title ?? <>SATU ASPAL.<br />SATU PERSAUDARAAN.</>}</h2>
              {nextEvent ? (
                <div className="hero-meta">
                  <p><MapPin />{nextEvent.location_name ?? "Lokasi segera diumumkan"}</p>
                  <p><CalendarDays />{formatEventDate(nextEvent.start_at)}</p>
                </div>
              ) : (
                <p className="hero-desc"><ShieldCheck />Platform digital resmi komunitas Revolt Riders Situbondo</p>
              )}
              <a className="primary-action hero-cta" href="/agenda">
                LIHAT AGENDA <ChevronRight />
              </a>
            </div>
            {nextEvent ? (
              <div className="hero-date-badge">
                <small className="hero-badge-month">{formatShortDate(nextEvent.start_at).month}</small>
                <b className="hero-badge-day">{formatShortDate(nextEvent.start_at).day}</b>
                <span className="hero-badge-status">UPCOMING</span>
              </div>
            ) : (
              <div className="hero-date-badge fallback-badge">
                <Image src="/revolt-riders-logo.jpg" alt="Revolt Riders" width={44} height={44} className="hero-badge-logo" />
                <span className="hero-badge-year">2026</span>
              </div>
            )}
          </section>

          {/* Quick Actions Bar */}
          <div className="dashboard-quick-actions">
            <a className="quick-action-btn" href="/check-in">
              <div className="quick-action-icon">
                <ScanLine />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Check-in</span>
                <span className="quick-action-desc">Presensi acara</span>
              </div>
            </a>
            <a className="quick-action-btn" href="/riding">
              <div className="quick-action-icon">
                <Bike />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Catat KM</span>
                <span className="quick-action-desc">Input ride log</span>
              </div>
            </a>
            <a className="quick-action-btn" href="/member">
              <div className="quick-action-icon">
                <UsersRound />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Direktori</span>
                <span className="quick-action-desc">{totalRidersCount ? `${totalRidersCount} Anggota` : "Member Club"}</span>
              </div>
            </a>
            <a className="quick-action-btn" href="/leaderboard">
              <div className="quick-action-icon">
                <Trophy />
              </div>
              <div className="quick-action-info">
                <span className="quick-action-title">Klasemen</span>
                <span className="quick-action-desc">Leaderboard KM</span>
              </div>
            </a>
          </div>

          {/* Premium Compact Stats */}
          <section className="stats">
            <article>
              <UsersRound />
              <span>
                <small>MEMBER TERDAFTAR</small>
                <b>{totalRidersCount} Riders</b>
                <small>Anggota resmi aktif</small>
              </span>
            </article>
            <article>
              <Gauge />
              <span>
                <small>TOTAL KM CLUB</small>
                <b>
                  {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKmAccumulated)} KM
                </b>
                <small>Akumulasi jarak tempuh</small>
              </span>
            </article>
            <article>
              <CircleDollarSign />
              <span>
                <small>SALDO KAS</small>
                <b>
                  {stats ? (
                    new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(stats.cash_balance))
                  ) : user ? (
                    "Rp 0"
                  ) : (
                    "Privat"
                  )}
                </b>
                <small>
                  {user ? "Kas operasional" : <a href="/login">Masuk untuk melihat</a>}
                </small>
              </span>
            </article>
          </section>

          {/* Agenda Terdekat */}
          <section className="card agenda-card">
            <div className="section-title">
              <span>
                <em>AGENDA RESMI</em>
                <h3>Agenda terdekat</h3>
              </span>
              <a href="/agenda">
                Lihat semua <ChevronRight />
              </a>
            </div>

            {loading && <p className="system-message">Memuat agenda terbaru…</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && events.length === 0 && (
              <div className="inline-empty">
                <Database />
                <span>
                  <b>Belum ada agenda yang dipublikasikan.</b>
                  <small>Agenda touring atau kopdar baru akan tampil otomatis di sini.</small>
                </span>
              </div>
            )}

            {events.map((event, idx) => {
              const d = formatShortDate(event.start_at);
              return (
                <a className="event" href={`/agenda#${event.slug}`} key={event.id}>
                  <time>
                    <b>{d.day}</b>
                    <small>{d.month}</small>
                  </time>
                  <div className="event-info">
                    <div className="event-header-row">
                      <em>{event.type.toUpperCase()}</em>
                      {idx === 0 && <span className="event-soon-pill">SEGERA</span>}
                    </div>
                    <h4>{event.title}</h4>
                    <p><CalendarDays size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />{formatEventDate(event.start_at)}</p>
                  </div>
                  <ChevronRight className="event-arrow" />
                </a>
              );
            })}
          </section>
        </div>

        {/* Right Sidebar Column */}
        <div className="right-column">
          {/* Desktop-only Member Personal Status Card */}
          <div className="desktop-rider-card">
            {renderRiderCard()}
          </div>

          {/* Bulletin Pengumuman */}
          {announcements[0] ? (
            <a className="bullet-card" href="/bulletin">
              <div className="bullet-header">
                <span className="bullet-badge">PENGUMUMAN RESMI</span>
                <ChevronRight size={15} />
              </div>
              <h3>{announcements[0].title}</h3>
              <p>{announcements[0].body}</p>
            </a>
          ) : (
            <a className="bullet-card" href="/bulletin">
              <div className="bullet-header">
                <span className="bullet-badge">PENGUMUMAN RESMI</span>
                <ChevronRight size={15} />
              </div>
              <h3>Belum ada pengumuman baru</h3>
              <p>Informasi resmi komunitas akan tampil di sini.</p>
            </a>
          )}

          {/* Official Support */}
          <section className="support card">
            <div className="section-title">
              <span>
                <em>OFFICIAL SUPPORT</em>
                <h3>Support Revolt Riders</h3>
              </span>
            </div>
            <div className="support-grid">
              <figure className="bold-riders">
                <div className="support-logo">
                  <Image
                    src="/bold-riders-situbondo.jpg"
                    alt="Bold Riders Situbondo"
                    fill
                    sizes="(max-width: 720px) 45vw, 180px"
                  />
                </div>
                <figcaption>Bold Riders Situbondo</figcaption>
              </figure>
              <figure className="frtn">
                <div className="support-logo">
                  <Image
                    src="/frtn.jpg"
                    alt="FRTN"
                    fill
                    sizes="(max-width: 720px) 45vw, 180px"
                  />
                </div>
                <figcaption>FRTN</figcaption>
              </figure>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
