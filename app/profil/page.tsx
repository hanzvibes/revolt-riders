"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { CountUpNumber } from "@/components/count-up-number";
import { RideLogEditModal, type RideLogEditData } from "@/components/ride-log-edit-modal";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getRiderProgress } from "@/lib/rider-progression";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  Calendar,
  CalendarDays,
  Check,
  Clock3,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Route,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Account = { member_external_id: string; role: string; status: string };
type Profile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
  join_date: string | null;
  club_role: string | null;
  total_km: number;
};
type Detail = {
  nickname_override: string | null;
  motorcycle: string | null;
  city_override: string | null;
};
type PrimaryMotorcycle = {
  nickname: string | null;
  brand: string;
  model: string;
};
type Ride = {
  id: string;
  event_id: string | null;
  title: string | null;
  status: "pending" | "approved" | "rejected";
  distance_km: number | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
  created_at: string;
  rejection_reason: string | null;
};
type RideRow = Omit<Ride, "distance_km" | "odometer_start" | "odometer_end"> & {
  distance_km: number | string | null;
  odometer_start?: number | string | null;
  odometer_end?: number | string | null;
};
type RsvpActivity = {
  event_id: string;
  status: "attending" | "declined" | "maybe";
  responded_at: string;
};
type ActivityEvent = { id: string; title: string };
type ProfileSnapshot = {
  profile: Profile | null;
  detail: Detail | null;
  primaryMotorcycle: PrimaryMotorcycle | null;
  rides: Ride[];
  rsvpActivities: RsvpActivity[];
  activityEvents: ActivityEvent[];
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

export default function ProfilePage() {
  const { confirmAction } = useActionDialog();
  const router = useRouter();
  const { user, account: accessAccount, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [primaryMotorcycle, setPrimaryMotorcycle] = useState<PrimaryMotorcycle | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [rsvpActivities, setRsvpActivities] = useState<RsvpActivity[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rideActionError, setRideActionError] = useState("");
  const [nickname, setNickname] = useState("");
  const [motorcycle, setMotorcycle] = useState("");
  const [city, setCity] = useState("");
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<RideLogEditData | null>(null);

  const displayName =
    detail?.nickname_override ||
    profile?.nickname ||
    profile?.full_name ||
    account?.member_external_id ||
    "Member";

  // Single Source of Truth for Total KM (no double counting)
  const totalKm = Number(profile?.total_km || 0);
  const eventTitleById = useMemo(
    () => new Map(activityEvents.map((event) => [event.id, event.title])),
    [activityEvents]
  );

  const load = useCallback(async (forceRefresh = false) => {
    if (accessLoading) return;

    if (!user) {
      setEmail("");
      setAccount(null);
      setProfile(null);
      setDetail(null);
      setPrimaryMotorcycle(null);
      setRides([]);
      setRsvpActivities([]);
      setActivityEvents([]);
      setLoading(false);
      return;
    }

    setEmail(user.email ?? "");
    const nextAccount = accessAccount as Account | null;
    setAccount(nextAccount);

    if (!nextAccount) {
      setLoading(false);
      return;
    }

    if (!forceRefresh) setLoading(true);
    setError("");

    try {
      const snapshot = await fetchWithCache<ProfileSnapshot>(
        `profile:${nextAccount.member_external_id}`,
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [profileResult, detailResult, rideResult, rsvpResult, garageResult] =
            await Promise.all([
              supabase
                .from("member_profiles")
                .select(
                  "member_external_id,full_name,nickname,city,join_date,club_role,total_km",
                )
                .eq("member_external_id", nextAccount.member_external_id)
                .maybeSingle(),
              supabase
                .from("member_details")
                .select("nickname_override,motorcycle,city_override")
                .eq("member_external_id", nextAccount.member_external_id)
                .maybeSingle(),
              supabase
                .from("ride_logs")
                .select(
                  "id,event_id,title,status,distance_km,odometer_start,odometer_end,created_at,rejection_reason",
                )
                .eq("member_external_id", nextAccount.member_external_id)
                .order("created_at", { ascending: false })
                .limit(40),
              supabase
                .from("event_rsvps")
                .select("event_id,status,responded_at")
                .eq("member_external_id", nextAccount.member_external_id)
                .order("responded_at", { ascending: false })
                .limit(15),
              supabase
                .from("member_motorcycles")
                .select("nickname,brand,model")
                .eq("member_external_id", nextAccount.member_external_id)
                .eq("is_primary", true)
                .maybeSingle(),
            ]);

          if (profileResult.error) throw profileResult.error;
          if (detailResult.error) throw detailResult.error;
          if (rideResult.error) throw rideResult.error;
          if (rsvpResult.error) throw rsvpResult.error;
          if (garageResult.error) throw garageResult.error;

          const nextProfile = profileResult.data
            ? ({
                ...profileResult.data,
                total_km: Number(profileResult.data.total_km),
              } as Profile)
            : null;
          const nextDetail = detailResult.data as Detail | null;
          const nextRides = ((rideResult.data ?? []) as RideRow[]).map(
            (ride: RideRow) => ({
              ...ride,
              distance_km:
                ride.distance_km === null ? null : Number(ride.distance_km),
              odometer_start:
                ride.odometer_start === null || ride.odometer_start === undefined
                  ? null
                  : Number(ride.odometer_start),
              odometer_end:
                ride.odometer_end === null || ride.odometer_end === undefined
                  ? null
                  : Number(ride.odometer_end),
            }),
          ) as Ride[];
          const nextRsvps = (rsvpResult.data ?? []) as RsvpActivity[];
          const activityEventIds = [
            ...new Set(
              [
                ...nextRides.map((ride) => ride.event_id),
                ...nextRsvps.map((rsvp) => rsvp.event_id),
              ].filter(Boolean),
            ),
          ] as string[];

          let activityEvents: ActivityEvent[] = [];
          if (activityEventIds.length > 0) {
            const eventResult = await supabase
              .from("events")
              .select("id,title")
              .in("id", activityEventIds);
            if (eventResult.error) throw eventResult.error;
            activityEvents = (eventResult.data ?? []) as ActivityEvent[];
          }

          return {
            profile: nextProfile,
            detail: nextDetail,
            primaryMotorcycle:
              (garageResult.data as PrimaryMotorcycle | null) ?? null,
            rides: nextRides,
            rsvpActivities: nextRsvps,
            activityEvents,
          };
        },
        { ttlMs: 60_000, forceRefresh },
      );

      setProfile(snapshot.profile);
      setDetail(snapshot.detail);
      setPrimaryMotorcycle(snapshot.primaryMotorcycle);
      setRides(snapshot.rides);
      setRsvpActivities(snapshot.rsvpActivities);
      setActivityEvents(snapshot.activityEvents);
      setNickname(
        snapshot.detail?.nickname_override || snapshot.profile?.nickname || "",
      );
      setMotorcycle(snapshot.detail?.motorcycle || "");
      setCity(snapshot.detail?.city_override || snapshot.profile?.city || "");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Profil member belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessAccount, accessLoading, fetchWithCache, user]);

  useEffect(() => {
    if (accessLoading) return;
    void load();
  }, [accessLoading, load]);

  const handleRideUpdated = async () => {
    invalidateCache("riding:");
    invalidateCache("member_profiles_list");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");
    if (account) {
      invalidateCache(`dashboard_member_profile_${account.member_external_id}`);
      invalidateCache(`profile:${account.member_external_id}`);
      invalidateCache(`member_touring:${account.member_external_id}`);
    }
    await load(true);
  };

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!user || !account) throw new Error("Sesi member tidak ditemukan.");
      const { error: upsertError } = await supabase.from("member_details").upsert({
        member_external_id: account.member_external_id,
        nickname_override: nickname.trim() || null,
        motorcycle: motorcycle.trim() || null,
        city_override: city.trim() || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;
      setMessage("Profil member berhasil disimpan.");
      invalidateCache("member_profiles_list");
      invalidateCache("admin_dashboard_overview");
      invalidateCache(`dashboard_member_profile_${account.member_external_id}`);
      invalidateCache(`profile:${account.member_external_id}`);
      await load(true);
      setProfileEditOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profil belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  };

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
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="dark-action" onClick={logout} style={{ borderRadius: "8px" }}>
            <LogOut />
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
