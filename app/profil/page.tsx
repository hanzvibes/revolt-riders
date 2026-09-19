"use client";

import { AppShell } from "@/components/app-shell";
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

  return (
    <AppShell active="Profil" title="Profil Saya">
      <div className="page-wrap">
        {/* ================================================================ */}
        {/* DIGITAL MEMBERSHIP CARD (IDENTITY CARD) */}
        {/* ================================================================ */}
        <section
          className="digital-id-card"
          style={{
            position: "relative",
            borderRadius: "22px",
            background: "linear-gradient(135deg, #0d0f11 0%, #1a1c1f 50%, #111315 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 22px 50px rgba(0, 0, 0, 0.45)",
            padding: "30px 28px",
            color: "#fff",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          {/* Subtle watermark background logo */}
          <div
            style={{
              position: "absolute",
              right: "-20px",
              bottom: "-25px",
              width: "220px",
              height: "220px",
              opacity: 0.05,
              pointerEvents: "none",
            }}
          >
            <Image
              src="/revolt-riders-logo.jpg"
              alt="Revolt Riders Crest"
              width={220}
              height={220}
              style={{ objectFit: "contain" }}
            />
          </div>

          {/* Main Card Identity Layout - Clean, Centered & Symmetrical */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              paddingTop: "6px",
            }}
          >
            {/* Avatar badge */}
            <div
              style={{
                width: "86px",
                height: "86px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #24272a, #0e0f10)",
                border: "3px solid #fff",
                boxShadow: "0 0 0 3px var(--red), 0 8px 24px rgba(0,0,0,0.55)",
                display: "grid",
                placeItems: "center",
                fontSize: "1.75rem",
                fontWeight: 900,
                color: "#fff",
                marginBottom: "14px",
              }}
            >
              {displayName.slice(0, 2).toUpperCase()}
            </div>

            {/* Display Name */}
            <h2
              style={{
                fontSize: "1.65rem",
                fontWeight: 900,
                margin: 0,
                letterSpacing: "-0.03em",
                color: "#fff",
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </h2>

            {/* Full Name Subtitle (if different from displayName) */}
            {profile?.full_name && profile.full_name !== displayName && (
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#9ca3af",
                  margin: "4px 0 0",
                  fontWeight: 500,
                }}
              >
                {profile.full_name}
              </p>
            )}

            {/* Badges Row: ID RR, Club Role, Active Member */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "12px",
              }}
            >
              <code
                style={{
                  background: "var(--red)",
                  color: "#fff",
                  fontWeight: 900,
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontSize: "0.76rem",
                  letterSpacing: "0.08em",
                  boxShadow: "0 2px 8px rgba(229, 29, 42, 0.35)",
                }}
              >
                {account.member_external_id}
              </code>

              {profile?.club_role && (
                <span
                  className={`member-role-badge ${getRoleClass(profile.club_role)}`}
                  style={{ fontSize: "0.66rem", padding: "3.5px 9px", borderRadius: "6px" }}
                >
                  {profile.club_role}
                </span>
              )}

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "rgba(22, 163, 74, 0.15)",
                  border: "1px solid rgba(22, 163, 74, 0.35)",
                  borderRadius: "20px",
                  padding: "3px 10px",
                  fontSize: "0.64rem",
                  color: "#4ade80",
                  fontWeight: 800,
                }}
              >
                <ShieldCheck size={12} />
                <span>ACTIVE MEMBER</span>
              </div>
            </div>

            {/* Meta pills on card (Kota, Motor, Tanggal Bergabung) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px 18px",
                marginTop: "14px",
                flexWrap: "wrap",
                fontSize: "0.72rem",
                color: "#9ca3af",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <MapPin size={13} color="var(--red)" />
                {city || profile?.city || "Kota belum diisi"}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Bike size={13} color="var(--red)" />
                {motorcycle || detail?.motorcycle || "Motor belum diisi"}
              </span>
              {profile?.join_date && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <Calendar size={13} color="var(--red)" />
                  Bergabung {profile.join_date}
                </span>
              )}
            </div>
          </div>

          {/* Stats Bar On Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "14px",
              marginTop: "24px",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <div>
              <small style={{ display: "block", color: "#8b949e", fontSize: "0.58rem", fontWeight: 800, textTransform: "uppercase" }}>
                TOTAL KM RESMI
              </small>
              <b style={{ fontSize: "1.25rem", color: "#fff", display: "inline-block", marginTop: "2px" }}>
                {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(totalKm)}{" "}
                <span style={{ fontSize: "0.7rem", color: "var(--red)" }}>KM</span>
              </b>
            </div>

            <div style={{ borderLeft: "1px solid rgba(255, 255, 255, 0.1)", borderRight: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <small style={{ display: "block", color: "#8b949e", fontSize: "0.58rem", fontWeight: 800, textTransform: "uppercase" }}>
                RIWAYAT TOURING
              </small>
              <b style={{ fontSize: "1.25rem", color: "#fff", display: "inline-block", marginTop: "2px" }}>
                {approvedRidesCount}{" "}
                <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>log</span>
              </b>
            </div>

            <div>
              <small style={{ display: "block", color: "#8b949e", fontSize: "0.58rem", fontWeight: 800, textTransform: "uppercase" }}>
                RESPONS RSVP
              </small>
              <b style={{ fontSize: "1.25rem", color: "#fff", display: "inline-block", marginTop: "2px" }}>
                {rsvpActivities.length}{" "}
                <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>agenda</span>
              </b>
            </div>
          </div>

          {/* Quick Shortcuts Strip */}
          <nav className="profile-quick-shortcuts" aria-label="Akses cepat member">
            <Link className="profile-emboss-action" href="/riding">
              <Bike aria-hidden="true" />
              <span>Catat Riding</span>
            </Link>

            <Link className="profile-emboss-action" href="/agenda">
              <CalendarDays aria-hidden="true" />
              <span>Agenda Club</span>
            </Link>

            <Link className="profile-emboss-action" href="/leaderboard">
              <Trophy aria-hidden="true" />
              <span>Leaderboard</span>
            </Link>

            <Link className="profile-emboss-action" href="/check-in">
              <QrCode aria-hidden="true" />
              <span>Check-in</span>
            </Link>
          </nav>
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
              style={{ height: "36px", padding: "0 14px", fontSize: "0.68rem", borderRadius: "8px" }}
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
