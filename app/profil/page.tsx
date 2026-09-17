"use client";

import { AppShell } from "@/components/app-shell";
import { RideLogEditModal, type RideLogEditData } from "@/components/ride-log-edit-modal";
import { useDataCache } from "@/context/data-cache-context";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Bike, CalendarDays, Check, Clock3, LogOut, MapPin, Pencil, Plus, Route, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Account = { member_external_id: string; role: string; status: string };
type Profile = { member_external_id: string; full_name: string; nickname: string | null; city: string | null; join_date: string | null; club_role: string | null; total_km: number };
type Detail = { nickname_override: string | null; motorcycle: string | null; city_override: string | null };
type Ride = { id: string; event_id: string | null; title: string | null; status: "pending" | "approved" | "rejected"; distance_km: number | null; created_at: string; rejection_reason: string | null };
type RideRow = Omit<Ride, "distance_km"> & { distance_km: number | string | null };
type RsvpActivity = { event_id: string; status: "attending" | "declined" | "maybe"; responded_at: string };
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

  const displayName = detail?.nickname_override || profile?.nickname || profile?.full_name || account?.member_external_id || "Member";
  const approvedDistance = useMemo(() => rides.filter((ride) => ride.status === "approved").reduce((total, ride) => total + Number(ride.distance_km || 0), 0), [rides]);
  const totalKm = Math.max(Number(profile?.total_km || 0), approvedDistance);
  const eventTitleById = useMemo(() => new Map(activityEvents.map((event) => [event.id, event.title])), [activityEvents]);

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setEmail(user.email ?? "");
    const { data: accountData } = await supabase.from("member_accounts").select("member_external_id,role,status").eq("user_id", user.id).maybeSingle();
    const nextAccount = accountData as Account | null;
    setAccount(nextAccount);
    if (!nextAccount) { setLoading(false); return; }
    const [profileResult, detailResult, rideResult, rsvpResult] = await Promise.all([
      supabase.from("member_profiles").select("member_external_id,full_name,nickname,city,join_date,club_role,total_km").eq("member_external_id", nextAccount.member_external_id).maybeSingle(),
      supabase.from("member_details").select("nickname_override,motorcycle,city_override").eq("member_external_id", nextAccount.member_external_id).maybeSingle(),
      supabase.from("ride_logs").select("id,event_id,title,status,distance_km,created_at,rejection_reason").eq("member_external_id", nextAccount.member_external_id).order("created_at", { ascending: false }).limit(30),
      supabase.from("event_rsvps").select("event_id,status,responded_at").eq("member_external_id", nextAccount.member_external_id).order("responded_at", { ascending: false }).limit(15),
    ]);
    const nextProfile = profileResult.data ? { ...profileResult.data, total_km: Number(profileResult.data.total_km) } as Profile : null;
    const nextDetail = detailResult.data as Detail | null;
    const nextRides = ((rideResult.data ?? []) as RideRow[]).map((ride: RideRow) => ({ ...ride, distance_km: ride.distance_km === null ? null : Number(ride.distance_km) })) as Ride[];
    const nextRsvps = (rsvpResult.data ?? []) as RsvpActivity[];
    const activityEventIds = [...new Set([...nextRides.map((ride) => ride.event_id), ...nextRsvps.map((rsvp) => rsvp.event_id)].filter(Boolean))] as string[];
    const eventResult = activityEventIds.length ? await supabase.from("events").select("id,title").in("id", activityEventIds) : { data: [] };
    setProfile(nextProfile); setDetail(nextDetail); setRides(nextRides); setRsvpActivities(nextRsvps); setActivityEvents((eventResult.data ?? []) as ActivityEvent[]);
    setNickname(nextDetail?.nickname_override || nextProfile?.nickname || "");
    setMotorcycle(nextDetail?.motorcycle || "");
    setCity(nextDetail?.city_override || nextProfile?.city || "");
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

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
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !account) throw new Error("Sesi member tidak ditemukan.");
      const { error: upsertError } = await supabase.from("member_details").upsert({ member_external_id: account.member_external_id, nickname_override: nickname.trim() || null, motorcycle: motorcycle.trim() || null, city_override: city.trim() || null, updated_by: user.id, updated_at: new Date().toISOString() });
      if (upsertError) throw upsertError;
      setMessage("Profil member berhasil diperbarui.");
      invalidateCache("member_profiles_list");
      invalidateCache("admin_dashboard_overview");
      invalidateCache(`dashboard_member_profile_${account.member_external_id}`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Profil belum dapat diperbarui."); }
    finally { setSaving(false); }
  };

  const logout = async () => { await getSupabaseBrowserClient().auth.signOut(); router.replace("/"); router.refresh(); };

  return (
    <AppShell active="Profil" title="Profil">
      <div className="page-wrap">
        <section className="profile-overview card">
          {loading ? (
            <h2>Memuat profil…</h2>
          ) : !email ? (
            <>
              <UserRound/>
              <h2>Belum masuk</h2>
              <p>Masuk untuk membuka profil dan aktivitas personalmu.</p>
              <a className="primary-action" href="/login">MASUK</a>
            </>
          ) : !account ? (
            <>
              <UserRound/>
              <h2>Akun menunggu verifikasi</h2>
              <p>{email}</p>
              <p className="notice">Pengurus perlu menghubungkan akun ini dengan data member resmi terlebih dahulu.</p>
            </>
          ) : (
            <>
              <i>{displayName.slice(0, 2).toUpperCase()}</i>
              <em>MEMBER REVOLT RIDERS</em>
              <h2>{displayName}</h2>
              {profile?.club_role && (
                <div style={{ margin: "6px auto" }}>
                  <span className={`member-role-badge ${getRoleClass(profile.club_role)}`}>
                    {profile.club_role}
                  </span>
                </div>
              )}
              <p>
                {profile?.full_name && profile.full_name !== displayName ? profile.full_name : account.member_external_id} · {account.role.replaceAll("_", " ")}
              </p>
              <div className="profile-stat-grid">
                <span>
                  <Route/>
                  <small>TOTAL KM</small>
                  <b>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(totalKm)}</b>
                </span>
                <span>
                  <Bike/>
                  <small>RIDE DIKIRIM</small>
                  <b>{rides.length}</b>
                </span>
                <span>
                  <Check/>
                  <small>RSVP</small>
                  <b>{rsvpActivities.length}</b>
                </span>
              </div>
              <div className="profile-meta">
                <span><MapPin/>{city || "Kota belum diisi"}</span>
                <span><Bike/>{motorcycle || "Motor belum diisi"}</span>
                <span><ShieldCheck/>{account.status}</span>
              </div>
            </>
          )}
        </section>

        {account && (
          <section className="profile-edit card">
            <div className="section-title">
              <span><em>DATA PRIBADI</em><h3>Lengkapi profil</h3></span>
              <Save/>
            </div>
            <p>Perbarui nama panggilan, motor, dan kota. Data ini dapat digunakan untuk tampilan internal komunitas.</p>
            <form onSubmit={saveDetails}>
              <label>Nama panggilan<input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} placeholder="Nama panggilan"/></label>
              <label>Motor<input value={motorcycle} onChange={(event) => setMotorcycle(event.target.value)} maxLength={120} placeholder="Contoh: Honda CB150R"/></label>
              <label>Kota<input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} placeholder="Contoh: Situbondo"/></label>
              {message && <p className="success-message"><Check/>{message}</p>}
              {error && <p className="error-message">{error}</p>}
              <button className="primary-action" disabled={saving}>{saving ? "MENYIMPAN…" : "SIMPAN PROFIL"}</button>
            </form>
          </section>
        )}

        {account && (
          <section className="profile-activity">
            <section className="card">
              <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span><em>RIDING & SOWAN</em><h3>Riwayat Ride Log</h3></span>
                <button
                  type="button"
                  className="member-add-tour-btn"
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
                >
                  <Plus size={13} /> Catat
                </button>
              </div>
              {rides.length === 0 ? (
                <p className="system-message">Belum ada riwayat sowan / ride log yang dicatat.</p>
              ) : (
                <div className="activity-list">
                  {rides.map((ride) => (
                    <article key={ride.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <i><Route/></i>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ride.title || (ride.event_id ? eventTitleById.get(ride.event_id) || "Agenda riding" : "Ride mandiri")}
                        </b>
                        <small>
                          {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(ride.created_at))} · {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Number(ride.distance_km || 0))} KM
                        </small>
                      </span>
                      <em className={`activity-${ride.status}`}>{ride.status}</em>
                      <div style={{ display: "flex", gap: "5px", marginLeft: "4px" }}>
                        <button
                          type="button"
                          className="member-tour-action"
                          title="Edit catatan ini"
                          onClick={() => {
                            setEditModalData({
                              id: ride.id,
                              memberExternalId: account.member_external_id,
                              memberName: displayName,
                              title: ride.title || (ride.event_id ? eventTitleById.get(ride.event_id) || "Agenda riding" : "Ride mandiri"),
                              km: Number(ride.distance_km || 0),
                              date: ride.created_at ? ride.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                            });
                            setEditModalOpen(true);
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className="member-tour-action delete"
                          title="Hapus catatan ini"
                          onClick={async () => {
                            if (!confirm(`Hapus catatan "${ride.title || "ini"}"?`)) return;
                            try {
                              await deleteRideLog(ride.id, account.member_external_id);
                              await handleRideUpdated();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : "Gagal menghapus");
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <div className="section-title">
                <span><em>AGENDA</em><h3>Respons RSVP</h3></span>
                <CalendarDays/>
              </div>
              {rsvpActivities.length === 0 ? (
                <p className="system-message">Belum ada respons undangan.</p>
              ) : (
                <div className="activity-list">
                  {rsvpActivities.slice(0, 5).map((rsvp) => (
                    <article key={`${rsvp.event_id}-${rsvp.responded_at}`}>
                      <i><Clock3/></i>
                      <span>
                        <b>{eventTitleById.get(rsvp.event_id) || "Agenda Revolt Riders"}</b>
                        <small>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(rsvp.responded_at))}</small>
                      </span>
                      <em className={`rsvp-${rsvp.status}`}>
                        {rsvp.status === "attending" ? "hadir" : rsvp.status === "declined" ? "tidak hadir" : "mungkin"}
                      </em>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {email && (
          <button className="dark-action profile-logout" onClick={logout}>
            <LogOut/>KELUAR DARI AKUN
          </button>
        )}
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
