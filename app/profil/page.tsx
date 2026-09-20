"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { RideLogEditModal, type RideLogEditData } from "@/components/ride-log-edit-modal";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
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
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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
  const router = useRouter();
  const { invalidateCache } = useDataCache();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [rsvpActivities, setRsvpActivities] = useState<RsvpActivity[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nickname, setNickname] = useState("");
  const [motorcycle, setMotorcycle] = useState("");
  const [city, setCity] = useState("");

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

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setEmail(user.email ?? "");
    const { data: accountData } = await supabase
      .from("member_accounts")
      .select("member_external_id,role,status")
      .eq("user_id", user.id)
      .maybeSingle();
    const nextAccount = accountData as Account | null;
    setAccount(nextAccount);
    if (!nextAccount) {
      setLoading(false);
      return;
    }
    const [profileResult, detailResult, rideResult, rsvpResult] = await Promise.all([
      supabase
        .from("member_profiles")
        .select("member_external_id,full_name,nickname,city,join_date,club_role,total_km")
        .eq("member_external_id", nextAccount.member_external_id)
        .maybeSingle(),
      supabase
        .from("member_details")
        .select("nickname_override,motorcycle,city_override")
        .eq("member_external_id", nextAccount.member_external_id)
        .maybeSingle(),
      supabase
        .from("ride_logs")
        .select("id,event_id,title,status,distance_km,odometer_start,odometer_end,created_at,rejection_reason")
        .eq("member_external_id", nextAccount.member_external_id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("event_rsvps")
        .select("event_id,status,responded_at")
        .eq("member_external_id", nextAccount.member_external_id)
        .order("responded_at", { ascending: false })
        .limit(15),
    ]);
    const nextProfile = profileResult.data
      ? ({ ...profileResult.data, total_km: Number(profileResult.data.total_km) } as Profile)
      : null;
    const nextDetail = detailResult.data as Detail | null;
    const nextRides = ((rideResult.data ?? []) as RideRow[]).map((ride: RideRow) => ({
      ...ride,
      distance_km: ride.distance_km === null ? null : Number(ride.distance_km),
      odometer_start:
        ride.odometer_start === null || ride.odometer_start === undefined
          ? null
          : Number(ride.odometer_start),
      odometer_end:
        ride.odometer_end === null || ride.odometer_end === undefined
          ? null
          : Number(ride.odometer_end),
    })) as Ride[];
    const nextRsvps = (rsvpResult.data ?? []) as RsvpActivity[];
    const activityEventIds = [
      ...new Set([...nextRides.map((r) => r.event_id), ...nextRsvps.map((r) => r.event_id)].filter(Boolean)),
    ] as string[];
    const eventResult = activityEventIds.length
      ? await supabase.from("events").select("id,title").in("id", activityEventIds)
      : { data: [] };

    setProfile(nextProfile);
    setDetail(nextDetail);
    setRides(nextRides);
    setRsvpActivities(nextRsvps);
    setActivityEvents((eventResult.data ?? []) as ActivityEvent[]);
    setNickname(nextDetail?.nickname_override || nextProfile?.nickname || "");
    setMotorcycle(nextDetail?.motorcycle || "");
    setCity(nextDetail?.city_override || nextProfile?.city || "");
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRideUpdated = async () => {
    invalidateCache("member_profiles_list");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");
    if (account) {
      invalidateCache(`dashboard_member_profile_${account.member_external_id}`);
    }
    await load();
  };

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      await load();
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
        <PageSkeleton title="Memuat Kartu Anggota..." />
      </AppShell>
    );
  }

  if (!email) {
    return (
      <AppShell active="Profil" title="Profil Saya">
        <div className="page-wrap">
          <section className="empty-state card">
            <UserRound />
            <h2>Belum masuk ke akun</h2>
            <p>Silakan masuk terlebih dahulu untuk membuka kartu anggota digital Revolt Riders.</p>
            <a className="primary-action" href="/login">
              MASUK KE AKUN
            </a>
          </section>
        </div>
      </AppShell>
    );
  }

  if (!account) {
    return (
      <AppShell active="Profil" title="Profil Saya">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akun menunggu verifikasi pengurus</h2>
            <p>{email}</p>
            <p className="notice" style={{ marginTop: "12px" }}>
              Pendaftaran Anda telah diterima. Pengurus akan segera memverifikasi dan menghubungkan akun Anda dengan Member ID resmi.
            </p>
          </section>
        </div>
      </AppShell>
    );
  }

  const approvedRidesCount = rides.filter((r) => r.status === "approved").length;
  const attendedAgendaCount = rsvpActivities.filter((rsvp) => rsvp.status === "attending").length;
  const joinDate = profile?.join_date ? new Date(profile.join_date) : null;
  const joinYear =
    joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate.getFullYear() : null;

  const kmMilestones = [500, 1000, 2500, 5000, 10000, 25000];
  const previousKmMilestone =
    [...kmMilestones].reverse().find((milestone) => totalKm >= milestone) ?? 0;
  const nextKmMilestone =
    kmMilestones.find((milestone) => totalKm < milestone) ?? null;
  const milestoneProgress = nextKmMilestone
    ? Math.min(
        100,
        Math.max(
          0,
          ((totalKm - previousKmMilestone) /
            (nextKmMilestone - previousKmMilestone)) *
            100,
        ),
      )
    : 100;
  const remainingKmToMilestone = nextKmMilestone
    ? Math.max(0, nextKmMilestone - totalKm)
    : 0;

  const passportBadges = [
    {
      key: "verified",
      label: "Verified",
      detail: "Member resmi",
      unlocked: account.status === "active",
      Icon: ShieldCheck,
    },
    {
      key: "road-1k",
      label: "Road 1K",
      detail: "1.000 KM resmi",
      unlocked: totalKm >= 1000,
      Icon: Route,
    },
    {
      key: "five-rides",
      label: "5 Rides",
      detail: "5 ride disetujui",
      unlocked: approvedRidesCount >= 5,
      Icon: Bike,
    },
    {
      key: "five-agenda",
      label: "5 RSVP",
      detail: "5 RSVP hadir",
      unlocked: attendedAgendaCount >= 5,
      Icon: CalendarDays,
    },
    {
      key: "road-5k",
      label: "Road 5K",
      detail: "5.000 KM resmi",
      unlocked: totalKm >= 5000,
      Icon: Trophy,
    },
  ];

  return (
    <AppShell active="Profil" title="Profil Saya">
      <div className="page-wrap">
        {/* ================================================================ */}
        {/* DIGITAL MEMBERSHIP CARD (IDENTITY CARD) */}
        {/* ================================================================ */}
        <section className="digital-id-card member-passport-card">
          <div className="member-passport-watermark" aria-hidden="true">
            <Image
              src="/revolt-riders-logo.jpg"
              alt=""
              width={260}
              height={260}
              priority={false}
            />
          </div>

          <header className="member-passport-head">
            <span>
              <small>DIGITAL MEMBER PASSPORT</small>
              <strong>REVOLT RIDERS</strong>
              <em>SITUBONDO · EST. 2022</em>
            </span>
            <span className="member-passport-verified">
              <ShieldCheck aria-hidden="true" />
              VERIFIED
            </span>
          </header>

          <div className="member-passport-identity">
            <div className="member-passport-avatar" aria-hidden="true">
              {displayName.slice(0, 2).toUpperCase()}
            </div>

            <div className="member-passport-name">
              <small>OFFICIAL MEMBER</small>
              <h2>{displayName}</h2>
              {profile?.full_name && profile.full_name !== displayName && (
                <p>{profile.full_name}</p>
              )}

              <div className="member-passport-tags">
                <code>{account.member_external_id}</code>
                {profile?.club_role && (
                  <span className={`member-role-badge ${getRoleClass(profile.club_role)}`}>
                    {profile.club_role}
                  </span>
                )}
                <span className="member-passport-status">
                  <ShieldCheck aria-hidden="true" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="member-passport-meta">
            <span>
              <MapPin aria-hidden="true" />
              <small>Domisili</small>
              <b>{city || profile?.city || "Belum diisi"}</b>
            </span>
            <span>
              <Bike aria-hidden="true" />
              <small>Motor</small>
              <b>{motorcycle || detail?.motorcycle || "Belum diisi"}</b>
            </span>
            <span>
              <Calendar aria-hidden="true" />
              <small>Member since</small>
              <b>
                {joinDate && joinYear
                  ? new Intl.DateTimeFormat("id-ID", {
                      month: "short",
                      year: "numeric",
                    }).format(joinDate)
                  : "Member resmi"}
              </b>
            </span>
          </div>

          <div className="member-passport-metrics" aria-label="Ringkasan passport member">
            <article>
              <small>Total KM Resmi</small>
              <strong>
                <CountUpNumber value={totalKm} maximumFractionDigits={1} />
                <span>KM</span>
              </strong>
            </article>
            <article>
              <small>Ride Approved</small>
              <strong>
                <CountUpNumber value={approvedRidesCount} />
                <span>ride</span>
              </strong>
            </article>
            <article>
              <small>RSVP Hadir</small>
              <strong>
                <CountUpNumber value={attendedAgendaCount} />
                <span>agenda</span>
              </strong>
            </article>
          </div>

          <div className="member-passport-body-grid">
            <section className="member-passport-progress" aria-label="Progress member">
              <div className="member-passport-progress-head">
                <span>
                  <small>ROAD PROGRESS</small>
                  <strong>
                    {nextKmMilestone
                      ? `Menuju ${new Intl.NumberFormat("id-ID").format(nextKmMilestone)} KM`
                      : "Milestone tertinggi tercapai"}
                  </strong>
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
                      ? "untuk membuka milestone berikutnya"
                      : "Semua milestone KM saat ini sudah terbuka"}
                  </small>
                </span>
              </div>
            </section>

            <section className="member-passport-achievements" aria-label="Milestone passport">
              <div className="member-passport-achievements-head">
                <span>
                  <small>PASSPORT STAMPS</small>
                  <strong>Milestone Member</strong>
                </span>
                <b>
                  {passportBadges.filter((badge) => badge.unlocked).length}
                  <span>/{passportBadges.length}</span>
                </b>
              </div>

              <div className="member-passport-badges">
                {passportBadges.map(({ key, label, detail: badgeDetail, unlocked, Icon }) => (
                  <article
                    key={key}
                    className={unlocked ? "is-unlocked" : "is-locked"}
                    aria-label={`${label}: ${unlocked ? "tercapai" : "belum tercapai"}`}
                  >
                    <i><Icon aria-hidden="true" /></i>
                    <span>
                      <b>{label}</b>
                      <small>{badgeDetail}</small>
                    </span>
                    {unlocked && <Check aria-hidden="true" />}
                  </article>
                ))}
              </div>
            </section>
          </div>

          <footer className="member-passport-footer">
            <span>
              <small>PASSPORT NO.</small>
              <b>{account.member_external_id}</b>
            </span>

            <nav className="profile-quick-shortcuts" aria-label="Akses cepat member">
              <Link className="profile-emboss-action" href="/riding">
                <Bike aria-hidden="true" />
                <span>Riding</span>
              </Link>
              <Link className="profile-emboss-action" href="/agenda">
                <CalendarDays aria-hidden="true" />
                <span>Agenda</span>
              </Link>
              <Link className="profile-emboss-action" href="/leaderboard">
                <Trophy aria-hidden="true" />
                <span>Ranking</span>
              </Link>
              <Link className="profile-emboss-action" href="/check-in">
                <QrCode aria-hidden="true" />
                <span>Check-in</span>
              </Link>
            </nav>
          </footer>
        </section>

        {/* ================================================================ */}
        {/* SECTION RIWAYAT SOWAN & TOURING */}
        {/* ================================================================ */}
        <section className="card" style={{ marginBottom: "22px" }}>
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
                                fontSize: "0.62rem",
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
                                fontSize: "0.62rem",
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

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 800,
                          borderRadius: "12px",
                          padding: "3px 8px",
                          background: isApproved ? "#eaf8f1" : isPending ? "#fef3c7" : "#fff0f1",
                          color: isApproved ? "#137748" : isPending ? "#b45309" : "#b31221",
                          textTransform: "capitalize",
                        }}
                      >
                        {isApproved ? "Approved" : isPending ? "Pending" : "Ditolak"}
                      </span>

                      <button
                        type="button"
                        className="member-tour-action"
                        title="Edit catatan ini"
                        onClick={() => {
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
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid var(--line)",
                          background: "#fff",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className="member-tour-action delete"
                        title="Hapus catatan ini"
                        onClick={async () => {
                          if (!confirm(`Hapus catatan "${displayTitle}"?`)) return;
                          try {
                            await deleteRideLog(ride.id, account.member_external_id);
                            await handleRideUpdated();
                          } catch (e) {
                            alert(e instanceof Error ? e.message : "Gagal menghapus");
                          }
                        }}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          border: "1px solid #ffd3d6",
                          background: "#fff",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          color: "#dc1b2a",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* EDIT PROFIL MEMBER */}
        {/* ================================================================ */}
        <section className="profile-edit card" style={{ marginBottom: "22px" }}>
          <div className="section-title">
            <span>
              <em>Data pribadi</em>
              <h3>Lengkapi Profil & Kendaraan</h3>
            </span>
            <Save />
          </div>
          <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: "0.75rem" }}>
            Perbarui nama panggilan, motor, dan kota domisili. Data ini akan ditampilkan pada identitas kartu anggota.
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
            {message && <p className="success-message"><Check />{message}</p>}
            {error && <p className="error-message">{error}</p>}
            <button className="primary-action" disabled={saving}>
              {saving ? "MENYIMPAN…" : "SIMPAN PROFIL"}
            </button>
          </form>
        </section>

        {/* ================================================================ */}
        {/* AKTIVITAS AGENDA RSVP */}
        {/* ================================================================ */}
        <section className="card" style={{ marginBottom: "24px" }}>
          <div className="section-title">
            <span>
              <em>Agenda club</em>
              <h3>Respons RSVP Undangan</h3>
            </span>
            <CalendarDays />
          </div>
          {rsvpActivities.length === 0 ? (
            <p className="system-message">Belum ada respons agenda tercatat.</p>
          ) : (
            <div className="activity-list">
              {rsvpActivities.slice(0, 5).map((rsvp) => (
                <article key={`${rsvp.event_id}-${rsvp.responded_at}`}>
                  <i>
                    <Clock3 />
                  </i>
                  <span>
                    <b>{eventTitleById.get(rsvp.event_id) || "Agenda Revolt Riders"}</b>
                    <small>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                        new Date(rsvp.responded_at)
                      )}
                    </small>
                  </span>
                  <em className={`rsvp-${rsvp.status}`}>
                    {rsvp.status === "attending"
                      ? "hadir"
                      : rsvp.status === "declined"
                        ? "tidak hadir"
                        : "mungkin"}
                  </em>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* LOGOUT BUTTON */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button className="dark-action" onClick={logout} style={{ borderRadius: "8px" }}>
            <LogOut />
            KELUAR DARI AKUN
          </button>
        </div>
      </div>

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
