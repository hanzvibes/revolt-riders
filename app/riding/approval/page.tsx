"use client";

import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Bike, Check, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Account = { role: string; status: "pending" | "active" | "inactive" };
type Ride = { id: string; member_external_id: string; odometer_start: number; odometer_end: number; distance_km: number | null; created_at: string; status: "pending" | "approved" | "rejected" };
type Member = { member_external_id: string; full_name: string; nickname: string | null };

const canReview = (role?: string) => ["road_captain", "admin", "superadmin"].includes(role || "");

export default function RideApprovalPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rejectingId, setRejectingId] = useState("");
  const [reason, setReason] = useState("");

  const memberById = useMemo(() => new Map(members.map((member) => [member.member_external_id, member])), [members]);

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: accountData } = user ? await supabase.from("member_accounts").select("role,status").eq("user_id", user.id).maybeSingle() : { data: null };
    const nextAccount = accountData as Account | null;
    setAccount(nextAccount);
    if (nextAccount?.status !== "active" || !canReview(nextAccount.role)) { setLoading(false); return; }
    const [{ data: rideData, error: rideError }, { data: memberData }] = await Promise.all([
      supabase.from("ride_logs").select("id,member_external_id,odometer_start,odometer_end,distance_km,created_at,status").eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("member_profiles").select("member_external_id,full_name,nickname"),
    ]);
    if (rideError) setError(rideError.message);
    setRides((rideData ?? []).map((ride) => ({ ...ride, odometer_start: Number(ride.odometer_start), odometer_end: Number(ride.odometer_end), distance_km: ride.distance_km === null ? null : Number(ride.distance_km) })) as Ride[]);
    setMembers((memberData ?? []) as Member[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const review = async (ride: Ride, status: "approved" | "rejected") => {
    setError(""); setMessage("");
    if (status === "rejected" && !reason.trim()) return setError("Tuliskan alasan penolakan agar member tahu yang perlu diperbaiki.");
    setBusyId(ride.id);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi pengurus tidak ditemukan.");
      const { error: updateError } = await supabase.from("ride_logs").update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === "rejected" ? reason.trim() : null,
      }).eq("id", ride.id).eq("status", "pending");
      if (updateError) throw updateError;
      setMessage(status === "approved" ? "Ride disetujui dan masuk hitungan kilometer." : "Ride ditolak. Member dapat mengirim data yang benar.");
      setRejectingId(""); setReason("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ride belum dapat diperbarui.");
    } finally {
      setBusyId("");
    }
  };

  if (loading) return <AppShell active="Validasi Ride" title="Validasi Riding"><div className="page-wrap"><p>Memeriksa akses…</p></div></AppShell>;
  if (account?.status !== "active" || !canReview(account?.role)) return <AppShell active="Validasi Ride" title="Validasi Riding"><div className="page-wrap"><section className="empty-state card"><ShieldAlert/><h2>Akses Road Captain diperlukan</h2><p>Halaman validasi riding hanya tersedia untuk akun aktif dengan role Road Captain, Admin, atau Superadmin.</p><a className="primary-action" href={account?"/profil":"/login"}>{account?"LIHAT STATUS AKUN":"MASUK"}</a></section></div></AppShell>;

  return <AppShell active="Validasi Ride" title="Validasi Riding"><div className="page-wrap"><div className="page-intro"><div><em>RIDE APPROVAL</em><h2>Menunggu Validasi</h2><p>Setujui hanya data odometer yang valid. Ride disetujui akan menambah statistik member.</p></div></div>{error && <p className="error-message">{error}</p>}{message && <p className="success-message"><Check/>{message}</p>}<section className="card ride-approval"><div className="section-title"><span><em>PENDING</em><h3>Ride Log Masuk</h3></span><b>{rides.length}</b></div>{rides.length === 0 ? <p className="system-message">Tidak ada ride log yang menunggu validasi.</p> : rides.map((ride) => { const member = memberById.get(ride.member_external_id); const distance = ride.distance_km ?? Math.max(0, ride.odometer_end - ride.odometer_start); return <article key={ride.id}><div className="ride-approval-top"><i><Bike/></i><span><b>{member?.nickname || member?.full_name || ride.member_external_id}</b><small>{ride.member_external_id} · dikirim {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(ride.created_at))} WIB</small></span><strong>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(distance)} KM</strong></div><dl><div><dt>Odometer awal</dt><dd>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(ride.odometer_start)} KM</dd></div><div><dt>Odometer akhir</dt><dd>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(ride.odometer_end)} KM</dd></div></dl>{rejectingId === ride.id ? <div className="reject-box"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan penolakan" autoFocus/><button className="dark-action" disabled={busyId === ride.id} onClick={() => void review(ride, "rejected")}><X/>TOLAK RIDE</button><button className="text-action" onClick={() => { setRejectingId(""); setReason(""); }}>Batal</button></div> : <div className="ride-actions"><button className="dark-action" disabled={busyId === ride.id} onClick={() => void review(ride, "approved")}><Check/>SETUJUI</button><button className="outline-action" disabled={busyId === ride.id} onClick={() => setRejectingId(ride.id)}><X/>TOLAK</button></div>}</article>; })}</section></div></AppShell>;
}
