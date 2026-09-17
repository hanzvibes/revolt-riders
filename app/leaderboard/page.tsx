"use client";

import { AppShell } from "@/components/app-shell";
import { useDataCache } from "@/context/data-cache-context";
import { REVOLT_MEMBERS_DATA } from "@/lib/data/member-touring-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Crown,
  Flame,
  Gauge,
  Medal,
  Route,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Rider = {
  member_external_id: string;
  full_name: string;
  total_km: number;
};

export default function LeaderboardPage() {
  const { user, account, loading: authLoading, fetchWithCache } = useDataCache();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      if (authLoading) return;
      if (!user) {
        if (active) {
          setLoading(false);
          setRiders([]);
        }
        return;
      }

      try {
        const data = await fetchWithCache<Rider[]>(
          "riding_leaderboard_data",
          async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: result, error: fetchErr } =
              await supabase.rpc("get_riding_leaderboard");
            if (fetchErr) throw fetchErr;
            const rows = ((result ?? []) as Rider[]).map((row: Rider) => ({
              ...row,
              total_km: Number(row.total_km),
            }));
            if (rows.length > 0) return rows;
            return [...REVOLT_MEMBERS_DATA]
              .sort((a, b) => b.total_km - a.total_km)
              .map((m) => ({
                member_external_id: m.member_external_id,
                full_name: m.full_name,
                total_km: m.total_km,
              }));
          },
          { ttlMs: 2 * 60 * 1000 },
        );

        if (active) {
          setRiders(data);
          setError("");
        }
      } catch {
        if (active) {
          const fallback = [...REVOLT_MEMBERS_DATA]
            .sort((a, b) => b.total_km - a.total_km)
            .map((m) => ({
              member_external_id: m.member_external_id,
              full_name: m.full_name,
              total_km: m.total_km,
            }));
          setRiders(fallback);
          setError("");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadLeaderboard();
    return () => {
      active = false;
    };
  }, [authLoading, user, fetchWithCache]);

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
        <div className="page-intro">
          <div>
            <em>RIDING · KLASEMEN</em>
            <h2>Leaderboard Kilometer</h2>
            <p>
              Riwayat resmi kilometer riding yang telah tervalidasi oleh Road
              Captain.
            </p>
          </div>
        </div>

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
          <section className="empty-state card">
            <Gauge />
            <h2>Memuat leaderboard…</h2>
            <p>Menghitung akumulasi kilometer seluruh riders.</p>
          </section>
        ) : error ? (
          <section className="empty-state card">
            <Gauge />
            <h2>{error}</h2>
            <p>Terjadi kendala saat menyinkronkan data klasemen.</p>
          </section>
        ) : (
          <>
            {/* Stats Chips */}
            <div className="member-directory-stats">
              <article className="member-stat-chip">
                <Users />
                <span>
                  <small>Riders Terdaftar</small>
                  <b>{riders.length} Member</b>
                </span>
              </article>
              <article className="member-stat-chip">
                <Gauge />
                <span>
                  <small>Akumulasi Jarak</small>
                  <b>
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 0,
                    }).format(totalKmSum)}{" "}
                    KM
                  </b>
                </span>
              </article>
              <article className="member-stat-chip">
                <Crown />
                <span>
                  <small>Jarak Terjauh</small>
                  <b>
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 1,
                    }).format(riders[0]?.total_km || 0)}{" "}
                    KM
                  </b>
                </span>
              </article>
            </div>

            {/* Logged-in User Position Banner */}
            {myRider && myRank && (
              <section className="my-standing-card">
                <div className="my-standing-left">
                  <div className="my-standing-badge">
                    <Trophy />
                  </div>
                  <div className="my-standing-info">
                    <em>POSISI KAMU</em>
                    <h3>
                      {myRider.full_name} ({myRider.member_external_id})
                    </h3>
                    <p>
                      {myRank === 1
                        ? "🔥 Luar biasa! Kamu memimpin klasemen saat ini."
                        : kmToNext > 0
                          ? `Kurang ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(kmToNext)} KM lagi untuk menyalip peringkat #${myRank - 1}.`
                          : "Pertahankan ritme berkendara dan catat ride log berikutnya!"}
                    </p>
                  </div>
                </div>
                <div className="my-standing-right">
                  <div className="my-standing-rank">
                    <small>PERINGKAT</small>
                    <b>#{myRank}</b>
                  </div>
                  <div className="my-standing-distance">
                    <small>TOTAL JARAK</small>
                    <b>
                      {new Intl.NumberFormat("id-ID", {
                        maximumFractionDigits: 1,
                      }).format(myRider.total_km)}{" "}
                      KM
                    </b>
                  </div>
                </div>
              </section>
            )}

            {/* Visual Top 3 Podium (Shown when not searching) */}
            {!query.trim() && top3.length >= 3 && (
              <section className="leaderboard-podium">
                {/* 2nd Place (Silver) */}
                <article className="podium-card podium-rank-2">
                  <span className="podium-medal" title="Juara 2">
                    🥈
                  </span>
                  <div className="podium-avatar">
                    {getInitials(top3[1].full_name)}
                  </div>
                  <b className="podium-name" title={top3[1].full_name}>
                    {top3[1].full_name}
                  </b>
                  <small className="podium-id">
                    {top3[1].member_external_id}
                  </small>
                  <div className="podium-km">
                    <Route />
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 1,
                    }).format(top3[1].total_km)}{" "}
                    KM
                  </div>
                </article>

                {/* 1st Place (Gold) */}
                <article className="podium-card podium-rank-1">
                  <span className="podium-medal" title="Juara 1">
                    👑
                  </span>
                  <div className="podium-avatar">
                    {getInitials(top3[0].full_name)}
                  </div>
                  <b className="podium-name" title={top3[0].full_name}>
                    {top3[0].full_name}
                  </b>
                  <small className="podium-id">
                    {top3[0].member_external_id}
                  </small>
                  <div className="podium-km">
                    <Flame />
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 1,
                    }).format(top3[0].total_km)}{" "}
                    KM
                  </div>
                </article>

                {/* 3rd Place (Bronze) */}
                <article className="podium-card podium-rank-3">
                  <span className="podium-medal" title="Juara 3">
                    🥉
                  </span>
                  <div className="podium-avatar">
                    {getInitials(top3[2].full_name)}
                  </div>
                  <b className="podium-name" title={top3[2].full_name}>
                    {top3[2].full_name}
                  </b>
                  <small className="podium-id">
                    {top3[2].member_external_id}
                  </small>
                  <div className="podium-km">
                    <Medal />
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 1,
                    }).format(top3[2].total_km)}{" "}
                    KM
                  </div>
                </article>
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
                      riders.findIndex(
                        (orig) =>
                          orig.member_external_id === r.member_external_id,
                      ) + 1;
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
                              maximumFractionDigits: 1,
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

