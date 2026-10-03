"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bike,
  CalendarDays,
  Camera,
  Check,
  History,
  MapPin,
  Plus,
  Route,
  Upload,
  UsersRound,
} from "lucide-react";
import type { VoyagerDerivedState, VoyagerView } from "./voyager-derived";
import { formatDate, formatKm, type VoyagerEvent } from "./voyager-model";

export function VoyagerHub({
  state,
  view,
  mandatoryKm,
  currentMemberId,
  canManage,
  message,
  error,
  onViewChange,
  onOpenDetail,
  onOpenManage,
  photoCount,
}: {
  state: VoyagerDerivedState;
  view: VoyagerView;
  mandatoryKm: number;
  currentMemberId: string;
  canManage: boolean;
  message: string;
  error: string;
  onViewChange: (view: VoyagerView) => void;
  onOpenDetail: (event: VoyagerEvent) => void;
  onOpenManage: (event: VoyagerEvent) => void;
  photoCount: number;
}) {
  const participantsFor = (eventId: string) => state.participantsByEvent.get(eventId) ?? [];
  const photosFor = (eventId: string) => state.photosByEvent.get(eventId) ?? [];

  return (
    <div className="page-wrap voyager-page">
      <section className="voyager-hero voyager-hero-compact">
        <div className="voyager-hero-copy">
          <small>Voyager berikutnya</small>
          <h2>Voyager</h2>
          <p>Progress riding resmi, participant, dan bukti foto club.</p>
        </div>
        <div className="voyager-hero-tools">
          <span className="voyager-km-inline">
            <small>MANDATORY {new Date().getFullYear()}</small>
            <strong>{formatKm(mandatoryKm)} KM</strong>
          </span>
          {canManage && (
            <Link className="voyager-create-action" href="/admin/events?create=voyager">
              <Plus /> Buat
            </Link>
          )}
        </div>
      </section>

      {message && (
        <p className="success-message">
          <Check />
          {message}
        </p>
      )}
      {error && <p className="error-message" role="alert">{error}</p>}

      {state.featuredEvent ? (
        <section className="voyager-command-card" aria-label="Voyager utama dan status saya">
          <div className="voyager-command-head">
            <div className="voyager-command-copy">
              <span className="voyager-command-status">
                {state.featuredEvent.status === "completed" ? "COMPLETED" : "UPCOMING"}
              </span>
              <h3>{state.featuredEvent.title}</h3>
              <div className="voyager-command-meta">
                <span><CalendarDays />{formatDate(state.featuredEvent.start_at)}</span>
                <span><MapPin />{state.featuredEvent.location_name ?? "Lokasi menyusul"}</span>
              </div>
            </div>

            <div className="voyager-command-actions">
              <button type="button" onClick={() => onOpenDetail(state.featuredEvent!)}>
                Lihat detail
              </button>
              {canManage && (
                <button type="button" onClick={() => onOpenManage(state.featuredEvent!)}>
                  Kelola
                </button>
              )}
            </div>
          </div>

          <div className="voyager-command-member" aria-label="Status Voyager saya">
            <div className="voyager-command-member-copy">
              <small>STATUS KAMU</small>
              <strong>{state.featuredMemberStatus}</strong>
              <p>
                {state.featuredJoined
                  ? state.featuredEvent.status === "completed"
                    ? "Voyager ini sudah tercatat di riwayatmu."
                    : "Kamu sudah tercatat sebagai participant."
                  : "Belum tercatat sebagai participant."}
              </p>
            </div>

            <div className="voyager-command-metrics">
              <span>
                <History aria-hidden="true" />
                <small>Riwayat</small>
                <b>{state.completedMemberVoyagers}</b>
              </span>
              <span>
                <Bike aria-hidden="true" />
                <small>KM resmi</small>
                <b>
                  {state.featuredEvent.official_distance_km
                    ? formatKm(state.featuredEvent.official_distance_km)
                    : "—"}
                </b>
              </span>
              <button type="button" onClick={() => onOpenDetail(state.featuredEvent!)}>
                <Camera aria-hidden="true" />
                <small>Bukti foto</small>
                <b>{state.featuredPhotoCount}</b>
              </button>
              <span>
                <UsersRound aria-hidden="true" />
                <small>Participant</small>
                <b>{participantsFor(state.featuredEvent.id).length}</b>
              </span>
            </div>
          </div>

          <div className="voyager-command-tags">
            {state.featuredEvent.counts_as_mandatory && <span>Mandatory Ride</span>}
            {state.featuredJoined && <span className="neutral">Kamu ikut</span>}
            {state.featuredEvent.official_support && (
              <span className="neutral">{state.featuredEvent.official_support}</span>
            )}
          </div>
        </section>
      ) : (
        <section className="voyager-structured-empty compact">
          <span className="voyager-empty-icon"><Route /></span>
          <div>
            <strong>Belum ada Voyager</strong>
            <p>Activity Voyager akan muncul di sini setelah dibuat pengurus.</p>
          </div>
          {canManage && <Link href="/admin/events?create=voyager">Buat Voyager Pertama</Link>}
        </section>
      )}

      <section className="voyager-stat-strip voyager-overview-grid" aria-label="Ringkasan Voyager">
        <span><Route /><small>Aktif</small><strong>{state.activeEvents.length}</strong></span>
        <span><History /><small>Selesai</small><strong>{state.historyEvents.length}</strong></span>
        <span><Bike /><small>Official KM</small><strong>{formatKm(state.totalOfficialKm)}</strong></span>
        <span><UsersRound /><small>Participant</small><strong>{state.uniqueParticipantCount}</strong></span>
      </section>

      <section className="voyager-journal-section voyager-journal-primary">
        <div className="voyager-section-heading voyager-journal-heading">
          <span>
            <h3>Activity & History</h3>
          </span>
          <div className="voyager-tabs" role="tablist" aria-label="Filter Voyager">
            <button
              id="voyager-tab-active"
              type="button"
              role="tab"
              aria-selected={view === "active"}
              aria-controls="voyager-panel"
              className={view === "active" ? "active" : ""}
              onClick={() => onViewChange("active")}
            >
              <Route /> Aktif <b>{state.activeEvents.length}</b>
            </button>
            <button
              id="voyager-tab-history"
              type="button"
              role="tab"
              aria-selected={view === "history"}
              aria-controls="voyager-panel"
              className={view === "history" ? "active" : ""}
              onClick={() => onViewChange("history")}
            >
              <History /> History <b>{state.historyEvents.length}</b>
            </button>
          </div>
        </div>

        <div
          id="voyager-panel"
          className="voyager-list"
          role="tabpanel"
          aria-labelledby={view === "active" ? "voyager-tab-active" : "voyager-tab-history"}
        >
          {state.journalEvents.length === 0 ? (
            <div className="voyager-list-empty">
              <History />
              <span>
                <strong>
                  {state.visibleEvents.length > 0
                    ? "Activity utama sudah tampil di atas"
                    : view === "active"
                      ? "Belum ada Voyager aktif"
                      : "History masih kosong"}
                </strong>
                <small>
                  {state.visibleEvents.length > 0
                    ? "Buka kartu utama untuk melihat detail dan bukti foto."
                    : "Activity akan muncul otomatis saat tersedia."}
                </small>
              </span>
            </div>
          ) : (
            state.journalEvents.map((event) => {
              const eventParticipants = participantsFor(event.id);
              const eventPhotos = photosFor(event.id);
              const joined = eventParticipants.some(
                (member) => member.member_external_id === currentMemberId,
              );

              return (
                <button
                  type="button"
                  className="voyager-list-row"
                  key={event.id}
                  onClick={() => onOpenDetail(event)}
                  aria-label={`Buka detail ${event.title}`}
                >
                  <span className="voyager-list-date">
                    <b>
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(event.start_at))}
                    </b>
                    <small>
                      {new Intl.DateTimeFormat("id-ID", {
                        month: "short",
                        timeZone: "Asia/Jakarta",
                      })
                        .format(new Date(event.start_at))
                        .toUpperCase()}
                    </small>
                  </span>

                  <span className="voyager-list-copy">
                    <strong>{event.title}</strong>
                    <small><MapPin />{event.location_name ?? "Lokasi menyusul"}</small>
                  </span>

                  <span className="voyager-list-meta" aria-hidden="true">
                    <b>{eventParticipants.length}<small>member</small></b>
                    <b>{event.official_distance_km ? formatKm(event.official_distance_km) : "—"}<small>km</small></b>
                    <b>{eventPhotos.length}<small>foto</small></b>
                  </span>

                  <span className="voyager-list-flags">
                    {event.counts_as_mandatory && <i>Mandatory</i>}
                    {joined && <i className="neutral">Kamu ikut</i>}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      <details className="voyager-disclosure">
        <summary>
          <span>
            <strong>Cara Mandatory KM dihitung</strong>
            <small>{formatKm(mandatoryKm)} KM terverifikasi · {new Date().getFullYear()}</small>
          </span>
          <b>Info</b>
        </summary>
        <div className="voyager-disclosure-body">
          <span>
            <Route />
            <b>Official Agenda Distance</b>
            <small>Voyager dan agenda Mandatory lain memakai sumber KM yang sama.</small>
          </span>
          <span>
            <Check />
            <b>Single source of truth</b>
            <small>KM tidak digandakan di Riding, Leaderboard, atau progress Mandatory.</small>
          </span>
        </div>
      </details>

      <section className="voyager-gallery-hub voyager-gallery-compact">
        <div className="voyager-section-heading">
          <span>
            <small>BUKTI FOTO</small>
            <h3>Activity Gallery</h3>
          </span>
          <b className="voyager-section-count">{photoCount} Foto</b>
        </div>

        {state.galleryPreview.length === 0 ? (
          <div className="voyager-gallery-empty compact">
            <Camera aria-hidden="true" />
            <span>
              <strong>Gallery siap digunakan</strong>
              <p>Foto akan muncul setelah pengurus menambahkan bukti aktivitas.</p>
            </span>
            {canManage && state.featuredEvent && (
              <button type="button" onClick={() => onOpenManage(state.featuredEvent!)}>
                <Upload /> Tambah Foto
              </button>
            )}
          </div>
        ) : (
          <div className="voyager-gallery-hub-grid voyager-gallery-preview">
            {state.galleryPreview.map((photo) => {
              const relatedEvent = photo.event_id
                ? state.eventById.get(photo.event_id)
                : undefined;
              const photoLabel = relatedEvent?.title ?? photo.title;

              return (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => {
                    if (relatedEvent) onOpenDetail(relatedEvent);
                  }}
                  aria-label={`Buka dokumentasi ${photoLabel}`}
                >
                  {photo.signedUrl ? (
                    <Image
                      src={photo.signedUrl}
                      alt={photo.title || "Dokumentasi Voyager"}
                      width={640}
                      height={640}
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width: 520px) 50vw, 280px"
                    />
                  ) : (
                    <span><Camera /></span>
                  )}
                  <i>
                    <b>{photoLabel}</b>
                    <small>{photo.ride_date ? formatDate(photo.ride_date) : "Voyager"}</small>
                  </i>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
