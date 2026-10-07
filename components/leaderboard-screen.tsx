"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { PageState } from "@/components/page-state";
import { CardSkeleton, StatsGridSkeleton } from "@/components/skeleton";
import {
  Crown,
  Gauge,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";

import { LeaderboardTopStack } from "./leaderboard-top-stack";
import { getLeaderboardInitials } from "./leaderboard-model";
import { useLeaderboardController } from "./leaderboard-controller";

export default function LeaderboardPage() {
  const {
    user,
    account,
    authLoading,
    riders,
    query,
    activeTopIndex,
    loading,
    error,
    maxKm,
    totalKmSum,
    myRank,
    myRider,
    kmToNext,
    rankByMemberId,
    top3,
    top3Stack,
    remainingRiders,
    setQuery,
    setActiveTopIndex,
    rotateTopStack,
    refreshLeaderboard,
  } = useLeaderboardController();

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
                  onClick={refreshLeaderboard}
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

                <LeaderboardTopStack
                  top3={top3}
                  top3Stack={top3Stack}
                  activeTopIndex={activeTopIndex}
                  onActiveIndexChange={setActiveTopIndex}
                  onRotate={rotateTopStack}
                />
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
                          {getLeaderboardInitials(r.full_name)}
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

