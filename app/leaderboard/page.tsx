"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { CardSkeleton, StatsGridSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
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
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akses leaderboard internal</h2>
            <p>
              Silakan masuk ke akun Anda untuk melihat klasemen jarak tempuh
              member Revolt Riders.
            </p>
            <a className="primary-action" href="/login">
              MASUK KE AKUN
            </a>
          </section>
        ) : loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <StatsGridSkeleton count={3} />
            <CardSkeleton height="280px" />
          </div>
        ) : error ? (
          <section className="empty-state card">
            <Gauge />
            <h2>{error}</h2>
            <p>Terjadi kendala saat menyinkronkan data klasemen.</p>
          </section>
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
                  <div className="leaderboard-hero-podium" aria-label="Tiga rider teratas">
                    <article className="leaderboard-hero-podium-card rank-2">
                      <div className="leaderboard-hero-rank-icon" aria-hidden="true">
                        <Medal />
                      </div>
                      <div className="leaderboard-hero-avatar">
                        {getInitials(top3[1].full_name)}
                      </div>
                      <span className="leaderboard-hero-rank-label">#2</span>
                      <strong title={top3[1].full_name}>{top3[1].full_name}</strong>
                      <small>{top3[1].member_external_id}</small>
                      <b>
                        <CountUpNumber value={top3[1].total_km} suffix=" KM" />
                      </b>
                    </article>

                    <article className="leaderboard-hero-podium-card rank-1">
                      <div className="leaderboard-hero-rank-icon" aria-hidden="true">
                        <Crown />
                      </div>
                      <div className="leaderboard-hero-avatar">
                        {getInitials(top3[0].full_name)}
                      </div>
                      <span className="leaderboard-hero-rank-label">#1</span>
                      <strong title={top3[0].full_name}>{top3[0].full_name}</strong>
                      <small>{top3[0].member_external_id}</small>
                      <b>
                        <CountUpNumber value={top3[0].total_km} suffix=" KM" />
                      </b>
                    </article>

                    <article className="leaderboard-hero-podium-card rank-3">
                      <div className="leaderboard-hero-rank-icon" aria-hidden="true">
                        <Medal />
                      </div>
                      <div className="leaderboard-hero-avatar">
                        {getInitials(top3[2].full_name)}
                      </div>
                      <span className="leaderboard-hero-rank-label">#3</span>
                      <strong title={top3[2].full_name}>{top3[2].full_name}</strong>
                      <small>{top3[2].member_external_id}</small>
                      <b>
                        <CountUpNumber value={top3[2].total_km} suffix=" KM" />
                      </b>
                    </article>
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
                <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    Tidak ada rider yang cocok dengan kata kunci &quot;{query}&quot;.
                  </p>
                </div>
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

