"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { CountUpNumber } from "@/components/count-up-number";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { getRiderProgress } from "@/lib/rider-progression";
import {
  Bike,
  Calendar,
  CalendarDays,
  Check,
  Clock3,
  LogOut,
  MapPin,
  Pencil,
  QrCode,
  Route,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProfileRideHistory } from "./profile-ride-history";
import { useProfileScreenController } from "./profile-screen-controller";

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

export default function ProfilePage() {
  const {
    email,
    account,
    profile,
    detail,
    primaryMotorcycle,
    rides,
    rsvpActivities,
    activityEvents,
    loading,
    saving,
    message,
    error,
    nickname,
    motorcycle,
    city,
    profileEditOpen,
    setNickname,
    setMotorcycle,
    setCity,
    setProfileEditOpen,
    openProfileEdit,
    saveDetails,
    handleRideUpdated,
    logout,
  } = useProfileScreenController();

  const displayName =
    detail?.nickname_override ||
    profile?.nickname ||
    profile?.full_name ||
    account?.member_external_id ||
    "Member";

  const totalKm = Number(profile?.total_km || 0);

  if (loading) {
    return (
      <AppShell active="Profil" title="Profil Saya">
        <div className="profile-state-shell profile-loading-state" aria-live="polite" aria-busy="true">
          <PageSkeleton title="Memuat Kartu Anggota..." />
        </div>
      </AppShell>
    );
  }

  if (!email) {
    return (
      <AppShell active="Profil" title="Profil Saya">
        <div className="page-wrap profile-state-shell profile-access-state">
          <PageState
            tone="restricted"
            icon={<UserRound />}
            title="Belum masuk ke akun"
            description="Silakan masuk terlebih dahulu untuk membuka kartu anggota digital Revolt Riders."
            action={
              <a className="primary-action" href="/login">
                MASUK KE AKUN
              </a>
            }
          />
        </div>
      </AppShell>
    );
  }

  if (!account) {
    return (
      <AppShell active="Profil" title="Profil Saya">
        <div className="page-wrap profile-state-shell profile-verification-state">
          <PageState
            icon={<ShieldAlert />}
            title="Akun menunggu verifikasi pengurus"
            description={
              <>
                {email}
                <br />
                Pendaftaran Anda telah diterima. Pengurus akan segera memverifikasi dan menghubungkan akun dengan Member ID resmi.
              </>
            }
          />
        </div>
      </AppShell>
    );
  }

  const approvedRidesCount = rides.filter((r) => r.status === "approved").length;
  const attendedAgendaCount = rsvpActivities.filter((rsvp) => rsvp.status === "attending").length;
  const joinDate = profile?.join_date ? new Date(profile.join_date) : null;
  const joinYear =
    joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate.getFullYear() : null;

  const riderProgress = getRiderProgress({
    totalKm,
    approvedRideCount: approvedRidesCount,
    approvedRideDates: rides
      .filter((ride) => ride.status === "approved")
      .map((ride) => ride.created_at),
    attendedAgendaCount,
    activeMember: account.status === "active",
  });
  const previousKmMilestone = riderProgress.level.minKm;
  const nextKmMilestone = riderProgress.level.nextKm;
  const milestoneProgress = riderProgress.levelProgress;
  const remainingKmToMilestone = riderProgress.remainingKm;

  const badgeIcon = (key: string) => {
    if (key === "verified") return ShieldCheck;
    if (key === "streak-3") return Clock3;
    if (key.includes("agenda")) return CalendarDays;
    if (key.includes("road-")) return key === "road-1k" ? Route : Trophy;
    return Bike;
  };

  const passportBadges = riderProgress.badges
    .filter((badge) =>
      ["verified", "first-ride", "road-1k", "five-rides", "streak-3", "road-5k"].includes(
        badge.key,
      ),
    )
    .map((badge) => ({ ...badge, Icon: badgeIcon(badge.key) }));

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
                onClick={openProfileEdit}
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

        <ProfileRideHistory
          account={account}
          displayName={displayName}
          rides={rides}
          activityEvents={activityEvents}
          onRideUpdated={handleRideUpdated}
        />

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

    </AppShell>
  );
}
