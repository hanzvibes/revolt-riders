"use client";

import { AppShell } from "@/components/app-shell";
import { CountUpNumber } from "@/components/count-up-number";
import { RideLogEditModal, type RideLogEditData } from "@/components/ride-log-edit-modal";
import { RidingStatChart } from "@/components/riding-stat-chart";
import { PageSkeleton } from "@/components/skeleton";
import { useMemberAccess } from "@/hooks/use-member-access";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gauge,
  Pencil,
  Plus,
  Route,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type RideEvent = { id: string; title: string; type: "riding" | "touring"; start_at: string };
type UserRide = {
  id: string;
  title: string | null;
  event_id: string | null;
  odometer_start: number;
  odometer_end: number;
  distance_km: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
};
type MemberProfile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  total_km: number;
};

const eventDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

export default function RidingPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [rides, setRides] = useState<UserRide[]>([]);
  const [events, setEvents] = useState<RideEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<RideLogEditData | null>(null);

  const activeAccount = account?.status === "active" ? account : null;
  const isStaff = activeAccount && ["admin", "superadmin", "road_captain"].includes(activeAccount.role);
  const distance = Math.max(0, Number(end || 0) - Number(start || 0));
  const selectedEvent = useMemo(() => events.find((item) => item.id === eventId), [eventId, events]);

  const loadData = useCallback(async () => {
    if (!activeAccount) {
      setLoadingData(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    try {
      const [eventsRes, profileRes, ridesRes] = await Promise.all([
        supabase
          .from("events")
          .select("id,title,type,start_at")
          .in("status", ["published", "completed"])
          .in("type", ["riding", "touring"])
          .order("start_at", { ascending: false })
          .limit(50),
        supabase
          .from("member_profiles")
          .select("member_external_id,full_name,nickname,total_km")
          .eq("member_external_id", activeAccount.member_external_id)
          .maybeSingle(),
        supabase
          .from("ride_logs")
          .select("id,title,event_id,odometer_start,odometer_end,distance_km,status,created_at,rejection_reason")
          .eq("member_external_id", activeAccount.member_external_id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data as RideEvent[]);
      if (profileRes.data) {
        setProfile({
          ...profileRes.data,
          total_km: Number(profileRes.data.total_km) || 0,
        });
      }
      if (ridesRes.data) {
        setRides(
          (ridesRes.data as { [key: string]: unknown }[]).map((r) => ({
            id: String(r.id),
            title: (r.title as string) || null,
            event_id: (r.event_id as string) || null,
            odometer_start: Number(r.odometer_start) || 0,
            odometer_end: Number(r.odometer_end) || 0,
            distance_km: r.distance_km !== null && r.distance_km !== undefined ? Number(r.distance_km) : null,
            status: r.status as "pending" | "approved" | "rejected",
            created_at: String(r.created_at),
            rejection_reason: (r.rejection_reason as string) || null,
          }))
        );
      }
    } catch {
      setError("Gagal memuat data riding. Coba segarkan halaman.");
    } finally {
      setLoadingData(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    if (!accessLoading) void loadData();
  }, [accessLoading, loadData]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeAccount) return;

    const cleanTitle = title.trim() || (selectedEvent ? selectedEvent.title : "");
    if (!cleanTitle && !selectedEvent) {
      setError("Harap isi nama kegiatan, agenda, atau destinasi riding.");
      return;
    }

    if (distance <= 0) {
      setError("Jarak harus lebih besar dari 0 KM (Odometer akhir harus lebih besar dari awal).");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login tidak ditemukan.");

      const finalTitle = cleanTitle || "Ride Mandiri";
      const initialStatus = isStaff ? "approved" : "pending";

      const { error: insertError } = await supabase.from("ride_logs").insert({
        event_id: eventId || null,
        title: finalTitle,
        member_external_id: activeAccount.member_external_id,
        odometer_start: Number(start),
        odometer_end: Number(end),
        submitted_by: user.id,
        status: initialStatus,
        reviewed_at: isStaff ? new Date().toISOString() : null,
        reviewed_by: isStaff ? user.id : null,
      });

      if (insertError) throw insertError;

      if (isStaff) {
        setMessage(
          `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil disimpan dan langsung disetujui (Approved).`
        );
      } else {
        setMessage(
          `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil dikirim! Menunggu validasi Road Captain / Pengurus.`
        );
      }

      setEventId("");
      setTitle("");
      setStart("");
      setEnd("");
      setShowForm(false);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ride log belum dapat dikirim.");
    } finally {
      setSaving(false);
    }
  };

  const pendingRides = useMemo(() => rides.filter((r) => r.status === "pending"), [rides]);
  const approvedRides = useMemo(() => rides.filter((r) => r.status === "approved"), [rides]);
  const totalVerifiedKm = profile?.total_km ?? approvedRides.reduce((sum, r) => sum + (r.distance_km ?? 0), 0);
  const displayName = profile?.nickname || profile?.full_name || activeAccount?.member_external_id || "Rider";

  if (accessLoading || (activeAccount && loadingData)) {
    return (
      <AppShell active="Riding" title="Catat Riding">
        <PageSkeleton title="Memuat Data Catatan Riding..." />
      </AppShell>
    );
  }

  return (
    <AppShell active="Riding" title="Catat Riding">
      <div className="page-wrap">
        {/* TOP HERO CARD: RINGKASAN RIDING MEMBER */}
        <section
          className="card riding-summary-hero"
          style={{
            background: "radial-gradient(circle at 85% 30%, #2a2d30, transparent 40%), linear-gradient(135deg, #141618, #222528)",
            color: "#fff",
            borderRadius: "18px",
            padding: "26px 28px",
            boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
            marginBottom: "22px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <em style={{ fontStyle: "normal", fontSize: "0.62rem", color: "var(--red)", fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                RIDING LOG · REVOLT RIDERS
              </em>
              <h2 style={{ fontSize: "1.75rem", margin: "4px 0 6px", fontWeight: 800, letterSpacing: "-0.03em" }}>
                {displayName}
              </h2>
              <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.78rem" }}>
                {activeAccount ? activeAccount.member_external_id : "Belum masuk akun"} · Catatan jarak & odometer resmi
              </p>
            </div>

            <button
              type="button"
              className="primary-action"
              onClick={() => {
                setShowForm((v) => !v);
                setError("");
                setMessage("");
              }}
              style={{
                borderRadius: "10px",
                height: "42px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 800,
                fontSize: "0.72rem",
              }}
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "TUTUP FORM" : "+ CATAT RIDING"}
            </button>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "14px",
              marginTop: "22px",
              paddingTop: "18px",
              borderTop: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div>
              <small style={{ color: "#8b949e", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Total KM Terverifikasi
              </small>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                <CountUpNumber value={totalVerifiedKm} maximumFractionDigits={1} />{" "}
                <span style={{ fontSize: "0.85rem", color: "var(--red)" }}>KM</span>
              </div>
            </div>

            <div>
              <small style={{ color: "#8b949e", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Ride Disetujui
              </small>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                <CountUpNumber value={approvedRides.length} />{" "}
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>log</span>
              </div>
            </div>

            <div>
              <small style={{ color: "#8b949e", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Menunggu Validasi
              </small>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: pendingRides.length > 0 ? "#fbbf24" : "#9ca3af", marginTop: "2px" }}>
                <CountUpNumber value={pendingRides.length} />{" "}
                <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>log</span>
              </div>
            </div>
          </div>

          <RidingStatChart rides={rides} />

          {pendingRides.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.72rem",
                color: "#fef3c7",
              }}
            >
              <Clock size={15} color="#fbbf24" />
              <span>
                Ada <b><CountUpNumber value={pendingRides.length} /> catatan riding</b> yang sedang menunggu validasi Road Captain / Pengurus sebelum masuk ke Total KM & Leaderboard.
              </span>
            </div>
          )}
        </section>

        {error && <p className="error-message" style={{ marginBottom: "16px" }}>{error}</p>}
        {message && (
          <p className="success-message" style={{ marginBottom: "16px" }}>
            <CheckCircle2 size={18} />
            {message}
          </p>
        )}

        {/* INPUT FORM (COLLAPSIBLE / TOGGLEABLE) */}
        {showForm && (
          <section className="form-card card" style={{ marginBottom: "24px" }}>
            <div className="form-heading">
              <Bike />
              <span>
                <em>Catat riding</em>
                <h2>Catat Riding Baru</h2>
                <p>
                  Pilih agenda club atau catat touring mandiri. Odometer awal dan akhir akan menghitung jarak kilometer secara otomatis.
                </p>
              </span>
            </div>

            {!activeAccount ? (
              <div className="notice" style={{ marginTop: "14px" }}>
                Akun member harus aktif untuk mencatat riding.{" "}
                <a href={account ? "/profil" : "/login"}>
                  {account ? "Lihat status akun" : "Masuk sekarang"}
                </a>
              </div>
            ) : (
              <form onSubmit={submit}>
                <label>
                  Pilih Agenda Resmi (Opsional)
                  <select
                    value={eventId}
                    onChange={(event) => {
                      setEventId(event.target.value);
                      const ev = events.find((e) => e.id === event.target.value);
                      if (ev) setTitle(ev.title);
                      else setTitle("");
                    }}
                  >
                    <option value="">Touring / Ride Mandiri (Tanpa Agenda)</option>
                    {events.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.title} · {eventDate(item.start_at)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedEvent && (
                  <p className="system-message" style={{ margin: "4px 0 10px" }}>
                    <CalendarDays size={15} /> Terhubung ke agenda {selectedEvent.type}: <b>{selectedEvent.title}</b>
                  </p>
                )}

                <label>
                  Nama Kegiatan / Destinasi {selectedEvent ? "(Otomatis dari agenda)" : "*"}
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={
                      selectedEvent
                        ? selectedEvent.title
                        : "Contoh: Sowan ke RR Banyuwangi, Sunmori Pasir Putih, dsb."
                    }
                    required={!selectedEvent}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label>
                    Odometer Awal (KM)
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={start}
                      onChange={(event) => setStart(event.target.value)}
                      placeholder="Contoh: 12450"
                      required
                    />
                  </label>

                  <label>
                    Odometer Akhir (KM)
                    <input
                      type="number"
                      min={start || "0"}
                      step="0.1"
                      value={end}
                      onChange={(event) => setEnd(event.target.value)}
                      placeholder="Contoh: 12580"
                      required
                    />
                  </label>
                </div>

                <div className="distance-preview">
                  <Gauge />
                  <span>
                    <small>JARAK TERHITUNG OTOMATIS</small>
                    <b>{distance.toLocaleString("id-ID")} KM</b>
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button className="primary-action" disabled={saving || distance <= 0} style={{ flex: 1 }}>
                    {saving ? "Mengirim Catatan…" : isStaff ? "SIMPAN & VERIFIKASI SEBAGAI PENGURUS" : "KIRIM CATATAN RIDING"}
                  </button>
                  <button
                    type="button"
                    className="outline-action"
                    onClick={() => setShowForm(false)}
                    style={{ padding: "0 18px" }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* RIWAYAT RIDING SAYA */}
        <section className="card">
          <div className="section-title">
            <span>
              <em>Riwayat riding</em>
              <h3>Riwayat Riding Saya</h3>
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700 }}>
              {rides.length} catatan tersimpan
            </span>
          </div>

          {!activeAccount ? (
            <p className="system-message">Silakan masuk dengan akun member aktif untuk melihat riwayat riding.</p>
          ) : rides.length === 0 ? (
            <div style={{ textAlign: "center", padding: "35px 20px" }}>
              <Bike size={38} color="var(--muted)" style={{ margin: "0 auto 10px", opacity: 0.6 }} />
              <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "0.85rem" }}>
                Belum ada catatan riding yang tersimpan.
              </p>
              <button
                type="button"
                className="primary-action"
                onClick={() => setShowForm(true)}
                style={{ fontSize: "0.7rem", height: "38px" }}
              >
                + Catat Riding Pertama
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {rides.map((ride) => {
                const dist = ride.distance_km ?? Math.max(0, ride.odometer_end - ride.odometer_start);
                const isApproved = ride.status === "approved";
                const isPending = ride.status === "pending";

                return (
                  <article
                    key={ride.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderTop: "1px solid var(--line)",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "9px",
                          background: isApproved ? "#edf8f1" : isPending ? "#fef3c7" : "#fff0f1",
                          color: isApproved ? "#158050" : isPending ? "#b45309" : "#dc2626",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Route size={18} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <b style={{ fontSize: "0.84rem", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ride.title || "Touring Mandiri"}
                        </b>
                        <small style={{ color: "var(--muted)", fontSize: "0.68rem", marginTop: "2px" }}>
                          {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(ride.created_at))} · Odometer {ride.odometer_start} → {ride.odometer_end}
                        </small>
                        {ride.status === "rejected" && ride.rejection_reason && (
                          <small style={{ color: "var(--red)", fontSize: "0.65rem", marginTop: "2px", fontWeight: 700 }}>
                            ⚠️ Alasan: {ride.rejection_reason}
                          </small>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ display: "block", fontSize: "0.92rem", color: "var(--ink)" }}>
                          {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(dist)} KM
                        </strong>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            fontWeight: 800,
                            borderRadius: "12px",
                            padding: "2px 7px",
                            display: "inline-block",
                            background: isApproved ? "#eaf8f1" : isPending ? "#fef3c7" : "#fff0f1",
                            color: isApproved ? "#137748" : isPending ? "#b45309" : "#b31221",
                            textTransform: "capitalize",
                          }}
                        >
                          {isApproved ? "Disetujui" : isPending ? "Menunggu Validasi" : "Ditolak"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          type="button"
                          title="Edit catatan ini"
                          onClick={() => {
                            setEditModalData({
                              id: ride.id,
                              memberExternalId: activeAccount.member_external_id,
                              memberName: displayName,
                              title: ride.title || "Touring Mandiri",
                              km: dist,
                              date: ride.created_at ? ride.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                            });
                            setEditModalOpen(true);
                          }}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            background: "#fff",
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            color: "var(--ink)",
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          title="Hapus catatan ini"
                          onClick={async () => {
                            if (!confirm(`Hapus catatan "${ride.title || "Riding"}"?`)) return;
                            try {
                              await deleteRideLog(ride.id, activeAccount.member_external_id);
                              await loadData();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : "Gagal menghapus");
                            }
                          }}
                          style={{
                            width: "30px",
                            height: "30px",
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
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editModalData}
        onSaved={() => void loadData()}
        onDeleted={() => void loadData()}
      />
    </AppShell>
  );
}
