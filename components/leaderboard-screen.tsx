"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { PageState } from "@/components/page-state";
import { CardSkeleton, StatsGridSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Gauge,
  Medal,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Rider = {
  member_external_id: string;
  full_name: string;
  total_km: number;
};

export default function LeaderboardPage() {
  const { user, account, loading: authLoading, fetchWithCache, invalidateCache } = useDataCache();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [query, setQuery] = useState("");
  const [activeTopIndex, setActiveTopIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    if (authLoading) return;

    try {
      setLoading(true);
      const data = await fetchWithCache<Rider[]>(
        "riding_leaderboard_data",
        async () => {
          const supabase = getSupabaseBrowserClient();
          type ProfileRow = {
            member_external_id: string;
            full_name: string;
            nickname?: string | null;
            total_km: number | string | null;
          };
          const { data: profiles, error: profErr } = await supabase
            .from("member_profiles")
            .select("member_external_id,full_name,nickname,total_km")
            .order("total_km", { ascending: false });
          if (!profErr && profiles && profiles.length > 0) {
            return (profiles as ProfileRow[]).map((p: ProfileRow) => ({
              member_external_id: p.member_external_id,
              full_name: p.nickname ? `${p.nickname} (${p.full_name})` : p.full_name,
              total_km: Math.round(Number(p.total_km) || 0),
            }));
          }

          // Fallback to RPC get_riding_leaderboard
          const { data: result, error: fetchErr } =
            await supabase.rpc("get_riding_leaderboard");
          if (fetchErr) throw profErr || fetchErr;
          return ((result ?? []) as Rider[]).map((row: Rider) => ({
            ...row,
            total_km: Math.round(Number(row.total_km) || 0),
          }));
        },
        { ttlMs: 2 * 60 * 1000 },
      );

      setRiders(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Leaderboard belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, fetchWithCache]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const maxKm = useMemo(() => {
    return riders[0]?.total_km > 0 ? riders[0].total_km : 1;
  }, [riders]);

  const totalKmSum = useMemo(() => {
    return riders.reduce((acc, r) => acc + (r.total_km || 0), 0);
  }, [riders]);

  const myIndex = useMemo(() => {
    if (!account?.member_external_id) return -1;
    return riders.findIndex(
      (r) => r.member_external_id === account.member_external_id,
    );
  }, [riders, account]);

  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myRider = myIndex >= 0 ? riders[myIndex] : null;
  const kmToNext =
    myIndex > 0 ? riders[myIndex - 1].total_km - (myRider?.total_km ?? 0) : 0;

  const rankByMemberId = useMemo(() => {
    const ranks = new Map<string, number>();
    riders.forEach((rider, index) => {
      ranks.set(rider.member_external_id, index + 1);
    });
    return ranks;
  }, [riders]);

  const filteredRiders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.member_external_id.toLowerCase().includes(q),
    );
  }, [riders, query]);

  const top3 = useMemo(() => {
    return riders.slice(0, 3);
  }, [riders]);

  useEffect(() => {
    if (top3.length > 0 && activeTopIndex >= top3.length) {
      setActiveTopIndex(0);
    }
  }, [activeTopIndex, top3.length]);

  const rotateTopStack = useCallback(
    (direction: 1 | -1) => {
      if (top3.length < 2) return;
      setActiveTopIndex((current) =>
        (current + direction + top3.length) % top3.length,
      );
    },
    [top3.length],
  );

  const top3Stack = useMemo(
    () =>
      top3.map((rider, index) => ({
        rider,
        rank: index + 1,
        layer: (index - activeTopIndex + top3.length) % top3.length,
      })),
    [activeTopIndex, top3],
  );

  const remainingRiders = useMemo(() => {
    if (query.trim()) {
      return filteredRiders;
    }
    return riders.slice(3);
  }, [query, filteredRiders, riders]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AppShell active="Leaderboard" title="Leaderboard">
      <div className="page-wrap">
        {!user && !authLoading ? (
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akses leaderboard internal"
            description="Silakan masuk ke akun Anda untuk melihat klasemen jarak tempuh member Revolt Riders."
            action={
              <a className="primary-action" href="/login">
                MASUK KE AKUN
              </a>
            }
          />
        ) : loading ? (
          <div className="page-skeleton-stack">
            <StatsGridSkeleton count={3} />
            <CardSkeleton height="280px" />
          </div>
        ) : error ? (
          <PageState
            tone="error"
            icon={<Gauge />}
            title="Leaderboard belum dapat dimuat"
            description={error}
          />
        ) : (
          <>
            <section className="leaderboard-hero" aria-labelledby="leaderboard-hero-title">
              <div className="leaderboard-hero-top">
                <div className="leaderboard-hero-brand">
                  <div className="leaderboard-hero-brand-mark" aria-hidden="true">
                    <Trophy />
                  </div>
                  <div>
                    <small>RIDING LEADERBOARD</small>
                    <strong>Revolt Riders</strong>
                    <span>Kilometer terverifikasi</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="leaderboard-hero-refresh"
                  onClick={() => {
                    invalidateCache("riding_leaderboard_data");
                    invalidateCache("member_profiles_list");
                    void loadLeaderboard();
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
                  <span>{loading ? "Memuat data" : "Refresh data"}</span>
                </button>
              </div>

              <div className="leaderboard-hero-main">
                <div className="leaderboard-hero-copy">
                  <div className="leaderboard-hero-eyebrow">
                    <span>REVOLT RIDERS</span>
                    <em>Official ranking</em>
                  </div>
                  <h2 id="leaderboard-hero-title">Leaderboard Kilometer</h2>
                  <p>
                    Peringkat berdasarkan kilometer riding yang telah tervalidasi
                    oleh Road Captain.
                  </p>
                </div>

                <div className="leaderboard-hero-watermark" aria-hidden="true">RR</div>

                {top3.length >= 3 ? (
                  <div
                    className="leaderboard-hero-podium leaderboard-swipe-podium"
                    aria-label="Tiga rider teratas"
                  >
                    <div
                      className="leaderboard-swipe-deck"
                      role="region"
                      aria-roledescription="carousel"
                      aria-label="Top 3 leaderboard. Geser kartu ke kiri atau kanan."
                    >
                      {top3Stack.map(({ rider, rank, layer }) => {
                        const isFront = layer === 0;
                        const Icon = rank === 1 ? Crown : Medal;
                        const layerX = layer === 1 ? 32 : layer === 2 ? -32 : 0;
                        const layerY = layer === 0 ? 0 : layer === 1 ? 14 : 20;
                        const layerScale = layer === 0 ? 1 : layer === 1 ? 0.955 : 0.92;
                        const layerRotate = layer === 0 ? 0 : layer === 1 ? 1.8 : -1.8;
                        const layerOpacity = layer === 0 ? 1 : layer === 1 ? 0.82 : 0.66;

                        return (
                          <motion.article
                            key={rider.member_external_id}
                            className={`leaderboard-hero-podium-card rank-${rank} stack-layer-${layer}`}
                            aria-hidden={!isFront}
                            tabIndex={isFront ? 0 : -1}
                            drag={isFront && !reduceMotion ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.16}
                            dragMomentum={false}
                            animate={{
                              x: layerX,
                              y: layerY,
                              scale: layerScale,
                              rotate: layerRotate,
                              opacity: layerOpacity,
                            }}
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : {
                                    type: "spring",
                                    stiffness: 290,
                                    damping: 34,
                                    mass: 0.78,
                                  }
                            }
                            whileDrag={
                              isFront && !reduceMotion
                                ? {
                                    scale: 1.015,
                                    rotate: 0.35,
                                    cursor: "grabbing",
                                  }
                                : undefined
                            }
                            onDragEnd={(_, info) => {
                              const shouldMove =
                                Math.abs(info.offset.x) > 54 ||
                                Math.abs(info.velocity.x) > 460;

                              if (!shouldMove) return;
                              rotateTopStack(info.offset.x < 0 ? 1 : -1);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowLeft") {
                                event.preventDefault();
                                rotateTopStack(-1);
                              }
                              if (event.key === "ArrowRight") {
                                event.preventDefault();
                                rotateTopStack(1);
                              }
                            }}
                            style={{ zIndex: 10 - layer }}
                          >
                            <header className="leaderboard-stack-card-head">
                              <div className="leaderboard-stack-card-identity">
                                <div
                                  className="leaderboard-hero-rank-icon"
                                  aria-hidden="true"
                                >
                                  <Icon />
                                </div>
                                <div>
                                  <span className="leaderboard-hero-rank-label">
                                    Peringkat #{rank}
                                  </span>
                                  <strong title={rider.full_name}>
                                    {rider.full_name}
                                  </strong>
                                  <small>{rider.member_external_id}</small>
                                </div>
                              </div>
                              <b className="leaderboard-stack-card-km">
                                <CountUpNumber
                                  value={rider.total_km}
                                  suffix=" KM"
                                />
                              </b>
                            </header>

                            <p className="leaderboard-stack-card-note">
                              Kilometer riding terverifikasi dari aktivitas member.
                            </p>

                            <div className="leaderboard-stack-card-details">
                              <div>
                                <Trophy aria-hidden="true" />
                                <span>Peringkat</span>
                                <strong>#{rank}</strong>
                              </div>
                              <div>
                                <Users aria-hidden="true" />
                                <span>Member ID</span>
                                <strong>{rider.member_external_id}</strong>
                              </div>
                              <div>
                                <Gauge aria-hidden="true" />
                                <span>Status</span>
                                <strong>Terverifikasi</strong>
                              </div>
                            </div>

                            <footer className="leaderboard-stack-card-total">
                              <span>Total Kilometer</span>
                              <strong>
                                <CountUpNumber
                                  value={rider.total_km}
                                  suffix=" KM"
                                />
                              </strong>
                            </footer>
                          </motion.article>
                        );
                      })}
                    </div>

                    <div
                      className="leaderboard-swipe-controls"
                      aria-label="Navigasi kartu leaderboard"
                    >
                      <button
                        type="button"
                        onClick={() => rotateTopStack(-1)}
                        aria-label="Kartu sebelumnya"
                      >
                        <ChevronLeft aria-hidden="true" />
                      </button>
                      <div className="leaderboard-swipe-dots">
                        {top3.map((rider, index) => (
                          <button
                            key={rider.member_external_id}
                            type="button"
                            className={index === activeTopIndex ? "active" : ""}
                            aria-label={`Tampilkan peringkat #${index + 1}`}
                            aria-current={
                              index === activeTopIndex ? "true" : undefined
                            }
                            onClick={() => setActiveTopIndex(index)}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => rotateTopStack(1)}
                        aria-label="Kartu berikutnya"
                      >
                        <ChevronRight aria-hidden="true" />
                      </button>
                    </div>
                    <small className="leaderboard-swipe-hint">
                      Swipe kiri atau kanan
                    </small>
                  </div>
                ) : (
                  <div className="leaderboard-hero-podium-empty">
                    Podium akan tampil setelah minimal tiga rider memiliki data.
                  </div>
                )}
              </div>

              <div className="leaderboard-hero-stats" aria-label="Ringkasan leaderboard">
                <div>
                  <Users aria-hidden="true" />
                  <span>
                    <small>Riders terdaftar</small>
                    <b><CountUpNumber value={riders.length} suffix=" Member" /></b>
                  </span>
                </div>
                <div>
                  <Gauge aria-hidden="true" />
                  <span>
                    <small>Akumulasi jarak</small>
                    <b><CountUpNumber value={totalKmSum} suffix=" KM" /></b>
                  </span>
                </div>
                <div>
                  <Crown aria-hidden="true" />
                  <span>
                    <small>Jarak terjauh</small>
                    <b><CountUpNumber value={riders[0]?.total_km || 0} suffix=" KM" /></b>
                  </span>
                </div>
                <div>
                  <Trophy aria-hidden="true" />
                  <span>
                    <small>Posisi kamu</small>
                    <b>
                      {myRank ? (
                        <CountUpNumber value={myRank} prefix="#" />
                      ) : (
                        "Belum ada"
                      )}
                    </b>
                  </span>
                </div>
              </div>
            </section>

            {/* Logged-in User Position Banner */}
            {myRider && myRank && (
              <section className="my-standing-card">
                <div className="my-standing-left">
                  <div className="my-standing-badge">
                    <Trophy />
                  </div>
                  <div className="my-standing-info">
                    <em>Posisi kamu</em>
                    <h3>
                      {myRider.full_name} ({myRider.member_external_id})
                    </h3>
                    <p>
                      {myRank === 1
                        ? "🔥 Luar biasa! Kamu memimpin klasemen saat ini."
                        : kmToNext > 0
                          ? `Kurang ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(kmToNext)} KM lagi untuk menyalip peringkat #${myRank - 1}.`
                          : "Pertahankan ritme berkendara dan catat ride log berikutnya!"}
                    </p>
                  </div>
                </div>
                <div className="my-standing-right">
                  <div className="my-standing-rank">
                    <small>PERINGKAT</small>
                    <b><CountUpNumber value={myRank} prefix="#" /></b>
                  </div>
                  <div className="my-standing-distance">
                    <small>TOTAL JARAK</small>
                    <b><CountUpNumber value={myRider.total_km} suffix=" KM" /></b>
                  </div>
                </div>
              </section>
            )}

            {/* Search Bar */}
            <div className="search-box member-search-bar">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari posisi rider berdasarkan nama atau RR-ID…"
              />
            </div>

            {/* Ranking List Table / Card Container */}
            <section className="leaderboard-container">
              <div className="leaderboard-list-header">
                <h3>
                  {query.trim()
                    ? `Hasil Pencarian (${remainingRiders.length})`
                    : "Peringkat Klasemen"}
                </h3>
                <span>
                  {query.trim()
                    ? `Menampilkan rider yang cocok dengan "${query}"`
                    : "Peringkat 4 dan seterusnya"}
                </span>
              </div>

              {remainingRiders.length === 0 ? (
                <p className="system-message leaderboard-inline-empty">
                  Tidak ada rider yang cocok dengan kata kunci &quot;{query}&quot;.
                </p>
              ) : (
                <div className="leaderboard-items">
                  {remainingRiders.map((r) => {
                    const originalRank =
                      rankByMemberId.get(r.member_external_id) ?? 0;
                    const isMe =
                      r.member_external_id === account?.member_external_id;
                    const percent = Math.min(
                      100,
                      Math.max(4, Math.round((r.total_km / maxKm) * 100)),
                    );

                    return (
                      <article
                        key={r.member_external_id}
                        className={`leaderboard-row ${isMe ? "my-row" : ""}`}
                      >
                        <span className="leaderboard-rank-num">
                          #{originalRank}
                        </span>
                        <div className="leaderboard-row-avatar">
                          {getInitials(r.full_name)}
                        </div>
                        <div className="leaderboard-row-main">
                          <div className="leaderboard-row-title">
                            <b className="leaderboard-row-name">{r.full_name}</b>
                            {isMe && (
                              <span className="leaderboard-row-you">Kamu</span>
                            )}
                          </div>
                          <span className="leaderboard-row-id">
                            {r.member_external_id}
                          </span>
                          <div
                            className="leaderboard-progress-container"
                            title={`${percent}% dari peringkat #1`}
                          >
                            <div
                              className="leaderboard-progress-fill"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <div className="leaderboard-row-km">
                          <Route />
                          <span>
                            {new Intl.NumberFormat("id-ID", {
                              maximumFractionDigits: 0,
                            }).format(r.total_km)}{" "}
                            KM
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <p className="last-updated">
          Data diperbarui secara live. Ride log pending atau ditolak tidak
          memengaruhi total kilometer.
        </p>
      </div>
    </AppShell>
  );
}

