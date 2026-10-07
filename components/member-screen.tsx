"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { ModalSheet } from "@/components/modal-sheet";
import { PageState } from "@/components/page-state";
import { RideLogEditModal } from "@/components/ride-log-edit-modal";
import { CardSkeleton, StatsGridSkeleton } from "@/components/skeleton";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { Compass, Gauge, Pencil, Plus, RefreshCw, Route, Search, ShieldAlert, Trash2, Users, UsersRound } from "lucide-react";
import Image from "next/image";

import { useMemberScreen } from "./use-member-screen";

export default function MemberPage() {

  const { confirmAction, user, authLoading, invalidateCache, members, query, setQuery, loading, error, selectedMember, sheetOpen, touringRecords, loadingTouring, touringError, setTouringError, editModalOpen, setEditModalOpen, editModalData, setEditModalData, loadMembers, filtered, totalKmCombined, totalVerifiedActivities, getInitials, getRoleClass, openDetail, closeDetail, canEditTouring, handleTourUpdated } = useMemberScreen();

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
              onClick={() => {
                invalidateCache("member_profiles_list");
                void loadMembers();
              }}
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
                  const roleClass = getRoleClass(m.club_role);
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
                        {getInitials(m.full_name, m.nickname)}
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

      {/* Modal Sheet Detail Member & Riwayat Touring */}
      <ModalSheet
        open={sheetOpen}
        onClose={closeDetail}
        eyebrow="REVOLT RIDERS · PROFIL"
        title={
          selectedMember
            ? `${selectedMember.nickname || selectedMember.full_name} (${selectedMember.member_external_id})`
            : "Detail Member"
        }
      >
        {selectedMember && (
          <div className="member-detail-sheet-content">
            {/* Header Hero Box */}
            <div className="member-detail-hero">
              <div className="member-detail-avatar">
                {getInitials(selectedMember.full_name, selectedMember.nickname)}
              </div>
              <div className="member-detail-hero-info">
                <div className="member-detail-title-row">
                  <h3 className="member-detail-name">
                    {selectedMember.full_name}
                  </h3>
                  <span
                    className={`member-role-badge ${getRoleClass(selectedMember.club_role)}`}
                  >
                    {selectedMember.club_role || "Member"}
                  </span>
                </div>
                <span className="member-detail-sub">
                  <span className="member-id-tag">
                    {selectedMember.member_external_id}
                  </span>
                  {selectedMember.nickname && (
                    <span>&bull; Panggilan: <b>{selectedMember.nickname}</b></span>
                  )}
                  {selectedMember.city && (
                    <span>&bull; {selectedMember.city}</span>
                  )}
                  {selectedMember.motorcycle && (
                    <span>&bull; {selectedMember.motorcycle}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="member-detail-stats-grid">
              <div className="member-detail-stat-box">
                <Gauge />
                <span>
                  <small>Total Kilometer</small>
                  <b>
                    <CountUpNumber
                      value={selectedMember.total_km}
                      maximumFractionDigits={1}
                      suffix=" KM"
                    />
                  </b>
                </span>
              </div>
              <div className="member-detail-stat-box">
                <Compass />
                <span>
                  <small>Riwayat Sowan / Agenda</small>
                  <b><CountUpNumber value={touringRecords.length} suffix=" Agenda" /></b>
                </span>
              </div>
            </div>

            {/* Biodata Info Card */}
            <div className="member-detail-bio-card">
              <dl className="member-detail-bio-list">
                <div className="member-detail-bio-item">
                  <dt>Domisili / Kota</dt>
                  <dd>
                    {selectedMember.city || "Situbondo"}
                  </dd>
                </div>
                <div className="member-detail-bio-item">
                  <dt>Kendaraan / Motor</dt>
                  <dd>
                    {selectedMember.motorcycle || "Belum dicatat"}
                  </dd>
                </div>
                <div className="member-detail-bio-item">
                  <dt>Bergabung Sejak</dt>
                  <dd>
                    {selectedMember.join_date_label || "Anggota Resmi"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Riwayat Touring Table */}
            <div className="member-touring-section">
              <div className="member-touring-header">
                <h4>Riwayat Touring & Sowan Terverifikasi</h4>
                <div className="member-touring-header-actions">
                  <span className="member-touring-count-badge">
                    {touringRecords.length} Kegiatan
                  </span>
                  {canEditTouring && (
                    <button
                      type="button"
                      className="member-add-tour-btn"
                      onClick={() => {
                        setEditModalData({
                          memberExternalId: selectedMember.member_external_id,
                          memberName:
                            selectedMember.nickname || selectedMember.full_name,
                          title: "",
                          km: 0,
                          date: new Date().toISOString().slice(0, 10),
                        });
                        setEditModalOpen(true);
                      }}
                    >
                      <Plus /> Tambah
                    </button>
                  )}
                </div>
              </div>

              {touringError ? (
                <p className="error-message" role="alert">{touringError}</p>
              ) : loadingTouring ? (
                <p className="system-message" role="status">Memuat riwayat kegiatan…</p>
              ) : touringRecords.length === 0 ? (
                <p className="system-message">
                  Belum ada catatan touring resmi atau check-in yang terdata di Supabase untuk member ini.
                </p>
              ) : (
                <div className="member-touring-table-wrap">
                  <table className="member-touring-table">
                    <thead>
                      <tr>
                        <th style={{ width: "38px" }}>No</th>
                        <th>Kegiatan / Destinasi</th>
                        <th style={{ textAlign: "right" }}>Jarak</th>
                        {canEditTouring && (
                          <th style={{ width: "68px", textAlign: "right" }}>
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {touringRecords.map((item) => (
                        <tr key={item.id}>
                          <td style={{ color: "var(--muted)", fontWeight: 700 }}>
                            {item.no}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                              {item.date && (
                                <small style={{ color: "var(--muted)", fontSize: "var(--rr-type-caption)" }}>
                                  {new Intl.DateTimeFormat("id-ID", {
                                    dateStyle: "medium",
                                  }).format(new Date(item.date))}
                                </small>
                              )}
                              {item.odometer_start !== null && item.odometer_end !== null && item.odometer_start !== undefined && item.odometer_end !== undefined && (
                                <small style={{ color: "#6c757d", fontSize: "var(--rr-type-caption)", background: "#f8f9fa", padding: "0 4px", borderRadius: "3px", border: "1px solid #e9ecef" }}>
                                  Odo: {item.odometer_start} → {item.odometer_end}
                                </small>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {item.km !== null ? (
                              <span className="member-touring-km-tag">
                                {new Intl.NumberFormat("id-ID", {
                                  maximumFractionDigits: 1,
                                }).format(item.km)}{" "}
                                km
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>—</span>
                            )}
                          </td>
                          {canEditTouring && (
                            <td className="member-tour-action-cell">
                              {item.source === "ride_log" ? (
                                <div className="member-tour-action-group">
                                  <button
                                    type="button"
                                    className="member-tour-action"
                                    title="Edit riwayat touring"
                                    onClick={() => {
                                      const rawId = item.id.replace(/^ride-/, "");
                                      setEditModalData({
                                        id: rawId,
                                        memberExternalId:
                                          selectedMember.member_external_id,
                                        memberName:
                                          selectedMember.nickname ||
                                          selectedMember.full_name,
                                        title: item.title,
                                        km: item.km || 0,
                                        date:
                                          item.date ||
                                          new Date().toISOString().slice(0, 10),
                                      });
                                      setEditModalOpen(true);
                                    }}
                                  >
                                    <Pencil />
                                  </button>
                                  <button
                                    type="button"
                                    className="member-tour-action delete"
                                    title="Hapus riwayat touring"
                                    onClick={async () => {
                                      const confirmed = await confirmAction({
                                        title: "Hapus riwayat touring?",
                                        description: `Catatan "${item.title}" akan dihapus permanen.`,
                                        confirmLabel: "Hapus Riwayat",
                                        cancelLabel: "Batal",
                                        destructive: true,
                                      });
                                      if (!confirmed) return;

                                      const rawId = item.id.replace(/^ride-/, "");
                                      setTouringError("");
                                      try {
                                        const res = await deleteRideLog(
                                          rawId,
                                          selectedMember.member_external_id,
                                        );
                                        handleTourUpdated(res.totalKm);
                                      } catch (err) {
                                        setTouringError(
                                          err instanceof Error
                                            ? err.message
                                            : "Gagal menghapus riwayat.",
                                        );
                                      }
                                    }}
                                  >
                                    <Trash2 />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  title="Berasal dari check-in agenda"
                                  style={{
                                    fontSize: "var(--rr-type-caption)",
                                    color: "var(--muted)",
                                  }}
                                >
                                  Check-in
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalSheet>

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editModalData}
        onSaved={(km) => handleTourUpdated(km)}
        onDeleted={(km) => handleTourUpdated(km)}
      />
    </AppShell>
  );
}
