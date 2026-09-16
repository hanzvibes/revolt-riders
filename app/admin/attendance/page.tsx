"use client";

import { AppShell } from "@/components/app-shell";
import type { EventRecord } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Check, ClipboardCheck, ShieldAlert, UserCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Account = { role: string };
type Member = { member_external_id: string; full_name: string; nickname: string | null };
type Attendance = { id: string; event_id: string; member_external_id: string; checked_in_at: string; method: "qr" | "manual" };
type Rsvp = { event_id: string; member_external_id: string; status: "attending" | "declined" | "maybe" };

const canManageAttendance = (role?: string) => ["road_captain", "admin", "superadmin"].includes(role || "");

export default function AttendancePage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const accountResult = user ? await supabase.from("member_accounts").select("role").eq("user_id", user.id).maybeSingle() : { data: null };
    const nextAccount = accountResult.data as Account | null;
    setAccount(nextAccount);
    if (!canManageAttendance(nextAccount?.role)) { setLoading(false); return; }
    const [eventResult, memberResult, attendanceResult, rsvpResult] = await Promise.all([
      supabase.from("events").select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status").in("status", ["published", "completed"]).order("start_at", { ascending: false }),
      supabase.from("member_profiles").select("member_external_id,full_name,nickname").order("full_name"),
      supabase.from("event_attendance").select("id,event_id,member_external_id,checked_in_at,method").order("checked_in_at", { ascending: false }),
      supabase.from("event_rsvps").select("event_id,member_external_id,status"),
    ]);
    if (eventResult.error || memberResult.error || attendanceResult.error || rsvpResult.error) setError(eventResult.error?.message || memberResult.error?.message || attendanceResult.error?.message || rsvpResult.error?.message || "Data kehadiran belum dapat dimuat.");
    const nextEvents = (eventResult.data ?? []) as EventRecord[];
    setEvents(nextEvents); setMembers((memberResult.data ?? []) as Member[]); setAttendance((attendanceResult.data ?? []) as Attendance[]); setRsvps((rsvpResult.data ?? []) as Rsvp[]);
    setSelectedEvent((current) => current || nextEvents[0]?.id || "");
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel("attendance-admin-live").on("postgres_changes", { event: "*", schema: "public", table: "event_attendance" }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const memberById = useMemo(() => new Map(members.map((member) => [member.member_external_id, member])), [members]);
  const eventAttendance = attendance.filter((row) => row.event_id === selectedEvent);
  const attendingRsvp = rsvps.filter((row) => row.event_id === selectedEvent && row.status === "attending");
  const attendanceRate = attendingRsvp.length ? Math.round((eventAttendance.length / attendingRsvp.length) * 100) : 0;

  const manualCheckIn = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi pengurus tidak ditemukan.");
      const { error: insertError } = await supabase.from("event_attendance").insert({ event_id: selectedEvent, member_external_id: memberId, method: "manual", checked_in_by: user.id });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("Member ini sudah tercatat hadir pada agenda yang dipilih.");
        throw insertError;
      }
      setMessage("Kehadiran manual berhasil dicatat."); setMemberId(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Kehadiran belum dapat dicatat."); }
    finally { setSaving(false); }
  };

  if (loading) return <AppShell active="Kehadiran" title="Kehadiran"><div className="page-wrap"><p>Memeriksa akses…</p></div></AppShell>;
  if (!canManageAttendance(account?.role)) return <AppShell active="Kehadiran" title="Kehadiran"><div className="page-wrap"><section className="empty-state card"><ShieldAlert/><h2>Akses pengurus diperlukan</h2><p>Dashboard kehadiran tersedia untuk Road Captain, Admin, dan Superadmin.</p><a className="primary-action" href="/login">MASUK</a></section></div></AppShell>;

  return <AppShell active="Kehadiran" title="Kehadiran"><div className="page-wrap"><div className="page-intro"><div><em>EVENT ATTENDANCE</em><h2>Kehadiran Agenda</h2><p>Pantau check-in QR secara live atau catat kehadiran manual saat diperlukan.</p></div></div><section className="attendance-workspace"><section className="card attendance-dashboard"><div className="section-title"><span><em>LIVE CHECK-IN</em><h3>Dashboard Kehadiran</h3></span><span className="live-status">● LIVE</span></div><label className="rsvp-select">Agenda<select value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)}><option value="">Pilih agenda</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>{!selectedEvent ? <p className="system-message">Belum ada agenda untuk dipantau.</p> : <><div className="attendance-stats"><article><small>RSVP HADIR</small><b>{attendingRsvp.length}</b></article><article><small>CHECK-IN</small><b>{eventAttendance.length}</b></article><article><small>ATTENDANCE RATE</small><b>{attendanceRate}%</b></article></div><div className="attendance-list">{eventAttendance.length === 0 ? <p className="system-message">Belum ada member yang check-in.</p> : eventAttendance.map((row) => { const member = memberById.get(row.member_external_id); return <article key={row.id}><i>{(member?.nickname || member?.full_name || row.member_external_id).slice(0, 2).toUpperCase()}</i><span><b>{member?.nickname || member?.full_name || row.member_external_id}</b><small>{row.member_external_id} · {new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(row.checked_in_at))} WIB</small></span><em>{row.method === "manual" ? "Manual" : "QR"}</em></article>; })}</div></>}</section><section className="form-card card manual-checkin"><div className="form-heading"><UserCheck/><span><em>CADANGAN</em><h2>Check-in manual</h2><p>Gunakan bila member tidak dapat memindai QR.</p></span></div><form onSubmit={manualCheckIn}><label>Agenda<select value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)} required><option value="">Pilih agenda</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><label>Member<select value={memberId} onChange={(event) => setMemberId(event.target.value)} required><option value="">Pilih member</option>{members.map((member) => <option key={member.member_external_id} value={member.member_external_id}>{member.nickname || member.full_name} · {member.member_external_id}</option>)}</select></label>{message && <p className="success-message"><Check/>{message}</p>}{error && <p className="error-message">{error}</p>}<button className="primary-action" disabled={saving || !selectedEvent}>{saving ? "MENYIMPAN…" : "CATAT KEHADIRAN"}</button></form></section></section></div></AppShell>;
}
