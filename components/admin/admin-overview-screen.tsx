"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { CheckinQr } from "@/components/checkin-qr";
import {
  fetchAdminOverviewSnapshot,
  getAdminOverviewDataClient,
  type AdminEventRecord,
  type AdminInvitation as Invitation,
  type AdminMember as Member,
  type AdminRsvp as Rsvp,
  type ManagedAccount,
  type PendingRequest,
} from "@/lib/features/admin/admin-overview-data";
import { calculateAdminEventStats, slugifyAdminValue } from "@/lib/features/admin/admin-overview-model";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Link2,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useDataCache } from "@/context/data-cache-context";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Account = { role: string; status: "pending" | "active" | "inactive" };
type BulkLink = { memberId: string; name: string; url: string };
const roles: ManagedAccount["role"][] = [
  "member",
  "road_captain",
  "treasurer",
  "admin",
  "superadmin",
];

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  anchor.download = `undangan-${slugifyAdminValue(eventTitle || "revolt-riders")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export function AdminOverviewScreen() {
  const { confirmAction } = useActionDialog();
  const {
    account: cachedAccount,
    loading: authLoading,
    fetchWithCache,
    invalidateCache,
  } = useDataCache();
  const [account, setAccount] = useState<Account | null>(null);
  const [events, setEvents] = useState<AdminEventRecord[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [managedAccounts, setManagedAccounts] = useState<ManagedAccount[]>([]);
  const [memberId, setMemberId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [rsvpEvent, setRsvpEvent] = useState("");
  const [checkinEvent, setCheckinEvent] = useState("");
  const [invitation, setInvitation] = useState("");
  const [checkinCode, setCheckinCode] = useState("");
  const [checkinExpiresAt, setCheckinExpiresAt] = useState("");
  const [checkinUrl, setCheckinUrl] = useState("");
  const [bulkLinks, setBulkLinks] = useState<BulkLink[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  const publishedEvents = useMemo(
    () => events.filter((event) => event.status === "published"),
    [events],
  );
  const activeMembers = members;
  const selectedRsvpEvent = rsvpEvent || publishedEvents[0]?.id || "";
  const selectedRsvpEventRecord = events.find(
    (event) => event.id === selectedRsvpEvent,
  );
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.member_external_id, member])),
    [members],
  );

  const eventStats = useMemo(
    () =>
      calculateAdminEventStats(
        selectedRsvpEvent,
        invitations,
        rsvps,
        memberById,
      ),
    [invitations, memberById, rsvps, selectedRsvpEvent],
  );

  const load = async (forceRefresh = false) => {
    const effectiveAccount = cachedAccount;
    setAccount(effectiveAccount as Account | null);
    const isActiveAdmin =
      effectiveAccount?.status === "active" &&
      ["admin", "superadmin"].includes(effectiveAccount.role);
    const isSuperadmin =
      isActiveAdmin && effectiveAccount?.role === "superadmin";

    if (!isActiveAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }

    try {
      const data = await fetchWithCache(
        "admin_dashboard_overview",
        () => fetchAdminOverviewSnapshot(isSuperadmin),
        { ttlMs: 60 * 1000, forceRefresh },
      );

      setEvents(data.events);
      setRequests(data.requests);
      setMembers(data.members);
      setInvitations(data.invitations);
      setRsvps(data.rsvps);
      setManagedAccounts(data.managedAccounts);
    } catch {
      setError("Gagal memuat data dashboard pengurus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      void load();
    }
    const supabase = getAdminOverviewDataClient();
    const channel = supabase
      .channel("admin-rsvp-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_rsvps" },
        () => {
          invalidateCache("admin_dashboard_overview");
          void load(true);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_invitations" },
        () => {
          invalidateCache("admin_dashboard_overview");
          void load(true);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, cachedAccount]);


  const generateInvite = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setInvitation("");
    const token = secureToken();
    const tokenHash = await sha256(token);
    const { error: upsertError } = await getAdminOverviewDataClient()
      .from("event_invitations")
      .upsert(
        {
          event_id: selectedEvent,
          member_external_id: memberId.trim().toUpperCase(),
          token_hash: tokenHash,
        },
        { onConflict: "event_id,member_external_id" },
      );
    if (upsertError) setError(upsertError.message);
    else {
      setInvitation(`${window.location.origin}/undangan/${token}`);
      invalidateCache("admin_dashboard_overview");
      await load(true);
    }
  };

  const generateBulkInvites = async () => {
    if (!selectedEvent) return setError("Pilih agenda terlebih dahulu.");
    const event = events.find((row) => row.id === selectedEvent);
    if (!event) return setError("Agenda tidak ditemukan.");
    const existing = invitations.filter(
      (row) => row.event_id === selectedEvent,
    ).length;
    if (
      existing > 0 &&
      !await confirmAction({
        title: "Generate ulang undangan?",
        description: `Agenda ini sudah memiliki ${existing} undangan. Link lama akan dinonaktifkan dan diganti dengan link baru.`,
        confirmLabel: "Generate Ulang",
        cancelLabel: "Batal",
      })
    )
      return;
    setBulkLoading(true);
    setError("");
    setMessage("");
    setBulkLinks([]);
    try {
      const tokens = activeMembers.map((member) => ({
        member,
        token: secureToken(),
      }));
      const rows = await Promise.all(
        tokens.map(async ({ member, token }) => ({
          event_id: selectedEvent,
          member_external_id: member.member_external_id,
          token_hash: await sha256(token),
        })),
      );
      const { error: upsertError } = await getAdminOverviewDataClient()
        .from("event_invitations")
        .upsert(rows, { onConflict: "event_id,member_external_id" });
      if (upsertError) throw upsertError;
      const links = tokens.map(({ member, token }) => ({
        memberId: member.member_external_id,
        name: member.nickname || member.full_name,
        url: `${window.location.origin}/undangan/${token}`,
      }));
      setBulkLinks(links);
      downloadLinks(links, event.title);
      setMessage(
        `${links.length} undangan personal dibuat. CSV link sudah diunduh; simpan sebelum meninggalkan halaman.`,
      );
      invalidateCache("admin_dashboard_overview");
      await load(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Undangan massal belum berhasil dibuat.",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const generateCheckinCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setCheckinCode("");
    setCheckinExpiresAt("");
    setCheckinUrl("");
    const raw = `RR-${secureToken().slice(0, 12).toUpperCase()}`;
    const codeHash = await sha256(raw);
    const supabase = getAdminOverviewDataClient();
    const now = Date.now();
    const activeUntil = new Date(now + 12 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase.rpc(
      "create_event_checkin_code",
      {
        p_event_id: checkinEvent,
        p_code_hash: codeHash,
        p_active_until: activeUntil,
      },
    );
    if (insertError) setError(insertError.message);
    else {
      setCheckinCode(raw);
      setCheckinExpiresAt(activeUntil);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCheckinUrl(`${origin}/check-in?code=${encodeURIComponent(raw)}`);
    }
  };

  const approveRequest = async (request: PendingRequest) => {
    setError("");
    const { error: approveError } = await getAdminOverviewDataClient().rpc(
      "approve_member_account_request",
      { p_request_id: request.id, p_role: "member" },
    );
    if (approveError) return setError(approveError.message);
    setMessage(
      `${request.member_external_id} berhasil diverifikasi sebagai member.`,
    );
    invalidateCache("admin_dashboard_overview");
    await load(true);
  };

  const rejectRequest = async (request: PendingRequest) => {
    if (
      !await confirmAction({
        title: "Tolak pendaftaran?",
        description: `${request.member_external_id} (${request.email}) akan ditolak dan ID RR dibuka kembali untuk pendaftaran ulang.`,
        confirmLabel: "Tolak Pendaftaran",
        cancelLabel: "Batal",
        destructive: true,
      })
    )
      return;
    setError("");
    setMessage("");
    const supabase = getAdminOverviewDataClient();
    const { error: rpcError } = await supabase.rpc(
      "reject_member_account_request",
      { p_request_id: request.id },
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setMessage(
      `Pendaftaran ${request.member_external_id} dibatalkan. ID RR telah dibuka kembali untuk pendaftaran.`,
    );
    invalidateCache("admin_dashboard_overview");
    await load(true);
  };

  const changeRole = async (
    managedAccount: ManagedAccount,
    nextRole: ManagedAccount["role"],
  ) => {
    if (managedAccount.role === nextRole) return;
    if (
      !await confirmAction({
        title: "Ubah role member?",
        description: `${managedAccount.member_external_id} akan memiliki role ${nextRole.replaceAll("_", " ")}.`,
        confirmLabel: "Ubah Role",
        cancelLabel: "Batal",
      })
    )
      return;
    setError("");
    setMessage("");
    const { error: roleError } = await getAdminOverviewDataClient().rpc(
      "set_member_account_role",
      { p_account_id: managedAccount.id, p_role: nextRole },
    );
    if (roleError) return setError(roleError.message);
    setMessage(
      `Role ${managedAccount.member_external_id} diperbarui menjadi ${nextRole.replaceAll("_", " ")}.`,
    );
    invalidateCache("admin_dashboard_overview");
    await load(true);
  };

  if (authLoading || (loading && !account))
    return (
      <AppShell active="Admin" title="Dashboard Admin">
        <div className="page-wrap">
          <p>Memeriksa izin…</p>
        </div>
      </AppShell>
    );
  if (
    !account ||
    account.status !== "active" ||
    !["admin", "superadmin"].includes(account.role)

  )
    return (
      <AppShell active="Admin" title="Dashboard Admin">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akses pengurus diperlukan</h2>
            <p>
              Halaman ini hanya tersedia untuk akun aktif Admin dan Superadmin.
            </p>
            <a className="primary-action" href={account ? "/profil" : "/login"}>
              {account ? "LIHAT STATUS AKUN" : "MASUK"}
            </a>
          </section>
        </div>
      </AppShell>
    );

  return (
    <AppShell active="Admin" title="Dashboard Admin">
      <div className="page-wrap admin-grid">
        {/* Executive KPI Strip */}
        <section className="admin-kpi-strip" aria-label="Ringkasan Operasional">
          <article className="admin-kpi-card">
            <div className="admin-kpi-icon">
              <UsersRound />
            </div>
            <div className="admin-kpi-info">
              <span className="admin-kpi-label">Member Resmi</span>
              <b className="admin-kpi-val">{members.length}</b>
              <small className="admin-kpi-hint">Riders terdata aktif</small>
            </div>
          </article>
          <article className="admin-kpi-card">
            <div className="admin-kpi-icon">
              <CalendarDays />
            </div>
            <div className="admin-kpi-info">
              <span className="admin-kpi-label">Agenda Terbit</span>
              <b className="admin-kpi-val">{publishedEvents.length}</b>
              <small className="admin-kpi-hint">Kopdar & touring aktif</small>
            </div>
          </article>
          <article className="admin-kpi-card">
            <div className="admin-kpi-icon">
              <ShieldAlert />
            </div>
            <div className="admin-kpi-info">
              <span className="admin-kpi-label">Pending Akun</span>
              <b className="admin-kpi-val">{requests.length}</b>
              <small className="admin-kpi-hint">
                {requests.length > 0 ? `${requests.length} perlu review` : "Semua diverifikasi"}
              </small>
            </div>
          </article>
          <article className="admin-kpi-card">
            <div className="admin-kpi-icon">
              <CheckCircle2 />
            </div>
            <div className="admin-kpi-info">
              <span className="admin-kpi-label">Respons RSVP</span>
              <b className="admin-kpi-val">{rsvps.length}</b>
              <small className="admin-kpi-hint">
                {rsvps.filter((r) => r.status === "attending").length} rider konfirmasi hadir
              </small>
            </div>
          </article>
        </section>

        <section className="card admin-launch-card">
          <div>
            <CalendarPlus />
            <span>
              <em>AGENDA</em>
              <h2>Agenda komunitas</h2>
              <p>Buat agenda baru atau kelola agenda yang sudah terbit.</p>
            </span>
          </div>
          <span>
            <a className="outline-action" href="/admin/events">
              KELOLA AGENDA
            </a>
          </span>
        </section>

        <section className="form-card card">
          <div className="form-heading">
            <Link2 />
            <span>
              <em>UNDANGAN</em>
              <h2>Buat link personal</h2>
              <p>
                Token mentah hanya tampil sekali; database hanya menyimpan hash.
              </p>
            </span>
          </div>
          <form onSubmit={generateInvite}>
            <label>
              Agenda
              <select
                value={selectedEvent}
                onChange={(event) => setSelectedEvent(event.target.value)}
                required
              >
                <option value="">Pilih agenda</option>
                {publishedEvents.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Member ID
              <input
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                placeholder="RR-014"
                required
              />
            </label>
            <button className="dark-action">
              <Link2 />
              GENERATE LINK
            </button>
          </form>
          {invitation && (
            <div className="generated-link">
              <Check />
              <span>
                <b>Link siap dibagikan</b>
                <small>{invitation}</small>
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(invitation)}
                aria-label="Salin link"
              >
                <Copy />
              </button>
            </div>
          )}
        </section>

        <section className="form-card card admin-wide">
          <div className="form-heading">
            <Users />
            <span>
              <em>Undangan massal</em>
              <h2>Siapkan semua link personal</h2>
              <p>
                Satu link unik dibuat untuk setiap member aktif dan diunduh
                dalam CSV, siap dibagikan lewat WhatsApp.
              </p>
            </span>
          </div>
          <div className="bulk-controls">
            <label>
              Agenda
              <select
                value={selectedEvent}
                onChange={(event) => setSelectedEvent(event.target.value)}
              >
                <option value="">Pilih agenda</option>
                {publishedEvents.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <b>{activeMembers.length} member aktif</b>
              <small>
                Generate ulang akan mengganti seluruh link undangan agenda ini.
              </small>
            </div>
            <button
              className="primary-action"
              onClick={() => void generateBulkInvites()}
              disabled={bulkLoading || !selectedEvent}
            >
              {bulkLoading ? <RefreshCw className="spin" /> : <Download />}
              {bulkLoading ? "MENYIAPKAN…" : "DOWNLOAD CSV LINK"}
            </button>
          </div>
          {bulkLinks.length > 0 && (
            <div className="generated-link">
              <Check />
              <span>
                <b>{bulkLinks.length} link sudah siap</b>
                <small>
                  CSV baru sudah diunduh. Link hanya tersedia selama halaman ini
                  terbuka.
                </small>
              </span>
              <button
                onClick={() =>
                  downloadLinks(
                    bulkLinks,
                    events.find((event) => event.id === selectedEvent)?.title ||
                      "revolt-riders",
                  )
                }
                aria-label="Unduh CSV lagi"
              >
                <Download />
              </button>
            </div>
          )}
        </section>

        <section className="card rsvp-panel admin-wide">
          <div className="section-title">
            <span>
              <em>RSVP</em>
              <h3>Respons undangan</h3>
            </span>
            <span className="live-status">● LIVE</span>
          </div>
          <label className="rsvp-select">
            Agenda
            <select
              value={selectedRsvpEvent}
              onChange={(event) => setRsvpEvent(event.target.value)}
            >
              <option value="">Pilih agenda</option>
              {publishedEvents.map((event) => (
                <option value={event.id} key={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
          {!selectedRsvpEventRecord ? (
            <p className="system-message">
              Publish agenda lalu buat undangan untuk melihat statistik RSVP.
            </p>
          ) : (
            <>
              <div className="rsvp-stats">
                <article>
                  <small>DIUNDANG</small>
                  <b>{eventStats.invited}</b>
                </article>
                <article>
                  <small>HADIR</small>
                  <b>{eventStats.attending}</b>
                </article>
                <article>
                  <small>TIDAK HADIR</small>
                  <b>{eventStats.declined}</b>
                </article>
                <article>
                  <small>MUNGKIN</small>
                  <b>{eventStats.maybe}</b>
                </article>
                <article>
                  <small>BELUM JAWAB</small>
                  <b>{eventStats.noResponse}</b>
                </article>
                <article>
                  <small>RESPONSE RATE</small>
                  <b>{eventStats.responseRate}%</b>
                </article>
              </div>
              <div className="rsvp-list-title">
                <span>
                  <b>Respons terakhir</b>
                  <small>
                    {eventStats.attending + eventStats.guests} orang termasuk
                    tamu yang dikonfirmasi hadir
                  </small>
                </span>
                <button
                  onClick={() => {
                    invalidateCache("admin_dashboard_overview");
                    void load(true);
                  }}
                  aria-label="Muat ulang RSVP"
                >
                  <RefreshCw />
                  Muat ulang
                </button>
              </div>
              {eventStats.attendees.length === 0 ? (
                <p className="system-message">
                  Belum ada respons. Setelah member memilih RSVP, daftar ini
                  akan diperbarui otomatis.
                </p>
              ) : (
                <div className="attendee-list">
                  {eventStats.attendees.map(({ rsvp, member }) => (
                    <article key={rsvp.member_external_id}>
                      <i>
                        {(
                          member?.nickname ||
                          member?.full_name ||
                          rsvp.member_external_id
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </i>
                      <span>
                        <b>
                          {member?.nickname ||
                            member?.full_name ||
                            rsvp.member_external_id}
                        </b>
                        <small>
                          {rsvp.member_external_id} ·{" "}
                          {new Intl.DateTimeFormat("id-ID", {
                            timeZone: "Asia/Jakarta",
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(rsvp.responded_at))}{" "}
                          WIB
                        </small>
                      </span>
                      <em className={`rsvp-${rsvp.status}`}>
                        {rsvp.status === "attending"
                          ? `Hadir${rsvp.guest_count ? ` +${rsvp.guest_count}` : ""}`
                          : rsvp.status === "declined"
                            ? "Tidak hadir"
                            : "Mungkin"}
                      </em>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section className="form-card card admin-checkin-card">
          <div className="form-heading">
            <ScanLine />
            <span>
              <em>Kehadiran</em>
              <h2>Buat kode check-in</h2>
              <p>
                Kode aktif satu jam sebelum dibuat hingga 12 jam berikutnya.
              </p>
            </span>
          </div>
          <form onSubmit={generateCheckinCode}>
            <label>
              Agenda
              <select
                value={checkinEvent}
                onChange={(event) => setCheckinEvent(event.target.value)}
                required
              >
                <option value="">Pilih agenda</option>
                {publishedEvents.map((event) => (
                  <option value={event.id} key={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <button className="dark-action">
              <ScanLine />
              BUAT KODE CHECK-IN
            </button>
          </form>
          {checkinCode && checkinExpiresAt && (
            <CheckinQr
              code={checkinCode}
              qrUrl={checkinUrl}
              eventTitle={
                events.find((event) => event.id === checkinEvent)?.title ||
                "Agenda Revolt Riders"
              }
              activeUntil={checkinExpiresAt}
            />
          )}
        </section>

        <section className="card approval-card">
          <div className="section-title">
            <span>
              <em>VERIFIKASI</em>
              <h3>Permintaan akun member</h3>
            </span>
            <b>{requests.length}</b>
          </div>
          {requests.length === 0 ? (
            <p className="system-message">
              Tidak ada permintaan yang menunggu.
            </p>
          ) : (
            requests.map((request) => (
              <article key={request.id}>
                <span>
                  <b>{request.member_external_id}</b>
                  <small>{request.email ?? "Email tidak tersedia"}</small>
                </span>
                <div className="approval-actions">
                  <button type="button" onClick={() => void approveRequest(request)}>
                    <Check />
                    Setujui
                  </button>
                  <button
                    type="button"
                    className="approval-reject-action"
                    onClick={() => void rejectRequest(request)}
                  >
                    <X size={14} aria-hidden="true" />
                    Tolak
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
        {account.role === "superadmin" && (
          <section className="card role-panel admin-wide">
            <div className="section-title">
              <span>
                <em>ROLE & AKSES</em>
                <h3>Pengaturan pengurus</h3>
              </span>
              <ShieldCheck />
            </div>
            <p className="role-panel-intro">
              Tentukan akses operasional member. Role Superadmin terakhir tidak
              dapat diturunkan untuk menjaga akses pengelolaan.
            </p>
            {managedAccounts.length === 0 ? (
              <p className="system-message">
                Belum ada akun member aktif untuk dikelola.
              </p>
            ) : (
              <div className="role-list">
                {managedAccounts.map((managedAccount) => {
                  const member = memberById.get(
                    managedAccount.member_external_id,
                  );
                  return (
                    <article key={managedAccount.id}>
                      <i>
                        {(
                          member?.nickname ||
                          member?.full_name ||
                          managedAccount.member_external_id
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </i>
                      <span>
                        <b>
                          {member?.nickname ||
                            member?.full_name ||
                            managedAccount.member_external_id}
                        </b>
                        <small>
                          {managedAccount.member_external_id} ·{" "}
                          {managedAccount.status}
                        </small>
                      </span>
                      <select
                        value={managedAccount.role}
                        onChange={(event) =>
                          void changeRole(
                            managedAccount,
                            event.target.value as ManagedAccount["role"],
                          )
                        }
                        aria-label={`Role ${managedAccount.member_external_id}`}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {error && (
          <p className="error-message admin-message" role="alert">{error}</p>
        )}
        {message && (
          <p
            className="success-message admin-message"
            role="status"
            aria-live="polite"
          >
            <Check aria-hidden="true" />
            {message}
          </p>
        )}
      </div>
    </AppShell>
  );
}
