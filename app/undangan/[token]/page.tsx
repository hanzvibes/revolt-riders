"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CalendarDays, Check, MapPin, MessageSquare, UsersRound, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PublicInvitation = { event_id: string; event_title: string; event_description: string | null; location_name: string | null; location_url: string | null; start_at: string; member_external_id: string; rsvp_status: "attending" | "declined" | "maybe" | null; guest_count: number };
type Attendee = { member_external_id: string; display_name: string; guest_count: number; rsvp_status: "attending" | "maybe" };

const formatEventTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)).replace(".", ":") + " WIB";

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = String(params.token ?? "");
  const [data, setData] = useState<PublicInvitation | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async (initial = false) => {
    const supabase = getSupabaseBrowserClient();
    const [invitationResult, attendeeResult] = await Promise.all([
      supabase.rpc("get_public_invitation", { p_token: token }),
      supabase.rpc("get_public_event_attendees", { p_token: token }),
    ]);
    if (invitationResult.error) setError(invitationResult.error.message);
    else {
      const invitation = ((invitationResult.data ?? [])[0] as PublicInvitation | undefined) ?? null;
      setData(invitation);
      if (initial) setGuestCount(invitation?.guest_count ?? 0);
    }
    if (!attendeeResult.error) setAttendees((attendeeResult.data ?? []) as Attendee[]);
    if (initial) setLoading(false);
  }, [token]);

  useEffect(() => {
    void load(true);
    const refresh = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  const answer = async (status: "attending" | "declined" | "maybe") => {
    setSaving(true); setError(""); setSuccess("");
    const result = await getSupabaseBrowserClient().rpc("submit_invitation_rsvp", {
      p_token: token, p_status: status, p_guest_count: status === "attending" ? guestCount : 0, p_note: note.trim() || null,
    });
    if (result.error) setError(result.error.message);
    else {
      setSuccess(status === "attending" ? "Kehadiranmu sudah dikonfirmasi. Sampai jumpa di lokasi!" : status === "maybe" ? "Respons mungkin hadir sudah tersimpan." : "Responsmu sudah tersimpan. Terima kasih sudah mengabari.");
      await load(true);
    }
    setSaving(false);
  };

  const confirmed = attendees.filter((attendee) => attendee.rsvp_status === "attending");

  return <main className="invitation-page"><section className="invitation-card">
    <img src="/revolt-riders-logo.jpg" alt="Revolt Riders" />
    <em>UNDANGAN PERSONAL · {data?.member_external_id ?? "REVOLT RIDERS"}</em>
    {loading ? <h1>Memuat undangan…</h1> : !data ? <><h1>Undangan tidak ditemukan</h1><p>Token mungkin tidak valid atau agenda sudah tidak aktif.</p></> : <>
      <h1>{data.event_title}</h1><p>{data.event_description ?? "Kehadiranmu adalah bagian penting dari perjalanan kita."}</p>
      <div className="invitation-details"><span><CalendarDays /><b>{formatEventTime(data.start_at)}</b></span><span><MapPin /><b>{data.location_name ?? "Lokasi akan diumumkan"}</b></span></div>
      {data.location_url && <a className="dark-action" href={data.location_url} target="_blank" rel="noreferrer">BUKA LOKASI</a>}
      <h2>Konfirmasi kehadiran</h2>
      <div className="rsvp-actions rsvp-actions-three"><button disabled={saving} className={data.rsvp_status === "attending" ? "selected" : ""} onClick={() => void answer("attending")}><Check />Hadir</button><button disabled={saving} className={data.rsvp_status === "maybe" ? "selected" : ""} onClick={() => void answer("maybe")}><UsersRound />Mungkin</button><button disabled={saving} className={data.rsvp_status === "declined" ? "selected" : ""} onClick={() => void answer("declined")}><X />Tidak hadir</button></div>
      <div className="invitation-extra"><label>Jumlah tamu tambahan<select value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))} disabled={saving || data.rsvp_status === "declined"}>{Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>{value} tamu</option>)}</select></label><label><MessageSquare />Catatan untuk pengurus<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Opsional, misalnya datang menyusul." /></label></div>
      <section className="attendee-preview"><div><UsersRound /><span><em>WHO'S COMING</em><h2>{confirmed.length} Member hadir</h2></span></div>{attendees.length === 0 ? <p>Belum ada member yang mengonfirmasi kehadiran.</p> : <div className="attendee-chips">{attendees.slice(0, 18).map((attendee) => <span key={attendee.member_external_id} title={attendee.member_external_id}><i>{attendee.display_name.slice(0, 2).toUpperCase()}</i>{attendee.display_name}{attendee.guest_count > 0 && <small>+{attendee.guest_count}</small>}</span>)}</div>}</section>
    </>}
    {success && <p className="success-message"><Check />{success}</p>}{error && <p className="error-message">{error}</p>}<footer>REVOLT RIDERS · RR XXII · SITUBONDO</footer>
  </section></main>;
}
