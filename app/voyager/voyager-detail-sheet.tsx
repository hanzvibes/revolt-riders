"use client";

import Image from "next/image";
import { CalendarDays, MapPin } from "lucide-react";
import { ModalSheet } from "@/components/modal-sheet";
import { formatDate, formatKm, type GalleryPhoto, type Member, type VoyagerEvent } from "./voyager-model";

export function VoyagerDetailSheet({
  event,
  participants,
  photos,
  canManage,
  onClose,
  onManage,
}: {
  event: VoyagerEvent | null;
  participants: Member[];
  photos: GalleryPhoto[];
  canManage: boolean;
  onClose: () => void;
  onManage: (event: VoyagerEvent) => void;
}) {
  return (
    <ModalSheet
      open={Boolean(event)}
      onClose={onClose}
      eyebrow="VOYAGER DETAIL"
      title={event?.title ?? "Voyager"}
    >
      {event && (
        <div className="voyager-detail">
          <div className="voyager-detail-head">
            <span>
              <small>STATUS</small>
              <b>{event.status === "completed" ? "Completed" : event.status}</b>
            </span>
            <span>
              <small>OFFICIAL DISTANCE</small>
              <b>
                {event.official_distance_km
                  ? `${formatKm(event.official_distance_km)} KM`
                  : "Belum diisi"}
              </b>
            </span>
            <span>
              <small>PARTICIPANT</small>
              <b>{participants.length} Member</b>
            </span>
          </div>

          <section className="voyager-detail-block">
            <div className="section-title">
              <span>
                <em>Aktivitas</em>
                <h3>Informasi perjalanan</h3>
              </span>
            </div>
            <p>
              <CalendarDays />
              {formatDate(event.start_at)}
            </p>
            <p>
              <MapPin />
              {event.location_name ?? "Lokasi belum dicatat"}
            </p>
            {event.location_url && (
              <a href={event.location_url} target="_blank" rel="noreferrer">
                Buka lokasi
              </a>
            )}
            {event.description && <div className="voyager-story">{event.description}</div>}
            {event.activity_summary && (
              <div className="voyager-story">{event.activity_summary}</div>
            )}
          </section>

          {event.official_support && (
            <section className="voyager-support">
              <small>OFFICIAL SUPPORT</small>
              <strong>{event.official_support}</strong>
            </section>
          )}

          <section className="voyager-detail-block">
            <div className="section-title">
              <span>
                <em>Rombongan</em>
                <h3>Member yang ikut</h3>
              </span>
              <b>{participants.length}</b>
            </div>
            <div className="voyager-participant-list">
              {participants.length === 0 ? (
                <p className="system-message">Peserta belum dicatat pengurus.</p>
              ) : (
                participants.map((member) => (
                  <span key={member.member_external_id}>
                    <i>{member.member_external_id.replace(/^RR-?/i, "").slice(0, 3)}</i>
                    <b>{member.nickname || member.full_name}</b>
                    <small>{member.member_external_id}</small>
                  </span>
                ))
              )}
            </div>
          </section>

          <section className="voyager-detail-block">
            <div className="section-title">
              <span>
                <em>Dokumentasi</em>
                <h3>Activity gallery</h3>
              </span>
              <b>{photos.length}</b>
            </div>
            {photos.length === 0 ? (
              <p className="system-message">Dokumentasi belum ditambahkan pengurus.</p>
            ) : (
              <div className="voyager-gallery">
                {photos.map((photo) => (
                  <figure key={photo.id}>
                    {photo.signedUrl ? (
                      <Image
                        src={photo.signedUrl}
                        alt={photo.title || "Dokumentasi Voyager"}
                        width={640}
                        height={640}
                        sizes="(max-width: 520px) 50vw, 320px"
                      />
                    ) : (
                      <span>Foto tidak tersedia</span>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </section>

          {canManage && (
            <button
              type="button"
              className="primary-action"
              onClick={() => {
                const current = event;
                onClose();
                onManage(current);
              }}
            >
              Kelola Voyager
            </button>
          )}
        </div>
      )}
    </ModalSheet>
  );
}
