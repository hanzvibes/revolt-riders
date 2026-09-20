"use client";

import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { reviewRideLog } from "@/lib/services/ride-log-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Bike, Check, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Ride = {
  id: string;
  member_external_id: string;
  title: string | null;
  event_id: string | null;
  odometer_start: number;
  odometer_end: number;
  distance_km: number | null;
  created_at: string;
  status: "pending" | "approved" | "rejected";
};
type RideRow = Omit<Ride, "odometer_start" | "odometer_end" | "distance_km"> & {
  odometer_start: number | string;
  odometer_end: number | string;
  distance_km: number | string | null;
};
type Member = { member_external_id: string; full_name: string; nickname: string | null };
type EventItem = { id: string; title: string; type: string };
type RideApprovalSnapshot = {
  rides: Ride[];
  members: Member[];
  events: EventItem[];
};

const canReview = (role?: string) => ["road_captain", "admin", "superadmin"].includes(role || "");

export default function RideApprovalPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [rides, setRides] = useState<Ride[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [reason, setReason] = useState("");

  const memberById = useMemo(() => new Map(members.map((member) => [member.member_external_id, member])), [members]);
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const load = useCallback(async (forceRefresh = false) => {
    if (accessLoading) return;

    if (account?.status !== "active" || !canReview(account.role)) {
      setLoading(false);
      return;
    }

    if (!forceRefresh) setLoading(true);
    setError("");

    try {
      const snapshot = await fetchWithCache<RideApprovalSnapshot>(
        "riding:approval",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [rideResult, memberResult, eventResult] = await Promise.all([
            supabase
              .from("ride_logs")
              .select(
                "id,member_external_id,title,event_id,odometer_start,odometer_end,distance_km,created_at,status",
              )
              .eq("status", "pending")
              .order("created_at", { ascending: true }),
            supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname"),
            supabase.from("events").select("id,title,type"),
          ]);

          const failed =
            rideResult.error || memberResult.error || eventResult.error;
          if (failed) throw failed;

          return {
            rides: ((rideResult.data ?? []) as RideRow[]).map((ride) => ({
              ...ride,
              odometer_start: Number(ride.odometer_start),
              odometer_end: Number(ride.odometer_end),
              distance_km:
                ride.distance_km === null ? null : Number(ride.distance_km),
            })) as Ride[],
            members: (memberResult.data ?? []) as Member[],
            events: (eventResult.data ?? []) as EventItem[],
          };
        },
        { ttlMs: 20_000, forceRefresh },
      );

      setRides(snapshot.rides);
      setMembers(snapshot.members);
      setEvents(snapshot.events);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ride yang menunggu validasi belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessLoading, account, fetchWithCache]);

  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  const review = async (ride: Ride, status: "approved" | "rejected") => {
    setError(""); setMessage("");
    if (status === "rejected" && !reason.trim()) return setError("Tuliskan alasan penolakan agar member tahu yang perlu diperbaiki.");
    setBusyId(ride.id);
    try {
      await reviewRideLog(
        ride.id,
        status,
        status === "rejected" ? reason.trim() : undefined,
      );
      setMessage(status === "approved" ? "Ride disetujui dan masuk hitungan kilometer." : "Ride ditolak. Member dapat mengirim data yang benar.");
      setRejectingId("");
      setReason("");
      invalidateCache("riding:approval");
      invalidateCache("riding:");
      invalidateCache("profile:");
      invalidateCache("dashboard_member_profile_");
      invalidateCache("dashboard_club_stats");
      invalidateCache("riding_leaderboard_data");
      await load(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ride belum dapat diperbarui.");
    } finally {
      setBusyId("");
    }
  };

  if (accessLoading || loading) return <AppShell active="Validasi Ride" title="Validasi Riding"><PageSkeleton title="Memuat Validasi Riding..." /></AppShell>;
  if (account?.status !== "active" || !canReview(account?.role)) return <AppShell active="Validasi Ride" title="Validasi Riding"><div className="page-wrap"><section className="empty-state card"><ShieldAlert/><h2>Akses Road Captain diperlukan</h2><p>Halaman validasi riding hanya tersedia untuk akun aktif dengan role Road Captain, Admin, atau Superadmin.</p><a className="primary-action" href={account?"/profil":"/login"}>{account?"LIHAT STATUS AKUN":"MASUK"}</a></section></div></AppShell>;

  return (
    <AppShell active="Validasi Ride" title="Validasi Riding">
      <div className="page-wrap">
        <div className="page-intro">
          <div>
            <em>Validasi riding</em>
            <h2>Menunggu Validasi</h2>
            <p>Setujui data odometer & tujuan riding yang valid. Ride yang disetujui akan otomatis menambah akumulasi kilometer member.</p>
          </div>
        </div>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message"><Check/>{message}</p>}
        <section className="card ride-approval">
          <div className="section-title">
            <span><em>Menunggu</em><h3>Ride Log Masuk</h3></span>
            <b>{rides.length}</b>
          </div>
          {rides.length === 0 ? (
            <p className="system-message">Tidak ada ride log yang menunggu validasi.</p>
          ) : (
            rides.map((ride) => {
              const member = memberById.get(ride.member_external_id);
              const event = ride.event_id ? eventById.get(ride.event_id) : null;
              const distance = ride.distance_km ?? Math.max(0, ride.odometer_end - ride.odometer_start);
              const displayTitle = ride.title || (event ? event.title : "Ride Mandiri (Tanpa Judul)");

              return (
                <article key={ride.id}>
                  <div className="ride-approval-top">
                    <i><Bike/></i>
                    <span>
                      <b>{member?.nickname || member?.full_name || ride.member_external_id}</b>
                      <small>{ride.member_external_id} · {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(ride.created_at))} WIB</small>
                    </span>
                    <strong>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(distance)} KM</strong>
                  </div>

                  <div style={{ margin: "8px 0 10px", padding: "8px 12px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)" }}>
                      Kegiatan: {displayTitle}
                    </div>
                    {event && (
                      <small style={{ color: "var(--red)", fontWeight: 700, textTransform: "uppercase", fontSize: "0.65rem", display: "inline-block", marginTop: "2px" }}>
                        Agenda Resmi: {event.title} ({event.type})
                      </small>
                    )}
                  </div>

                  <dl>
                    <div><dt>Odometer awal</dt><dd>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(ride.odometer_start)} KM</dd></div>
                    <div><dt>Odometer akhir</dt><dd>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(ride.odometer_end)} KM</dd></div>
                  </dl>

                  {rejectingId === ride.id ? (
                    <div className="reject-box">
                      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan penolakan" autoFocus/>
                      <button className="dark-action" disabled={busyId === ride.id} onClick={() => void review(ride, "rejected")}><X/>TOLAK RIDE</button>
                      <button className="text-action" onClick={() => { setRejectingId(""); setReason(""); }}>Batal</button>
                    </div>
                  ) : (
                    <div className="ride-actions">
                      <button className="dark-action" disabled={busyId === ride.id} onClick={() => void review(ride, "approved")}><Check/>SETUJUI</button>
                      <button className="outline-action" disabled={busyId === ride.id} onClick={() => setRejectingId(ride.id)}><X/>TOLAK</button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
