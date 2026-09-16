/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { AppShell } from "@/components/app-shell";
import type { EventRecord } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CalendarPlus,
  Check,
  Copy,
  Download,
  Link2,
  RefreshCw,
  ScanLine,
  Send,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Account = { role: string; status: "pending" | "active" | "inactive" };
type PendingRequest = { id: string; user_id: string; member_external_id: string; email: string | null };
type Member = { member_external_id: string; full_name: string; nickname: string | null };
type Invitation = { event_id: string; member_external_id: string };
type Rsvp = { event_id: string; member_external_id: string; status: "attending" | "declined" | "maybe"; guest_count: number; responded_at: string };
type BulkLink = { memberId: string; name: string; url: string };
type ManagedAccount = { id: string; member_external_id: string; role: "member" | "road_captain" | "treasurer" | "admin" | "superadmin"; status: string };
const roles: ManagedAccount["role"][] = ["member", "road_captain", "treasurer", "admin", "superadmin"];

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadLinks(links: BulkLink[], eventTitle: string) {
  const rows = [
    ["Member ID", "Nama", "Link Undangan"],
    ...links.map((link) => [link.memberId, link.name, link.url]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = `undangan-${slugify(eventTitle || "revolt-riders")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export default function AdminPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("kopdar");
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [meetup, setMeetup] = useState("");
  const [end, setEnd] = useState("");
  const [memberId, setMemberId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [rsvpEvent, setRsvpEvent] = useState("");
  const [checkinEvent, setCheckinEvent] = useState("");
  const [invitation, setInvitation] = useState("");
  const [checkinCode, setCheckinCode] = useState("");
  const [bulkLinks, setBulkLinks] = useState<BulkLink[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const publishedEvents = useMemo(() => events.filter((event) => event.status === "published"), [events]);
  const activeMembers = members;
  const selectedRsvpEvent = rsvpEvent || publishedEvents[0]?.id || "";
  const selectedRsvpEventRecord = events.find((event) => event.id === selectedRsvpEvent);
  const memberById = useMemo(() => new Map(members.map((member) => [member.member_external_id, member])), [members]);

  const eventStats = useMemo(() => {
    const invited = invitations.filter((row) => row.event_id === selectedRsvpEvent);
    const answers = rsvps.filter((row) => row.event_id === selectedRsvpEvent);
    const responseByMember = new Map(answers.map((row) => [row.member_external_id, row]));
    const attending = answers.filter((row) => row.status === "attending");
    return {
      invited: invited.length,
      attending: attending.length,
      declined: answers.filter((row) => row.status === "declined").length,
      maybe: answers.filter((row) => row.status === "maybe").length,
      noResponse: Math.max(invited.length - responseByMember.size, 0),
      guests: attending.reduce((total, row) => total + Math.max(row.guest_count || 0, 0), 0),
      responseRate: invited.length ? Math.round((responseByMember.size / invited.length) * 100) : 0,
      attendees: answers
        .slice()
        .sort((a, b) => b.responded_at.localeCompare(a.responded_at))
        .map((rsvp) => ({ rsvp, member: memberById.get(rsvp.member_external_id) })),
    };
  }, [invitations, memberById, rsvps, selectedRsvpEvent]);

  const load = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    const accountResult = user ? await supabase.from("member_accounts").select("role,status").eq("user_id", user.id).maybeSingle() : { data: null };
    const isActiveAdmin = accountResult.data?.status === "active" && ["admin", "superadmin"].includes(accountResult.data.role);
    const isSuperadmin = isActiveAdmin && accountResult.data?.role === "superadmin";
    setAccount(accountResult.data as Account | null);
    if (!isActiveAdmin) { setLoading(false); return; }
    const [eventResult, requestResult, memberResult, invitationResult, rsvpResult, managedAccountResult] = await Promise.all([
      supabase.from("events").select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status").order("start_at", { ascending: false }),
      supabase.from("member_account_requests").select("id,user_id,member_external_id,email").eq("status", "pending").order("created_at"),
      supabase.from("member_profiles").select("member_external_id,full_name,nickname").order("full_name"),
      supabase.from("event_invitations").select("event_id,member_external_id"),
      supabase.from("event_rsvps").select("event_id,member_external_id,status,guest_count,responded_at"),
      isSuperadmin ? supabase.from("member_accounts").select("id,member_external_id,role,status").order("member_external_id") : Promise.resolve({ data: [] }),
    ]);
    setEvents((eventResult.data ?? []) as EventRecord[]);
    setRequests((requestResult.data ?? []) as PendingRequest[]);
    setMembers((memberResult.data ?? []) as Member[]);
    setInvitations((invitationResult.data ?? []) as Invitation[]);
    setRsvps((rsvpResult.data ?? []) as Rsvp[]);
    setManagedAccounts((managedAccountResult.data ?? []) as ManagedAccount[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-rsvp-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "event_rsvps" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_invitations" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const createEvent = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Sesi admin tidak ditemukan.");
    const { error: insertError } = await supabase.from("events").insert({
      title,
      slug: `${slugify(title)}-${Date.now().toString().slice(-6)}`,
      type,
      location_name: location,
      location_url: locationUrl.trim() || null,
      description: description.trim() || null,
      start_at: new Date(start).toISOString(),
      meetup_at: meetup ? new Date(meetup).toISOString() : null,
      end_at: end ? new Date(end).toISOString() : null,
      status: "published",
      published_at: new Date().toISOString(),
      created_by: user.id,
    });
    if (insertError) setError(insertError.message);
    else {
      setMessage("Agenda berhasil dipublikasikan.");
      setTitle(""); setLocation(""); setLocationUrl(""); setDescription(""); setStart(""); setMeetup(""); setEnd("");
      await load();
    }
  };

  const generateInvite = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setInvitation("");
    const token = secureToken();
    const tokenHash = await sha256(token);
    const { error: upsertError } = await getSupabaseBrowserClient().from("event_invitations").upsert({
      event_id: selectedEvent,
      member_external_id: memberId.trim().toUpperCase(),
      token_hash: tokenHash,
    }, { onConflict: "event_id,member_external_id" });
    if (upsertError) setError(upsertError.message);
    else {
      setInvitation(`${window.location.origin}/undangan/${token}`);
      await load();
    }
  };

  const generateBulkInvites = async () => {
    if (!selectedEvent) return setError("Pilih agenda terlebih dahulu.");
    const event = events.find((row) => row.id === selectedEvent);
    if (!event) return setError("Agenda tidak ditemukan.");
    const existing = invitations.filter((row) => row.event_id === selectedEvent).length;
    if (existing > 0 && !window.confirm(`Agenda ini sudah memiliki ${existing} undangan. Generate ulang akan menonaktifkan link lama. Lanjutkan?`)) return;
    setBulkLoading(true); setError(""); setMessage(""); setBulkLinks([]);
    try {
      const tokens = activeMembers.map((member) => ({ member, token: secureToken() }));
      const rows = await Promise.all(tokens.map(async ({ member, token }) => ({
        event_id: selectedEvent,
        member_external_id: member.member_external_id,
        token_hash: await sha256(token),
      })));
      const { error: upsertError } = await getSupabaseBrowserClient().from("event_invitations").upsert(rows, { onConflict: "event_id,member_external_id" });
      if (upsertError) throw upsertError;
      const links = tokens.map(({ member, token }) => ({
        memberId: member.member_external_id,
        name: member.nickname || member.full_name,
        url: `${window.location.origin}/undangan/${token}`,
      }));
      setBulkLinks(links);
      downloadLinks(links, event.title);
      setMessage(`${links.length} undangan personal dibuat. CSV link sudah diunduh; simpan sebelum meninggalkan halaman.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Undangan massal belum berhasil dibuat.");
    } finally {
      setBulkLoading(false);
    }
  };

  const generateCheckinCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setCheckinCode("");
    const raw = `RR-${secureToken().slice(0, 12).toUpperCase()}`;
    const codeHash = await sha256(raw);
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Sesi admin tidak ditemukan.");
    const now = Date.now();
    const { error: insertError } = await supabase.from("event_checkin_codes").insert({
      event_id: checkinEvent,
      code_hash: codeHash,
      active_from: new Date(now - 60 * 60 * 1000).toISOString(),
      active_until: new Date(now + 12 * 60 * 60 * 1000).toISOString(),
      created_by: user.id,
    });
    if (insertError) setError(insertError.message);
    else setCheckinCode(raw);
  };

  const approveRequest = async (request: PendingRequest) => {
    setError("");
    const { error: approveError } = await getSupabaseBrowserClient().rpc("approve_member_account_request", { p_request_id: request.id, p_role: "member" });
    if (approveError) return setError(approveError.message);
    setMessage(`${request.member_external_id} berhasil diverifikasi sebagai member.`);
    await load();
  };

  const changeRole = async (managedAccount: ManagedAccount, nextRole: ManagedAccount["role"]) => {
    if (managedAccount.role === nextRole) return;
    if (!window.confirm(`Ubah role ${managedAccount.member_external_id} menjadi ${nextRole.replaceAll("_", " ")}?`)) return;
    setError(""); setMessage("");
    const { error: roleError } = await getSupabaseBrowserClient().rpc("set_member_account_role", { p_account_id: managedAccount.id, p_role: nextRole });
    if (roleError) return setError(roleError.message);
    setMessage(`Role ${managedAccount.member_external_id} diperbarui menjadi ${nextRole.replaceAll("_", " ")}.`);
    await load();
  };

  const changeEventStatus = async (eventRecord: EventRecord, nextStatus: EventRecord["status"]) => {
    if (eventRecord.status === nextStatus) return;
    if (nextStatus === "cancelled" && !window.confirm(`Batalkan agenda ${eventRecord.title}? Undangan dan histori respons tetap disimpan.`)) return;
    setError(""); setMessage("");
    const payload: { status: EventRecord["status"]; published_at?: string | null } = { status: nextStatus };
    if (nextStatus === "published") payload.published_at = new Date().toISOString();
    const { error: statusError } = await getSupabaseBrowserClient().from("events").update(payload).eq("id", eventRecord.id);
    if (statusError) return setError(statusError.message);
    setMessage(`Status agenda ${eventRecord.title} diperbarui menjadi ${nextStatus}.`);
    await load();
  };

  if (loading) return <AppShell active="Admin" title="Admin"><div className="page-wrap"><p>Memeriksa izin…</p></div></AppShell>;
  if (!account || account.status !== "active" || !["admin", "superadmin"].includes(account.role)) return <AppShell active="Admin" title="Admin"><div className="page-wrap"><section className="empty-state card"><ShieldAlert/><h2>Akses pengurus diperlukan</h2><p>Halaman ini hanya tersedia untuk akun aktif Admin dan Superadmin.</p><a className="primary-action" href={account?"/profil":"/login"}>{account?"LIHAT STATUS AKUN":"MASUK"}</a></section></div></AppShell>;

  return <AppShell active="Admin" title="Admin">
    <div className="page-wrap admin-grid">
      <section className="form-card card">
        <div className="form-heading"><CalendarPlus/><span><em>AGENDA</em><h2>Buat & publish agenda</h2><p>Agenda langsung tampil pada dashboard member.</p></span></div>
        <form onSubmit={createEvent}>
          <label>Judul agenda<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3}/></label>
          <label>Jenis<select value={type} onChange={(event) => setType(event.target.value)}><option value="kopdar">Kopdar</option><option value="riding">Riding</option><option value="touring">Touring</option><option value="social">Sosial</option><option value="other">Lainnya</option></select></label>
          <label>Lokasi<input value={location} onChange={(event) => setLocation(event.target.value)} required/></label>
          <label>Link lokasi (opsional)<input type="url" value={locationUrl} onChange={(event) => setLocationUrl(event.target.value)} placeholder="https://maps.google.com/..."/></label>
          <label>Deskripsi agenda (opsional)<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Info singkat untuk member" maxLength={500}/></label>
          <label>Mulai (WIB)<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required/></label>
          <label>Titik kumpul (opsional)<input type="datetime-local" value={meetup} onChange={(event) => setMeetup(event.target.value)}/></label>
          <label>Selesai (opsional)<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)}/></label>
          <button className="primary-action"><Send/>PUBLISH AGENDA</button>
        </form>
      </section>

      <section className="card event-management admin-wide">
        <div className="section-title"><span><em>STATUS AGENDA</em><h3>Kelola agenda terbit</h3></span><CalendarPlus/></div>
        <p className="role-panel-intro">Tandai agenda selesai agar masuk ke riwayat komunitas, atau batalkan tanpa menghapus data RSVP dan kehadiran.</p>
        {events.length === 0 ? <p className="system-message">Belum ada agenda untuk dikelola.</p> : <div className="event-management-list">{events.slice(0, 12).map((eventRecord) => <article key={eventRecord.id}><time>{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(eventRecord.start_at))}</time><span><b>{eventRecord.title}</b><small>{eventRecord.location_name || "Lokasi belum ditentukan"}</small></span><em className={`event-status event-status-${eventRecord.status}`}>{eventRecord.status}</em><select value={eventRecord.status} onChange={(event) => void changeEventStatus(eventRecord, event.target.value as EventRecord["status"])} aria-label={`Status agenda ${eventRecord.title}`}><option value="draft">Draft</option><option value="published">Published</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select></article>)}</div>}
      </section>

      <section className="form-card card">
        <div className="form-heading"><Link2/><span><em>UNDANGAN</em><h2>Buat link personal</h2><p>Token mentah hanya tampil sekali; database hanya menyimpan hash.</p></span></div>
        <form onSubmit={generateInvite}>
          <label>Agenda<select value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)} required><option value="">Pilih agenda</option>{publishedEvents.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
          <label>Member ID<input value={memberId} onChange={(event) => setMemberId(event.target.value)} placeholder="RR-014" required/></label>
          <button className="dark-action"><Link2/>GENERATE LINK</button>
        </form>
        {invitation && <div className="generated-link"><Check/><span><b>Link siap dibagikan</b><small>{invitation}</small></span><button onClick={() => navigator.clipboard.writeText(invitation)} aria-label="Salin link"><Copy/></button></div>}
      </section>

      <section className="form-card card admin-wide">
        <div className="form-heading"><Users/><span><em>UNDANGAN MASSAL</em><h2>Siapkan semua link personal</h2><p>Satu link unik dibuat untuk setiap member aktif dan diunduh dalam CSV, siap dibagikan lewat WhatsApp.</p></span></div>
        <div className="bulk-controls">
          <label>Agenda<select value={selectedEvent} onChange={(event) => setSelectedEvent(event.target.value)}><option value="">Pilih agenda</option>{publishedEvents.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
          <div><b>{activeMembers.length} member aktif</b><small>Generate ulang akan mengganti seluruh link undangan agenda ini.</small></div>
          <button className="primary-action" onClick={() => void generateBulkInvites()} disabled={bulkLoading || !selectedEvent}>{bulkLoading ? <RefreshCw className="spin"/> : <Download/>}{bulkLoading ? "MENYIAPKAN…" : "DOWNLOAD CSV LINK"}</button>
        </div>
        {bulkLinks.length > 0 && <div className="generated-link"><Check/><span><b>{bulkLinks.length} link sudah siap</b><small>CSV baru sudah diunduh. Link hanya tersedia selama halaman ini terbuka.</small></span><button onClick={() => downloadLinks(bulkLinks, events.find((event) => event.id === selectedEvent)?.title || "revolt-riders")} aria-label="Unduh CSV lagi"><Download/></button></div>}
      </section>

      <section className="card rsvp-panel admin-wide">
        <div className="section-title"><span><em>RSVP LIVE</em><h3>Respons undangan</h3></span><span className="live-status">● LIVE</span></div>
        <label className="rsvp-select">Agenda<select value={selectedRsvpEvent} onChange={(event) => setRsvpEvent(event.target.value)}><option value="">Pilih agenda</option>{publishedEvents.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
        {!selectedRsvpEventRecord ? <p className="system-message">Publish agenda lalu buat undangan untuk melihat statistik RSVP.</p> : <>
          <div className="rsvp-stats">
            <article><small>DIUNDANG</small><b>{eventStats.invited}</b></article><article><small>HADIR</small><b>{eventStats.attending}</b></article><article><small>TIDAK HADIR</small><b>{eventStats.declined}</b></article><article><small>MUNGKIN</small><b>{eventStats.maybe}</b></article><article><small>BELUM JAWAB</small><b>{eventStats.noResponse}</b></article><article><small>RESPONSE RATE</small><b>{eventStats.responseRate}%</b></article>
          </div>
          <div className="rsvp-list-title"><span><b>Respons terakhir</b><small>{eventStats.attending + eventStats.guests} orang termasuk tamu yang dikonfirmasi hadir</small></span><button onClick={() => void load()} aria-label="Muat ulang RSVP"><RefreshCw/>Muat ulang</button></div>
          {eventStats.attendees.length === 0 ? <p className="system-message">Belum ada respons. Setelah member memilih RSVP, daftar ini akan diperbarui otomatis.</p> : <div className="attendee-list">{eventStats.attendees.map(({ rsvp, member }) => <article key={rsvp.member_external_id}><i>{(member?.nickname || member?.full_name || rsvp.member_external_id).slice(0, 2).toUpperCase()}</i><span><b>{member?.nickname || member?.full_name || rsvp.member_external_id}</b><small>{rsvp.member_external_id} · {new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date(rsvp.responded_at))} WIB</small></span><em className={`rsvp-${rsvp.status}`}>{rsvp.status === "attending" ? `Hadir${rsvp.guest_count ? ` +${rsvp.guest_count}` : ""}` : rsvp.status === "declined" ? "Tidak hadir" : "Mungkin"}</em></article>)}</div>}
        </>}
      </section>

      <section className="form-card card">
        <div className="form-heading"><ScanLine/><span><em>ATTENDANCE</em><h2>Buat kode check-in</h2><p>Kode aktif satu jam sebelum dibuat hingga 12 jam berikutnya.</p></span></div>
        <form onSubmit={generateCheckinCode}><label>Agenda<select value={checkinEvent} onChange={(event) => setCheckinEvent(event.target.value)} required><option value="">Pilih agenda</option>{publishedEvents.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label><button className="dark-action"><ScanLine/>BUAT KODE CHECK-IN</button></form>
        {checkinCode && <div className="generated-link"><Check/><span><b>Kode check-in aktif</b><small>{checkinCode}</small></span><button onClick={() => navigator.clipboard.writeText(checkinCode)} aria-label="Salin kode"><Copy/></button></div>}
      </section>

      <section className="card approval-card">
        <div className="section-title"><span><em>VERIFIKASI</em><h3>Permintaan akun member</h3></span><b>{requests.length}</b></div>
        {requests.length === 0 ? <p className="system-message">Tidak ada permintaan yang menunggu.</p> : requests.map((request) => <article key={request.id}><span><b>{request.member_external_id}</b><small>{request.email ?? "Email tidak tersedia"}</small></span><button onClick={() => void approveRequest(request)}><Check/>Setujui</button></article>)}
      </section>
      {account.role === "superadmin" && <section className="card role-panel admin-wide">
        <div className="section-title"><span><em>ROLE & AKSES</em><h3>Pengaturan pengurus</h3></span><ShieldCheck/></div>
        <p className="role-panel-intro">Tentukan akses operasional member. Role Superadmin terakhir tidak dapat diturunkan untuk menjaga akses pengelolaan.</p>
        {managedAccounts.length === 0 ? <p className="system-message">Belum ada akun member aktif untuk dikelola.</p> : <div className="role-list">{managedAccounts.map((managedAccount) => { const member = memberById.get(managedAccount.member_external_id); return <article key={managedAccount.id}><i>{(member?.nickname || member?.full_name || managedAccount.member_external_id).slice(0, 2).toUpperCase()}</i><span><b>{member?.nickname || member?.full_name || managedAccount.member_external_id}</b><small>{managedAccount.member_external_id} · {managedAccount.status}</small></span><select value={managedAccount.role} onChange={(event) => void changeRole(managedAccount, event.target.value as ManagedAccount["role"])} aria-label={`Role ${managedAccount.member_external_id}`}>{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></article>; })}</div>}
      </section>}
      {error && <p className="error-message admin-message">{error}</p>}
      {message && <p className="success-message admin-message"><Check/>{message}</p>}
    </div>
  </AppShell>;
}
