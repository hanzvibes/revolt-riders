"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { PageState } from "@/components/page-state";
import { CardSkeleton, StatsGridSkeleton } from "@/components/skeleton";
import {
  Compass,
  Gauge,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Users,
  UsersRound,
} from "lucide-react";
import Image from "next/image";

import { MemberDetailSheet } from "./member-detail-sheet";
import {
  getMemberInitials,
  getMemberRoleClass,
} from "./member-model";
import { useMemberScreenController } from "./member-screen-controller";

export default function MemberPage() {
  const {
    user,
    authLoading,
    members,
    query,
    loading,
    error,
    selectedMember,
    sheetOpen,
    touringRecords,
    loadingTouring,
    touringError,
    editModalOpen,
    editModalData,
    filtered,
    totalKmCombined,
    totalVerifiedActivities,
    canEditTouring,
    setQuery,
    setEditModalOpen,
    refreshMembers,
    openDetail,
    closeDetail,
    openCreateTour,
    openEditTour,
    removeTour,
    handleTourUpdated,
  } = useMemberScreenController();

  return (
    <AppShell active="Member" title="Direktori Member">
      <div className="page-wrap">
        <section className="member-directory-hero" aria-labelledby="member-directory-title">
          <div className="member-directory-hero-top">
            <div className="member-directory-brand">
              <div className="member-directory-brand-mark" aria-hidden="true">
                <UsersRound />
              </div>
              <div>
                <small>DIREKTORI MEMBER</small>
                <strong>Revolt Riders</strong>
                <span>Internal member hub</span>
              </div>
            </div>

            <button
              type="button"
              className="member-directory-refresh member-directory-refresh-top"
              onClick={refreshMembers}
              disabled={loading}
            >
              <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
              <span>{loading ? "Memuat data" : "Refresh data"}</span>
            </button>
          </div>

          <div className="member-directory-hero-main">
            <div className="member-directory-hero-copy">
              <div className="member-directory-eyebrow">
                <em>Member directory</em>
              </div>
              <h2 id="member-directory-title">Member Revolt</h2>
              <p>
                Data member resmi, kilometer riding, dan aktivitas terverifikasi
                dalam satu direktori internal.
              </p>
            </div>

            <div className="member-directory-watermark" aria-hidden="true">
              <Image
                src="/revolt-riders-logo.jpg"
                alt=""
                width={220}
                height={220}
              />
            </div>
          </div>

          <div className="member-directory-hero-stats" aria-label="Ringkasan member">
            <div>
              <Users aria-hidden="true" />
              <span>
                <small>Total member</small>
                <b>
                  {user && !authLoading ? (
                    <CountUpNumber value={members.length} suffix=" Riders" />
                  ) : (
                    "Privat"
                  )}
                </b>
              </span>
            </div>
            <div>
              <Gauge aria-hidden="true" />
              <span>
                <small>Total kilometer</small>
                <b>
                  {user && !authLoading ? (
                    <CountUpNumber value={totalKmCombined} suffix=" KM" />
                  ) : (
                    "Privat"
                  )}
                </b>
              </span>
            </div>
            <div>
              <Compass aria-hidden="true" />
              <span>
                <small>Kegiatan terverifikasi</small>
                <b>
                  {user && !authLoading ? (
                    <CountUpNumber value={totalVerifiedActivities} suffix=" Agenda" />
                  ) : (
                    "Privat"
                  )}
                </b>
              </span>
            </div>
          </div>
        </section>

        {!user && !authLoading ? (
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akses member internal"
            description="Silakan masuk ke akun Anda untuk melihat direktori lengkap member komunitas."
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
            icon={<UsersRound />}
            title="Direktori member belum dapat dimuat"
            description={error}
          />
        ) : (
          <>
            <div className="search-box member-search-bar">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, panggilan, jabatan, motor, kota, atau RR-ID…"
              />
            </div>

            {filtered.length === 0 ? (
              <PageState
                compact
                icon={<UsersRound />}
                title="Tidak ada member ditemukan"
                description={
                  <>Tidak ada hasil yang sesuai dengan kata kunci &quot;{query}&quot;.</>
                }
              />
            ) : (
              <div className="member-grid">
                {filtered.map((m) => {
                  const displayName = m.nickname ? m.nickname : m.full_name;
                  const secondaryName = m.nickname ? m.full_name : null;
                  const roleName = m.club_role || "Member";
                  const roleClass = getMemberRoleClass(m.club_role);
                  const subParts = [secondaryName, m.motorcycle, m.city].filter(Boolean);

                  return (
                    <button
                      type="button"
                      className="member-card"
                      key={m.member_external_id}
                      onClick={() => void openDetail(m)}
                      aria-label={`Lihat detail ${m.full_name}`}
                    >
                      <div className="member-avatar">
                        {getMemberInitials(m.full_name, m.nickname)}
                      </div>
                      <div className="member-info">
                        <div className="member-header-row">
                          <span className="member-name" title={displayName}>
                            {displayName}
                          </span>
                          <span className={`member-role-badge ${roleClass}`}>
                            {roleName}
                          </span>
                        </div>
                        <span
                          className="member-sub"
                          title={subParts.join(" · ") || "Revolt Riders"}
                        >
                          {subParts.join(" · ") || "Revolt Riders"}
                        </span>
                        <div className="member-meta-row">
                          <span className="member-id-tag">
                            {m.member_external_id}
                          </span>
                          {m.touring_count > 0 && (
                            <span className="member-tour-count">
                              <Compass />
                              {m.touring_count} Sowan
                            </span>
                          )}
                          <span className="member-km-tag">
                            <Route />
                            {new Intl.NumberFormat("id-ID", {
                              maximumFractionDigits: 1,
                            }).format(m.total_km)}{" "}
                            km
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      <MemberDetailSheet
        selectedMember={selectedMember}
        sheetOpen={sheetOpen}
        touringRecords={touringRecords}
        loadingTouring={loadingTouring}
        touringError={touringError}
        canEditTouring={canEditTouring}
        editModalOpen={editModalOpen}
        editModalData={editModalData}
        onClose={closeDetail}
        onEditModalOpenChange={setEditModalOpen}
        onCreateTour={openCreateTour}
        onEditTour={openEditTour}
        onRemoveTour={removeTour}
        onTourUpdated={handleTourUpdated}
      />

    </AppShell>
  );
}
