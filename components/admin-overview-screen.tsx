"use client";

import { AppShell } from "@/components/app-shell";
import { CheckinQr } from "@/components/checkin-qr";
import { CalendarDays, CalendarPlus, Check, CheckCircle2, Copy, Download, Link2, RefreshCw, ScanLine, ShieldAlert, ShieldCheck, Users, UsersRound, X } from "lucide-react";

import { Member, ManagedAccount, roles, downloadLinks } from "./admin-overview-model";

import { AdminLoadingState, AdminRestrictedState } from "./admin-overview-access";

import { useAdminOverview } from "./use-admin-overview";

export default function AdminPage() {

  const { authLoading, invalidateCache, account, events, requests, members, rsvps, managedAccounts, memberId, setMemberId, selectedEvent, setSelectedEvent, setRsvpEvent, checkinEvent, setCheckinEvent, invitation, checkinCode, checkinExpiresAt, checkinUrl, bulkLinks, message, error, loading, bulkLoading, publishedEvents, activeMembers, selectedRsvpEvent, selectedRsvpEventRecord, memberById, eventStats, load, generateInvite, generateBulkInvites, generateCheckinCode, approveRequest, rejectRequest, changeRole } = useAdminOverview();

  if (authLoading || (loading && !account)) return <AdminLoadingState />;
  if (!account || account.status !== "active" || !["admin", "superadmin"].includes(account.role)) {
    return <AdminRestrictedState hasAccount={Boolean(account)} />;
  }

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
