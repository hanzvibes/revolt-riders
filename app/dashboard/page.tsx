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

  const memberName =
    currentMember?.nickname ||
    currentMember?.full_name ||
    account?.member_external_id ||
    (user ? "Rider Revolt" : "Guest Rider");
  const memberId = account?.member_external_id || "MEMBER";
  const memberRole = currentMember?.club_role || account?.role || "Member";
  const hasActiveMember = Boolean(user && !authLoading);


  return (
    <AppShell active="Home" title="Dashboard">
      <div className="dashboard-grid dashboard-premium">
        <section className="unified-dashboard-hero" aria-labelledby="dashboard-hero-title">
          <div className="unified-hero-top">
            <div className="unified-member">
              <div className="unified-member-avatar" aria-hidden="true">{userInitials}</div>
              <div className="unified-member-copy">
                <small>{hasActiveMember ? "Member aktif" : "Portal member"}</small>
                <strong>{memberName}</strong>
                <div className="unified-member-chips">
                  <span>{hasActiveMember ? memberId : "REVOLT RIDERS"}</span>
                  <span>{hasActiveMember ? memberRole : "SITUBONDO"}</span>
                </div>
              </div>
            </div>

            {nextEvent ? (
              <div className="unified-hero-badge unified-event-badge" aria-label="Tanggal agenda terdekat">
                <small>{formatShortDate(nextEvent.start_at).month}</small>
                <b>{formatShortDate(nextEvent.start_at).day}</b>
                <span>Terdekat</span>
              </div>
            ) : (
              <div className="unified-hero-badge unified-crest-badge">
                <Image
                  src="/revolt-riders-logo.jpg"
                  alt="Logo Revolt Riders"
                  width={58}
                  height={58}
                  className="unified-crest-logo"
                  priority
                />
                <span>2026</span>
              </div>
            )}
          </div>

          <div className="unified-hero-main">
            <div className="unified-hero-copy">
              <div className="unified-hero-eyebrow">
                <span>REVOLT RIDERS</span>
                <em>{nextEvent ? "Agenda terdekat" : "Member hub"}</em>
              </div>
              <h2 id="dashboard-hero-title">{nextEvent?.title ?? "Ruang anggota Revolt Riders"}</h2>
              {nextEvent ? (
                <div className="unified-hero-meta">
                  <p><MapPin aria-hidden="true" />{nextEvent.location_name ?? "Lokasi segera diumumkan"}</p>
                  <p><CalendarDays aria-hidden="true" />{formatEventDate(nextEvent.start_at)}</p>
                </div>
              ) : (
                <p className="unified-hero-desc"><ShieldCheck aria-hidden="true" />Satu aspal, satu persaudaraan.</p>
              )}
              <div className="unified-hero-actions">
                <Link className="unified-primary-action" href="/agenda">
                  Buka agenda <ChevronRight aria-hidden="true" />
                </Link>
                <Link className="unified-secondary-action" href={hasActiveMember ? "/profil" : "/login"}>
                  {hasActiveMember ? "Lihat profil" : "Masuk member"}
                </Link>
              </div>
            </div>
            <div className="unified-hero-watermark" aria-hidden="true">RR</div>
          </div>

          <div className="unified-hero-data">
            <div className="unified-personal-stats" aria-label="Statistik member">
              <div className="unified-personal-stat">
                <Bike aria-hidden="true" />
                <span>
                  <small>Jarak riding</small>
                  <b>
                    {hasActiveMember
                      ? `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(currentMember?.total_km ?? 0)} KM`
                      : "Privat"}
                  </b>
                </span>
              </div>
              <div className="unified-personal-stat">
                <CalendarDays aria-hidden="true" />
                <span>
                  <small>Kegiatan terverifikasi</small>
                  <b>{hasActiveMember ? `${currentMember?.touring_count ?? 0} Agenda` : "Privat"}</b>
                </span>
              </div>
            </div>

            <div className="unified-community-stats" aria-label="Ringkasan komunitas">
              <div className="unified-community-stat">
                <UsersRound aria-hidden="true" />
                <span>
                  <small>Member resmi</small>
                  <b>{totalRidersCount} member</b>
                </span>
              </div>
              <div className="unified-community-stat">
                <Gauge aria-hidden="true" />
                <span>
                  <small>Total kilometer</small>
                  <b>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKmAccumulated)} KM</b>
                </span>
              </div>
              <div className="unified-community-stat">
                <CircleDollarSign aria-hidden="true" />
                <span>
                  <small>Saldo kas</small>
                  <b>
                    {stats
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(Number(stats.cash_balance))
                      : user
                        ? "Rp 0"
                        : "Privat"}
                  </b>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="left-column">
          {/* Quick Actions */}
          <section className="dashboard-actions-panel" aria-labelledby="dashboard-actions-title">
            <div className="dashboard-panel-heading">
              <span>
                <em>Akses cepat</em>
                <h3 id="dashboard-actions-title">Operasional utama</h3>
              </span>
              <small>4 pintasan</small>
            </div>
            <div className="dashboard-quick-actions">
              <Link className="quick-action-btn" href="/check-in">
                <div className="quick-action-icon">
                  <ScanLine aria-hidden="true" />
                </div>
                <div className="quick-action-info">
                  <span className="quick-action-title">Check-in</span>
                  <span className="quick-action-desc">Agenda & kopdar</span>
                </div>
                <ChevronRight className="quick-action-arrow" aria-hidden="true" />
              </Link>
              <Link className="quick-action-btn" href="/riding">
                <div className="quick-action-icon">
                  <Bike aria-hidden="true" />
                </div>
                <div className="quick-action-info">
                  <span className="quick-action-title">Catat KM</span>
                  <span className="quick-action-desc">Tambah ride log</span>
                </div>
                <ChevronRight className="quick-action-arrow" aria-hidden="true" />
              </Link>
              <Link className="quick-action-btn" href="/member">
                <div className="quick-action-icon">
                  <UsersRound aria-hidden="true" />
                </div>
                <div className="quick-action-info">
                  <span className="quick-action-title">Direktori</span>
                  <span className="quick-action-desc">{totalRidersCount ? `${totalRidersCount} member` : "Member club"}</span>
                </div>
                <ChevronRight className="quick-action-arrow" aria-hidden="true" />
              </Link>
              <Link className="quick-action-btn" href="/leaderboard">
                <div className="quick-action-icon">
                  <Trophy aria-hidden="true" />
                </div>
                <div className="quick-action-info">
                  <span className="quick-action-title">Leaderboard</span>
                  <span className="quick-action-desc">Kilometer riding</span>
                </div>
                <ChevronRight className="quick-action-arrow" aria-hidden="true" />
              </Link>
            </div>
          </section>

          {/* Agenda Terdekat */}
          <section className="card agenda-card">
            <div className="section-title">
              <span>
                <em>Agenda</em>
                <h3>Jadwal terdekat</h3>
              </span>
              <Link href="/agenda">
                Lihat semua <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            {loading && <p className="system-message" role="status" aria-live="polite">Memuat agenda terbaru…</p>}
            {error && <p className="error-message" role="alert">{error}</p>}
            {!loading && !error && events.length === 0 && (
              <div className="inline-empty">
                <Database aria-hidden="true" />
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
                      {idx === 0 && <span className="event-soon-pill">Terdekat</span>}
                    </div>
                    <h4>{event.title}</h4>
                    <p><CalendarDays aria-hidden="true" size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />{formatEventDate(event.start_at)}</p>
                  </div>
                  <ChevronRight className="event-arrow" aria-hidden="true" />
                </a>
              );
            })}
          </section>
        </div>

        {/* Right Sidebar Column */}
        <div className="right-column">
          {/* Bulletin Pengumuman */}
          {announcements[0] ? (
            <a className="bullet-card" href="/bulletin">
              <div className="bullet-header">
                <span className="bullet-badge">Buletin resmi</span>
                <ChevronRight size={15} />
              </div>
              <h3>{announcements[0].title}</h3>
              <p>{announcements[0].body}</p>
            </a>
          ) : (
            <a className="bullet-card" href="/bulletin">
              <div className="bullet-header">
                <span className="bullet-badge">Buletin resmi</span>
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
                <em>Partner komunitas</em>
                <h3>Support & partner</h3>
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
