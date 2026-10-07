"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { CountUpNumber } from "@/components/count-up-number";
import { RideLogEditModal } from "@/components/ride-log-edit-modal";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { Bike, Calendar, CalendarDays, Check, LogOut, MapPin, Pencil, Plus, QrCode, Route, ShieldCheck, Trash2, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Ride, getRoleClass } from "./profile-screen-model";

import { ProfileLoadingState, ProfileLoginState, ProfileVerificationState } from "./profile-access-states";

import { useProfileScreen } from "./use-profile-screen";

export default function ProfilePage() {

  const { confirmAction, email, account, profile, detail, primaryMotorcycle, rides, loading, saving, message, setMessage, error, setError, rideActionError, setRideActionError, nickname, setNickname, motorcycle, setMotorcycle, city, setCity, profileEditOpen, setProfileEditOpen, editModalOpen, setEditModalOpen, editModalData, setEditModalData, displayName, totalKm, eventTitleById, handleRideUpdated, saveDetails, logout, approvedRidesCount, attendedAgendaCount, joinDate, joinYear, riderProgress, previousKmMilestone, nextKmMilestone, milestoneProgress, remainingKmToMilestone, passportBadges } = useProfileScreen();

  if (loading) return <ProfileLoadingState />;
  if (!email) return <ProfileLoginState />;
  if (!account) return <ProfileVerificationState email={email} />;

  return (
    <AppShell active="Profil" title="Profil Saya">
      <div className="page-wrap profile-social-page">
        {/* ================================================================ */}
        {/* SOCIAL MEMBER PROFILE */}
        {/* ================================================================ */}
        <section className="profile-social-card" aria-labelledby="profile-social-name">
          <div className="profile-social-cover">
            <Image
              src="/revolt-riders-logo.jpg"
              alt=""
              width={180}
              height={180}
              priority={false}
            />
            <span>REVOLT RIDERS · MEMBER NETWORK</span>
          </div>

          <div className="profile-social-body">
            <div className="profile-social-avatar-row">
              <div className="profile-social-avatar" aria-hidden="true">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <button
                type="button"
                className="profile-social-edit"
                onClick={() => {
                  setMessage("");
                  setError("");
                  setProfileEditOpen(true);
                }}
              >
                <Pencil aria-hidden="true" />
                Edit profil
              </button>
            </div>

            <div className="profile-social-intro">
              <div className="profile-social-name-row">
                <h2 id="profile-social-name">{displayName}</h2>
                <ShieldCheck aria-label="Member terverifikasi" />
              </div>
              {profile?.full_name && profile.full_name !== displayName ? (
                <p className="profile-social-full-name">{profile.full_name}</p>
              ) : null}

              <div className="profile-social-handle-row">
                <code>@{account.member_external_id}</code>
                {profile?.club_role ? (
                  <span className={`member-role-badge ${getRoleClass(profile.club_role)}`}>
                    {profile.club_role}
                  </span>
                ) : null}
                <span className="profile-social-active">
                  <ShieldCheck aria-hidden="true" />
                  Active
                </span>
              </div>

              <p className="profile-social-bio">
                Rider Revolt Riders · Your Motorcycle, Yourself Expression.
              </p>

              <div className="profile-social-meta" aria-label="Informasi member">
                <span>
                  <MapPin aria-hidden="true" />
                  {city || profile?.city || "Domisili belum diisi"}
                </span>
                <span>
                  <Bike aria-hidden="true" />
                  {primaryMotorcycle
                    ? primaryMotorcycle.nickname ||
                      `${primaryMotorcycle.brand} ${primaryMotorcycle.model}`
                    : motorcycle || detail?.motorcycle || "Motor belum diisi"}
                </span>
                <span>
                  <Calendar aria-hidden="true" />
                  {joinDate && joinYear
                    ? `Bergabung ${new Intl.DateTimeFormat("id-ID", {
                        month: "short",
                        year: "numeric",
                      }).format(joinDate)}`
                    : "Member resmi"}
                </span>
              </div>
            </div>

            <div className="profile-social-stats" aria-label="Statistik member">
              <a href="#profile-activity">
                <strong>
                  <CountUpNumber value={totalKm} maximumFractionDigits={1} />
                </strong>
                <span>KM resmi</span>
              </a>
              <a href="#profile-activity">
                <strong><CountUpNumber value={approvedRidesCount} /></strong>
                <span>Ride approved</span>
              </a>
              <Link href="/agenda">
                <strong><CountUpNumber value={attendedAgendaCount} /></strong>
                <span>Agenda hadir</span>
              </Link>
            </div>

            <nav className="profile-social-actions" aria-label="Akses cepat member">
              <Link href="/riding">
                <Bike aria-hidden="true" />
                <span>Riding</span>
              </Link>
              <Link href="/agenda">
                <CalendarDays aria-hidden="true" />
                <span>Agenda</span>
              </Link>
              <Link href="/leaderboard">
                <Trophy aria-hidden="true" />
                <span>Ranking</span>
              </Link>
              <Link href="/check-in">
                <QrCode aria-hidden="true" />
                <span>Check-in</span>
              </Link>
            </nav>
          </div>
        </section>

        <div className="profile-social-grid">
          <section className="member-passport-progress profile-social-progress" aria-label="Progress member">
            <div className="member-passport-progress-head">
              <span>
                <small>ROAD LEVEL {String(riderProgress.level.level).padStart(2, "0")}</small>
                <strong>{riderProgress.level.title}</strong>
              </span>
              <b>{nextKmMilestone ? `${Math.round(milestoneProgress)}%` : "MAX"}</b>
            </div>

            <div
              className="member-passport-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(milestoneProgress)}
              aria-label="Progress menuju milestone kilometer berikutnya"
            >
              <i style={{ width: `${milestoneProgress}%` }} />
            </div>

            <div className="member-passport-progress-scale">
              <small>
                {previousKmMilestone > 0
                  ? `${new Intl.NumberFormat("id-ID").format(previousKmMilestone)} KM`
                  : "START"}
              </small>
              <small>
                {nextKmMilestone
                  ? `${new Intl.NumberFormat("id-ID").format(nextKmMilestone)} KM`
                  : "MAX"}
              </small>
            </div>

            <div className="member-passport-progress-callout">
              <Route aria-hidden="true" />
              <span>
                <b>
                  {nextKmMilestone
                    ? `${new Intl.NumberFormat("id-ID", {
                        maximumFractionDigits: 1,
                      }).format(remainingKmToMilestone)} KM lagi`
                    : "Road milestone complete"}
                </b>
                <small>
                  {nextKmMilestone
                    ? `menuju level berikutnya · ${riderProgress.streakMonths} bulan ride streak`
                    : `level tertinggi · ${riderProgress.streakMonths} bulan ride streak`}
                </small>
              </span>
            </div>
          </section>

          <section className="member-passport-achievements profile-social-achievements" aria-label="Milestone member">
            <div className="member-passport-achievements-head">
              <span>
                <small>ACHIEVEMENTS</small>
                <strong>Milestone Member</strong>
              </span>
              <b>
                {passportBadges.filter((badge) => badge.unlocked).length}
                <span>/{passportBadges.length}</span>
              </b>
            </div>

            <div className="member-passport-timeline">
              {passportBadges.map(({ key, label, detail: badgeDetail, unlocked, Icon }) => (
                <article
                  key={key}
                  className={unlocked ? "is-unlocked" : "is-locked"}
                  aria-label={`${label}: ${unlocked ? "tercapai" : "belum tercapai"}`}
                >
                  <i aria-hidden="true"><Icon /></i>
                  <span>
                    <b>{label}</b>
                    <small>{badgeDetail}</small>
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>

        {/* ================================================================ */}
        {/* SECTION RIWAYAT SOWAN & TOURING */}
        {/* ================================================================ */}
        <section id="profile-activity" className="card profile-social-feed">
          <div
            className="section-title"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
          >
            <span>
              <em>Riding & sowan</em>
              <h3>Riwayat Touring / Sowan ({rides.length})</h3>
            </span>
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                setEditModalData({
                  memberExternalId: account.member_external_id,
                  memberName: displayName,
                  title: "",
                  km: 0,
                  date: new Date().toISOString().slice(0, 10),
                });
                setEditModalOpen(true);
              }}
              style={{ paddingInline: "14px" }}
            >
              <Plus size={14} /> Catat Riwayat
            </button>
          </div>

          {rideActionError ? (
            <p className="error-message" role="alert">{rideActionError}</p>
          ) : null}
          {rides.length === 0 ? (
            <p className="system-message">Belum ada riwayat sowan / ride log yang dicatat.</p>
          ) : (
            <div className="activity-list" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {rides.map((ride) => {
                const eventTitle = ride.event_id ? eventTitleById.get(ride.event_id) : null;
                const displayTitle = ride.title || eventTitle || "Ride Mandiri";
                const isApproved = ride.status === "approved";
                const isPending = ride.status === "pending";

                return (
                  <article
                    key={ride.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 12px",
                      borderTop: "1px solid var(--line)",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <i
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: isApproved ? "#edf8f1" : isPending ? "#fef3c7" : "#fff0f1",
                          color: isApproved ? "#158050" : isPending ? "#b45309" : "#dc2626",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Route size={16} />
                      </i>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                          {displayTitle}
                        </b>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                          <small style={{ color: "var(--muted)", fontSize: "0.68rem" }}>
                            {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(ride.created_at))} ·{" "}
                            {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Number(ride.distance_km || 0))} KM
                          </small>
                          {ride.odometer_start !== null && ride.odometer_end !== null && (
                            <small
                              style={{
                                color: "#6c757d",
                                fontSize: "var(--rr-type-caption)",
                                background: "#f1f3f5",
                                padding: "1px 5px",
                                border: "1px solid #e9ecef",
                                borderRadius: "4px",
                              }}
                            >
                              Odo {ride.odometer_start} → {ride.odometer_end}
                            </small>
                          )}
                          {eventTitle && (
                            <small
                              style={{
                                color: "var(--red)",
                                fontSize: "var(--rr-type-caption)",
                                background: "#fff5f5",
                                padding: "1px 5px",
                                border: "1px solid #ffe3e3",
                                borderRadius: "4px",
                                fontWeight: 700,
                              }}
                            >
                              {eventTitle}
                            </small>
                          )}
                        </div>
                        {ride.status === "rejected" && ride.rejection_reason && (
                          <small style={{ color: "#dc1b2a", display: "block", marginTop: "4px", fontSize: "0.65rem", fontWeight: 700 }}>
                            ⚠️ Alasan ditolak: {ride.rejection_reason}
                          </small>
                        )}
                      </span>
                    </div>

                    <div className="profile-ride-controls">
                      {!isApproved ? (
                        <span
                          className={`profile-ride-status ${isPending ? "pending" : "rejected"}`}
                        >
                          {isPending ? "Pending" : "Ditolak"}
                        </span>
                      ) : null}

                      <button
                        type="button"
                        className="profile-ride-action"
                        title="Edit catatan ini"
                        aria-label={`Edit catatan ${displayTitle}`}
                        onClick={() => {
                          setRideActionError("");
                          setEditModalData({
                            id: ride.id,
                            memberExternalId: account.member_external_id,
                            memberName: displayName,
                            title: ride.title || eventTitle || "Ride Mandiri",
                            km: Number(ride.distance_km || 0),
                            date: ride.created_at ? ride.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                          });
                          setEditModalOpen(true);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="profile-ride-action delete"
                        title="Hapus catatan ini"
                        aria-label={`Hapus catatan ${displayTitle}`}
                        onClick={async () => {
                          const confirmed = await confirmAction({
                            title: "Hapus catatan riding?",
                            description: `Catatan "${displayTitle}" akan dihapus permanen.`,
                            confirmLabel: "Hapus Catatan",
                            cancelLabel: "Batal",
                            destructive: true,
                          });
                          if (!confirmed) return;

                          setRideActionError("");
                          try {
                            await deleteRideLog(
                              ride.id,
                              account.member_external_id,
                            );
                            await handleRideUpdated();
                          } catch (caught) {
                            setRideActionError(
                              caught instanceof Error
                                ? caught.message
                                : "Gagal menghapus catatan riding.",
                            );
                          }
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* LOGOUT BUTTON */}
        <div className="profile-social-logout">
          <button type="button" className="dark-action profile-social-logout-button" onClick={logout}>
            <LogOut aria-hidden="true" />
            KELUAR DARI AKUN
          </button>
        </div>
      </div>

      <ModalSheet
        open={profileEditOpen}
        onClose={() => setProfileEditOpen(false)}
        eyebrow="Data pribadi"
        title="Lengkapi Profil & Kendaraan"
      >
        <div className="profile-edit profile-edit-sheet">
          <p className="profile-edit-sheet-copy">
            Perbarui nama panggilan, motor, dan kota domisili. Data ini tampil pada identitas member.
          </p>
          <form onSubmit={saveDetails}>
            <label>
              Nama Panggilan
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={40}
                placeholder="Contoh: Rafly"
              />
            </label>
            <label>
              Motor
              <input
                value={motorcycle}
                onChange={(event) => setMotorcycle(event.target.value)}
                maxLength={120}
                placeholder="Contoh: Honda CB150R, Yamaha XSR 155"
              />
            </label>
            <label>
              Kota Domisili
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                maxLength={100}
                placeholder="Contoh: Situbondo, Bondowoso"
              />
            </label>
            {message ? (
              <p className="success-message" role="status" aria-live="polite">
                <Check aria-hidden="true" />
                {message}
              </p>
            ) : null}
            {error ? <p className="error-message" role="alert">{error}</p> : null}
            <button className="primary-action" disabled={saving}>
              {saving ? "MENYIMPAN…" : "SIMPAN PROFIL"}
            </button>
          </form>
        </div>
      </ModalSheet>

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editModalData}
        onSaved={() => void handleRideUpdated()}
        onDeleted={() => void handleRideUpdated()}
      />
    </AppShell>
  );
}
