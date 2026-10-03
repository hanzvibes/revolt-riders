from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VOYAGER = ROOT / "app" / "voyager"


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n")


write(
    "app/voyager/voyager-derived.ts",
    r'''
import type { GalleryPhoto, Member, Participant, VoyagerEvent } from "./voyager-model";

export type VoyagerView = "active" | "history";

export type VoyagerDerivedState = {
  activeEvents: VoyagerEvent[];
  historyEvents: VoyagerEvent[];
  visibleEvents: VoyagerEvent[];
  featuredEvent: VoyagerEvent | null;
  totalOfficialKm: number;
  uniqueParticipantCount: number;
  participantIdsByEvent: Map<string, string[]>;
  participantsByEvent: Map<string, Member[]>;
  photosByEvent: Map<string, GalleryPhoto[]>;
  eventById: Map<string, VoyagerEvent>;
  galleryPreview: GalleryPhoto[];
  currentMemberVoyagerEvents: VoyagerEvent[];
  completedMemberVoyagers: number;
  featuredJoined: boolean;
  featuredPhotoCount: number;
  featuredMemberStatus: string;
  journalEvents: VoyagerEvent[];
};

export function deriveVoyagerState({
  events,
  members,
  participants,
  photos,
  currentMemberId,
  view,
}: {
  events: VoyagerEvent[];
  members: Member[];
  participants: Participant[];
  photos: GalleryPhoto[];
  currentMemberId?: string | null;
  view: VoyagerView;
}): VoyagerDerivedState {
  const activeEvents = events.filter((event) => event.status !== "completed");
  const historyEvents = events.filter((event) => event.status === "completed");
  const visibleEvents = view === "active" ? activeEvents : historyEvents;
  const featuredEvent = activeEvents[0] ?? historyEvents[0] ?? null;
  const totalOfficialKm = historyEvents.reduce(
    (sum, event) => sum + (Number(event.official_distance_km) || 0),
    0,
  );
  const uniqueParticipantCount = new Set(
    participants.map((item) => item.member_external_id),
  ).size;

  const participantIdsByEvent = new Map<string, string[]>();
  for (const participant of participants) {
    const current = participantIdsByEvent.get(participant.event_id);
    if (current) current.push(participant.member_external_id);
    else participantIdsByEvent.set(participant.event_id, [participant.member_external_id]);
  }

  const memberById = new Map(
    members.map((member) => [member.member_external_id, member]),
  );
  const participantsByEvent = new Map<string, Member[]>();
  for (const [eventId, memberIds] of participantIdsByEvent) {
    participantsByEvent.set(
      eventId,
      memberIds
        .map((memberId) => memberById.get(memberId))
        .filter((member): member is Member => Boolean(member)),
    );
  }

  const photosByEvent = new Map<string, GalleryPhoto[]>();
  for (const photo of photos) {
    if (!photo.event_id) continue;
    const current = photosByEvent.get(photo.event_id);
    if (current) current.push(photo);
    else photosByEvent.set(photo.event_id, [photo]);
  }

  const eventById = new Map(events.map((event) => [event.id, event]));
  const galleryPreview = photos.slice(0, 4);

  const joinedEventIds = new Set(
    currentMemberId
      ? participants
          .filter((item) => item.member_external_id === currentMemberId)
          .map((item) => item.event_id)
      : [],
  );
  const currentMemberVoyagerEvents = currentMemberId
    ? events.filter((event) => joinedEventIds.has(event.id))
    : [];
  const completedMemberVoyagers = currentMemberVoyagerEvents.filter(
    (event) => event.status === "completed",
  ).length;
  const featuredJoined = Boolean(
    featuredEvent && currentMemberVoyagerEvents.some((event) => event.id === featuredEvent.id),
  );
  const featuredPhotoCount = featuredEvent
    ? (photosByEvent.get(featuredEvent.id)?.length ?? 0)
    : 0;
  const featuredMemberStatus = !featuredEvent
    ? "Belum ada Voyager"
    : featuredJoined
      ? featuredEvent.status === "completed"
        ? "Selesai"
        : "Tercatat"
      : "Belum tercatat";
  const journalEvents = featuredEvent
    ? visibleEvents.filter((event) => event.id !== featuredEvent.id)
    : visibleEvents;

  return {
    activeEvents,
    historyEvents,
    visibleEvents,
    featuredEvent,
    totalOfficialKm,
    uniqueParticipantCount,
    participantIdsByEvent,
    participantsByEvent,
    photosByEvent,
    eventById,
    galleryPreview,
    currentMemberVoyagerEvents,
    completedMemberVoyagers,
    featuredJoined,
    featuredPhotoCount,
    featuredMemberStatus,
    journalEvents,
  };
}
''',
)

write(
    "app/voyager/voyager-actions.ts",
    r'''
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GalleryPhoto, VoyagerEvent } from "./voyager-model";

export type SaveVoyagerActivityInput = {
  eventId: string;
  countsAsMandatory: boolean;
  officialDistanceKm: number | null;
  officialSupport: string | null;
  activitySummary: string | null;
  memberExternalIds: string[];
};

export async function saveVoyagerActivity(input: SaveVoyagerActivityInput) {
  const { error } = await getSupabaseBrowserClient().rpc("save_event_activity", {
    p_event_id: input.eventId,
    p_counts_as_mandatory: input.countsAsMandatory,
    p_official_distance_km: input.officialDistanceKm,
    p_official_support: input.officialSupport,
    p_activity_summary: input.activitySummary,
    p_member_external_ids: input.memberExternalIds,
  });

  if (error) throw error;
}

export async function syncVoyagerOfficialKm(eventId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "sync_event_official_rides",
    { p_event_id: eventId },
  );

  if (error) throw error;
  return Number((data as { synced_members?: number } | null)?.synced_members) || 0;
}

export function validateVoyagerPhotos(files: File[]) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  const invalid = files.find(
    (file) => !allowed.has(file.type) || file.size > 8 * 1024 * 1024,
  );

  return invalid
    ? "Gunakan JPG, PNG, atau WEBP dengan ukuran maksimal 8 MB per foto."
    : null;
}

export async function uploadVoyagerPhotos(event: VoyagerEvent, files: File[]) {
  const supabase = getSupabaseBrowserClient();

  for (const file of files) {
    const extension =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${event.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("club-activity")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from("club_gallery").insert({
      event_id: event.id,
      title: event.title,
      image_url: path,
      location: event.location_name,
      ride_date: event.start_at.slice(0, 10),
      is_public: false,
    });

    if (rowError) {
      await supabase.storage.from("club-activity").remove([path]);
      throw rowError;
    }
  }

  return files.length;
}

export async function deleteVoyagerPhoto(photo: GalleryPhoto) {
  const supabase = getSupabaseBrowserClient();

  if (!/^https?:\/\//i.test(photo.image_url)) {
    const { error: storageError } = await supabase.storage
      .from("club-activity")
      .remove([photo.image_url]);
    if (storageError) throw storageError;
  }

  const { error: rowError } = await supabase
    .from("club_gallery")
    .delete()
    .eq("id", photo.id);
  if (rowError) throw rowError;
}
''',
)

write(
    "app/voyager/voyager-detail-sheet.tsx",
    r'''
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
''',
)

write(
    "app/voyager/voyager-manage-sheet.tsx",
    r'''
"use client";

import Image from "next/image";
import { Check, Route, Save, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useActionDialog } from "@/components/action-dialog-provider";
import { ModalSheet } from "@/components/modal-sheet";
import {
  deleteVoyagerPhoto,
  saveVoyagerActivity,
  syncVoyagerOfficialKm,
  uploadVoyagerPhotos,
  validateVoyagerPhotos,
} from "./voyager-actions";
import type { GalleryPhoto, Member, VoyagerEvent } from "./voyager-model";

export function VoyagerManageSheet({
  event,
  members,
  participantIds,
  photos,
  canManage,
  error,
  message,
  onError,
  onMessage,
  onClose,
  onRefresh,
}: {
  event: VoyagerEvent | null;
  members: Member[];
  participantIds: readonly string[];
  photos: GalleryPhoto[];
  canManage: boolean;
  error: string;
  message: string;
  onError: (message: string) => void;
  onMessage: (message: string) => void;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const { confirmAction } = useActionDialog();
  const [countsAsMandatory, setCountsAsMandatory] = useState(false);
  const [officialDistance, setOfficialDistance] = useState("");
  const [officialSupport, setOfficialSupport] = useState("");
  const [activitySummary, setActivitySummary] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!event) return;

    setCountsAsMandatory(event.counts_as_mandatory);
    setOfficialDistance(
      event.official_distance_km === null ? "" : String(event.official_distance_km),
    );
    setOfficialSupport(event.official_support ?? "");
    setActivitySummary(event.activity_summary ?? "");
    setSelectedMembers([...participantIds]);
    setMemberQuery("");
    setSaving(false);
    setSyncing(false);
    setUploading(false);
  }, [event, participantIds]);

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.member_external_id} ${member.full_name} ${member.nickname ?? ""} ${member.city ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [memberQuery, members]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const persistActivity = async (silent = false) => {
    if (!event || !canManage) return false;
    const parsedDistance =
      officialDistance.trim() === "" ? null : Math.max(0, Number(officialDistance) || 0);

    setSaving(true);
    onError("");
    if (!silent) onMessage("");

    try {
      await saveVoyagerActivity({
        eventId: event.id,
        countsAsMandatory,
        officialDistanceKm: parsedDistance,
        officialSupport: officialSupport.trim() || null,
        activitySummary: activitySummary.trim() || null,
        memberExternalIds: selectedMembers,
      });

      if (!silent) {
        onMessage("Pengaturan Voyager dan peserta berhasil disimpan.");
        await onRefresh();
      }
      return true;
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Pengaturan Voyager gagal disimpan.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const syncOfficialKm = async () => {
    if (!event || !canManage) return;
    if (event.status === "draft") {
      onError("Publikasikan agenda terlebih dahulu sebelum Sync Official KM.");
      return;
    }
    if (Number(officialDistance) <= 0) {
      onError("Isi Official Trip Distance lebih dari 0 KM sebelum sinkronisasi.");
      return;
    }
    if (selectedMembers.length === 0) {
      onError("Pilih minimal satu peserta sebelum sinkronisasi KM.");
      return;
    }

    setSyncing(true);
    onError("");
    onMessage("");

    try {
      const saved = await persistActivity(true);
      if (!saved) return;

      const synced = await syncVoyagerOfficialKm(event.id);
      onMessage(
        `Official KM berhasil disinkronkan ke ${synced} member tanpa membuat duplikat.`,
      );
      await onRefresh();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Sinkronisasi Official KM gagal.");
    } finally {
      setSyncing(false);
    }
  };

  const uploadPhotos = async (changeEvent: ChangeEvent<HTMLInputElement>) => {
    if (!event || !canManage) return;
    const files = Array.from(changeEvent.target.files ?? []);
    changeEvent.target.value = "";
    if (files.length === 0) return;

    const validationError = validateVoyagerPhotos(files);
    if (validationError) {
      onError(validationError);
      return;
    }

    setUploading(true);
    onError("");
    onMessage("");

    try {
      const uploaded = await uploadVoyagerPhotos(event, files);
      onMessage(`${uploaded} foto dokumentasi berhasil ditambahkan.`);
      await onRefresh();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Upload dokumentasi gagal.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photo: GalleryPhoto) => {
    if (!canManage) return;
    const confirmed = await confirmAction({
      title: "Hapus foto dokumentasi?",
      description: "Foto akan dihapus dari Gallery Voyager dan tidak bisa dipulihkan.",
      confirmLabel: "Hapus Foto",
      cancelLabel: "Batal",
      destructive: true,
    });
    if (!confirmed) return;

    onError("");
    try {
      await deleteVoyagerPhoto(photo);
      onMessage("Foto dokumentasi dihapus.");
      await onRefresh();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Foto dokumentasi gagal dihapus.");
    }
  };

  return (
    <ModalSheet
      open={Boolean(event)}
      onClose={onClose}
      eyebrow="VOYAGER MANAGEMENT"
      title={event?.title ?? "Kelola Voyager"}
    >
      {event && (
        <div className="voyager-manage">
          <section className="voyager-manage-section">
            <div className="section-title">
              <span>
                <em>Official trip</em>
                <h3>Pengaturan aktivitas</h3>
              </span>
            </div>

            <label>
              Official Trip Distance
              <div className="voyager-distance-input">
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.1"
                  value={officialDistance}
                  onChange={(inputEvent) => setOfficialDistance(inputEvent.target.value)}
                  placeholder="184"
                />
                <span>KM</span>
              </div>
              <small>Tidak ada minimum KM. Isi jarak resmi perjalanan bersama.</small>
            </label>

            <label className="voyager-switch">
              <input
                type="checkbox"
                checked={countsAsMandatory}
                onChange={(inputEvent) => setCountsAsMandatory(inputEvent.target.checked)}
              />
              <span>
                <b>Count as Mandatory Ride</b>
                <small>KM resmi akan masuk akumulasi Mandatory Ride peserta.</small>
              </span>
            </label>

            <label>
              Official Support
              <input
                value={officialSupport}
                onChange={(inputEvent) => setOfficialSupport(inputEvent.target.value)}
                maxLength={120}
                placeholder="Contoh: Boldriders"
              />
              <small>Hanya tampil pada detail activity.</small>
            </label>

            <label>
              Activity Summary
              <textarea
                value={activitySummary}
                onChange={(inputEvent) => setActivitySummary(inputEvent.target.value)}
                rows={3}
                maxLength={1200}
                placeholder="Catatan singkat perjalanan…"
              />
            </label>
          </section>

          <section className="voyager-manage-section">
            <div className="section-title">
              <span>
                <em>Participant</em>
                <h3>Pilih member yang ikut</h3>
              </span>
              <b>{selectedMembers.length}</b>
            </div>

            <label className="voyager-member-search">
              <Search />
              <input
                aria-label="Cari participant Voyager"
                value={memberQuery}
                onChange={(inputEvent) => setMemberQuery(inputEvent.target.value)}
                placeholder="Cari nama atau ID RR"
              />
            </label>

            <div className="voyager-member-picker">
              {filteredMembers.map((member) => (
                <label key={member.member_external_id}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.member_external_id)}
                    onChange={() => toggleMember(member.member_external_id)}
                  />
                  <span>
                    <b>{member.nickname || member.full_name}</b>
                    <small>
                      {member.member_external_id}
                      {member.city ? ` · ${member.city}` : ""}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <small>
              Participant tidak bergantung pada RSVP atau Check-in. Semua member terpilih
              menerima Official Trip Distance yang sama saat KM disinkronkan.
            </small>
          </section>

          <section className="voyager-manage-section">
            <div className="section-title">
              <span>
                <em>Documentation</em>
                <h3>Foto aktivitas</h3>
              </span>
              <b>{photos.length}</b>
            </div>

            <label className="voyager-upload">
              <Upload />
              <span>
                <b>{uploading ? "Mengunggah…" : "Tambah dokumentasi"}</b>
                <small>JPG, PNG, WEBP · maksimal 8 MB per foto</small>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={uploading}
                onChange={(inputEvent) => void uploadPhotos(inputEvent)}
              />
            </label>

            {photos.length > 0 && (
              <div className="voyager-admin-gallery">
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
                      <span>Foto</span>
                    )}
                    <button
                      type="button"
                      aria-label="Hapus foto"
                      onClick={() => void removePhoto(photo)}
                    >
                      <Trash2 />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </section>

          {error && <p className="error-message" role="alert">{error}</p>}
          {message && (
            <p className="success-message">
              <Check />
              {message}
            </p>
          )}

          <div className="voyager-manage-actions">
            <button
              type="button"
              className="outline-action"
              disabled={saving || syncing}
              onClick={() => void persistActivity()}
            >
              <Save />
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              className="primary-action"
              disabled={
                saving ||
                syncing ||
                event.status === "draft" ||
                selectedMembers.length === 0 ||
                Number(officialDistance) <= 0
              }
              onClick={() => void syncOfficialKm()}
            >
              <Route />
              {syncing ? "Sinkronisasi…" : "Sync Official KM"}
            </button>
          </div>
        </div>
      )}
    </ModalSheet>
  );
}
''',
)

write(
    "app/voyager/voyager-hub.tsx",
    r'''
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
          <b className="voyager-section-count">{state.galleryPreview.length > 0 ? state.photosByEvent.size >= 0 : 0}{/* count rendered below */}</b>
        </div>

        <span className="sr-only">{state.galleryPreview.length} preview foto</span>
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
''',
)

# The gallery count must stay identical to the old UI. Keep it as an explicit prop rather than
# deriving it from grouped maps, because gallery rows without an event_id are still valid rows.
hub_path = ROOT / "app/voyager/voyager-hub.tsx"
hub = hub_path.read_text()
hub = hub.replace(
    '  onOpenManage,\n}: {',
    '  onOpenManage,\n  photoCount,\n}: {',
    1,
)
hub = hub.replace(
    '  onOpenManage: (event: VoyagerEvent) => void;\n}) {',
    '  onOpenManage: (event: VoyagerEvent) => void;\n  photoCount: number;\n}) {',
    1,
)
hub = hub.replace(
    '<b className="voyager-section-count">{state.galleryPreview.length > 0 ? state.photosByEvent.size >= 0 : 0}{/* count rendered below */}</b>\n',
    '<b className="voyager-section-count">{photoCount} Foto</b>\n',
    1,
)
hub = hub.replace('        <span className="sr-only">{state.galleryPreview.length} preview foto</span>\n', '')
hub_path.write_text(hub)

write(
    "app/voyager/page.tsx",
    r'''
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { fetchVoyagerSnapshot } from "./voyager-data";
import { deriveVoyagerState, type VoyagerView } from "./voyager-derived";
import { VoyagerDetailSheet } from "./voyager-detail-sheet";
import { VoyagerHub } from "./voyager-hub";
import { VoyagerManageSheet } from "./voyager-manage-sheet";
import {
  isAdminRole,
  type GalleryPhoto,
  type Member,
  type Participant,
  type VoyagerEvent,
  type VoyagerSnapshot,
} from "./voyager-model";
import { ShieldAlert } from "lucide-react";

const EMPTY_IDS: readonly string[] = [];
const EMPTY_MEMBERS: Member[] = [];
const EMPTY_PHOTOS: GalleryPhoto[] = [];

export default function VoyagerPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();
  const [events, setEvents] = useState<VoyagerEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [mandatoryKm, setMandatoryKm] = useState(0);
  const [view, setView] = useState<VoyagerView>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [detailEvent, setDetailEvent] = useState<VoyagerEvent | null>(null);
  const [manageEvent, setManageEvent] = useState<VoyagerEvent | null>(null);

  const activeAccount = account?.status === "active" ? account : null;
  const canManage = Boolean(activeAccount && isAdminRole(activeAccount.role));

  const load = useCallback(async (forceRefresh = false) => {
    if (!activeAccount) {
      setLoading(false);
      return;
    }

    setError("");
    try {
      const year = new Date().getFullYear();
      const cacheKey = `voyager:${activeAccount.member_external_id}:${year}`;
      const snapshot = await fetchWithCache<VoyagerSnapshot>(
        cacheKey,
        () => fetchVoyagerSnapshot(activeAccount.member_external_id, year),
        { ttlMs: 90_000, forceRefresh },
      );

      setEvents(snapshot.events);
      setMembers(snapshot.members);
      setParticipants(snapshot.participants);
      setPhotos(snapshot.photos);
      setMandatoryKm(snapshot.mandatoryKm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data Voyager belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [activeAccount, fetchWithCache]);

  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  useEffect(() => {
    if (events.length === 0 || typeof window === "undefined") return;

    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!slug) return;

    const target = events.find((event) => event.slug === slug);
    if (!target) return;

    setView(target.status === "completed" ? "history" : "active");
    setDetailEvent(target);
  }, [events]);

  const derived = useMemo(
    () =>
      deriveVoyagerState({
        events,
        members,
        participants,
        photos,
        currentMemberId: activeAccount?.member_external_id,
        view,
      }),
    [activeAccount?.member_external_id, events, members, participants, photos, view],
  );

  const closeDetail = () => {
    setDetailEvent(null);
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  };

  const openManage = (event: VoyagerEvent) => {
    setManageEvent(event);
    setError("");
    setMessage("");
  };

  const refresh = useCallback(() => load(true), [load]);
  const detailParticipants = detailEvent
    ? (derived.participantsByEvent.get(detailEvent.id) ?? EMPTY_MEMBERS)
    : EMPTY_MEMBERS;
  const detailPhotos = detailEvent
    ? (derived.photosByEvent.get(detailEvent.id) ?? EMPTY_PHOTOS)
    : EMPTY_PHOTOS;
  const manageParticipantIds = manageEvent
    ? (derived.participantIdsByEvent.get(manageEvent.id) ?? EMPTY_IDS)
    : EMPTY_IDS;
  const managePhotos = manageEvent
    ? (derived.photosByEvent.get(manageEvent.id) ?? EMPTY_PHOTOS)
    : EMPTY_PHOTOS;

  if (accessLoading || loading) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <PageSkeleton title="Memuat Voyager..." />
      </AppShell>
    );
  }

  if (!activeAccount) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <div className="page-wrap">
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akun member aktif diperlukan"
            description="Voyager hanya tersedia untuk member Revolt Riders yang aktif."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Voyager" title="Voyager">
      <VoyagerHub
        state={derived}
        view={view}
        mandatoryKm={mandatoryKm}
        currentMemberId={activeAccount.member_external_id}
        canManage={canManage}
        message={message}
        error={error}
        photoCount={photos.length}
        onViewChange={setView}
        onOpenDetail={setDetailEvent}
        onOpenManage={openManage}
      />

      <VoyagerDetailSheet
        event={detailEvent}
        participants={detailParticipants}
        photos={detailPhotos}
        canManage={canManage}
        onClose={closeDetail}
        onManage={openManage}
      />

      <VoyagerManageSheet
        event={manageEvent}
        members={members}
        participantIds={manageParticipantIds}
        photos={managePhotos}
        canManage={canManage}
        error={error}
        message={message}
        onError={setError}
        onMessage={setMessage}
        onClose={() => setManageEvent(null)}
        onRefresh={refresh}
      />
    </AppShell>
  );
}
''',
)

write(
    "tests/voyager-refactor.test.mjs",
    r'''
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const voyagerFiles = {
  page: "app/voyager/page.tsx",
  model: "app/voyager/voyager-model.ts",
  data: "app/voyager/voyager-data.ts",
  derived: "app/voyager/voyager-derived.ts",
  actions: "app/voyager/voyager-actions.ts",
  hub: "app/voyager/voyager-hub.tsx",
  detail: "app/voyager/voyager-detail-sheet.tsx",
  manage: "app/voyager/voyager-manage-sheet.tsx",
};

test("Voyager keeps feature responsibilities in focused modules", async () => {
  const page = await read(voyagerFiles.page);
  const model = await read(voyagerFiles.model);
  const derived = await read(voyagerFiles.derived);

  assert.match(page, /from "\.\/voyager-model"/);
  assert.match(page, /from "\.\/voyager-derived"/);
  assert.match(page, /VoyagerHub/);
  assert.match(page, /VoyagerDetailSheet/);
  assert.match(page, /VoyagerManageSheet/);
  assert.doesNotMatch(page, /type VoyagerEvent = \{/);
  assert.doesNotMatch(page, /const formatDate =/);
  assert.doesNotMatch(page, /voyager-manage-section/);
  assert.doesNotMatch(page, /voyager-command-card/);
  assert.ok(page.split("\n").length <= 230, "Voyager route should stay a thin orchestrator");

  assert.match(model, /export type VoyagerEvent = \{/);
  assert.match(model, /export type VoyagerSnapshot = \{/);
  assert.match(model, /export const formatDate/);
  assert.match(model, /export const formatKm/);
  assert.match(model, /export const isAdminRole/);
  assert.match(derived, /export function deriveVoyagerState/);
  assert.match(derived, /participantIdsByEvent/);
  assert.match(derived, /featuredMemberStatus/);
});

test("Voyager read and mutation boundaries stay explicit", async () => {
  const page = await read(voyagerFiles.page);
  const data = await read(voyagerFiles.data);
  const actions = await read(voyagerFiles.actions);
  const workspace = [page, data, actions].join("\n");

  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(data, /createSignedUrls/);
  assert.match(actions, /rpc\(\s*"save_event_activity"/);
  assert.match(actions, /rpc\(\s*"sync_event_official_rides"/);
  assert.match(actions, /from\("club-activity"\)/);
  assert.match(actions, /from\("club_gallery"\)\.insert/);
  assert.match(actions, /from\("club_gallery"\)[\s\S]*\.delete\(\)/);
  assert.doesNotMatch(page, /getSupabaseBrowserClient/);
  assert.doesNotMatch(workspace, /from\("event_attendance"\)/);
  assert.doesNotMatch(workspace, /from\("event_checkin_codes"\)/);
});

test("Voyager UI split preserves status, gallery, management, and cache contracts", async () => {
  const page = await read(voyagerFiles.page);
  const hub = await read(voyagerFiles.hub);
  const detail = await read(voyagerFiles.detail);
  const manage = await read(voyagerFiles.manage);

  assert.match(page, /fetchWithCache<VoyagerSnapshot>/);
  assert.match(page, /ttlMs: 90_000/);
  assert.match(page, /PageSkeleton title="Memuat Voyager\.\.\."/);
  assert.match(hub, /aria-label="Status Voyager saya"/);
  assert.match(hub, /Activity & History/);
  assert.match(hub, /Activity Gallery/);
  assert.match(hub, /loading="lazy"/);
  assert.match(hub, /decoding="async"/);
  assert.match(detail, /VOYAGER DETAIL/);
  assert.match(detail, /sizes="\(max-width: 520px\) 50vw, 320px"/);
  assert.match(manage, /VOYAGER MANAGEMENT/);
  assert.match(manage, /Tidak ada minimum KM/);
  assert.match(manage, /confirmLabel: "Hapus Foto"/);
  assert.match(manage, /destructive: true/);
});
''',
)

# Role smoke: keep the permission helper in the model, but mutation RPCs now live in the action module.
role_path = ROOT / "tests/role-smoke.test.mjs"
role = role_path.read_text()
role = role.replace(
    '  const model = await read("app/voyager/voyager-model.ts");\n  const migration = await read(',
    '  const model = await read("app/voyager/voyager-model.ts");\n  const actions = await read("app/voyager/voyager-actions.ts");\n  const migration = await read(',
    1,
)
role = role.replace(
    '  assert.match(page, /rpc\\(\\s*"save_event_activity"/);\n  assert.match(page, /rpc\\(\\s*"sync_event_official_rides"/);',
    '  assert.match(actions, /rpc\\(\\s*"save_event_activity"/);\n  assert.match(actions, /rpc\\(\\s*"sync_event_official_rides"/);',
    1,
)
role_path.write_text(role)

# Production contracts: rewrite only Voyager-sensitive blocks so the checks follow the real module boundary.
contract_path = ROOT / "tests/production-contract.test.mjs"
contract = contract_path.read_text()


def set_test_block(name: str, new_block: str) -> None:
    global contract
    marker = f'test("{name}"'
    start = contract.index(marker)
    next_test = contract.find('\n\ntest("', start + len(marker))
    if next_test == -1:
        next_test = len(contract)
    contract = contract[:start] + new_block.strip() + "\n\n" + contract[next_test:].lstrip("\n")


set_test_block(
    "Voyager activity keeps participants, official KM, and media server-authorized",
    r'''
test("Voyager activity keeps participants, official KM, and media server-authorized", async () => {
  const migration = await read("supabase/migrations/20260920121211_add_voyager_activity_system.sql");
  const rideGuard = await read("supabase/migrations/20260920121743_allow_voyager_official_ride_logs.sql");
  const page = await read("app/voyager/page.tsx");
  const data = await read("app/voyager/voyager-data.ts");
  const actions = await read("app/voyager/voyager-actions.ts");
  const manage = await read("app/voyager/voyager-manage-sheet.tsx");
  const voyagerWorkspace = [page, data, actions, manage].join("\n");
  const nav = await read("components/app-shell.tsx");
  const riding = await read("app/riding/page.tsx");

  assert.match(migration, /create table if not exists public\.event_participants/);
  assert.match(migration, /ride_logs_official_event_member_unique/);
  assert.match(migration, /source_type = 'official_agenda'/);
  assert.match(migration, /create or replace function public\.save_event_activity/);
  assert.match(migration, /create or replace function public\.sync_event_official_rides/);
  assert.match(migration, /'club-activity'/);
  assert.match(migration, /revoke all.*save_event_activity.*anon/);
  assert.match(migration, /revoke all.*sync_event_official_rides.*anon/);

  assert.match(rideGuard, /'voyager'::public\.event_type/);
  assert.match(actions, /rpc\(\s*"save_event_activity"/);
  assert.match(actions, /rpc\(\s*"sync_event_official_rides"/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(actions, /from\("club-activity"\)/);
  assert.match(manage, /Tidak ada minimum KM/);
  assert.ok(!voyagerWorkspace.includes('.from("event_attendance")'));
  assert.ok(!voyagerWorkspace.includes('.from("event_checkin_codes")'));

  assert.match(nav, /\["Voyager", "\/voyager", Route\]/);
  assert.match(riding, /Official Agenda Distance/);
  assert.match(riding, /source_type !== "official_agenda"/);
});
''',
)

set_test_block(
    "Voyager hub keeps core sections visible even before the first activity exists",
    r'''
test("Voyager hub keeps core sections visible even before the first activity exists", async () => {
  const hub = await read("app/voyager/voyager-hub.tsx");
  const derived = await read("app/voyager/voyager-derived.ts");
  const css = await read("app/system-ui.css");

  assert.match(hub, /voyager-overview-grid/);
  assert.match(hub, /Voyager berikutnya/);
  assert.match(hub, /Progress riding resmi/);
  assert.match(hub, /Activity & History/);
  assert.match(hub, /Activity Gallery/);
  assert.match(hub, /Gallery siap digunakan/);
  assert.match(hub, /Buat Voyager Pertama/);
  assert.match(hub, /\/admin\/events\?create=voyager/);
  assert.match(hub, /galleryPreview\.length === 0/);
  assert.match(hub, /uniqueParticipantCount/);
  assert.match(hub, /totalOfficialKm/);
  assert.match(derived, /journalEvents/);

  assert.match(css, /VOYAGER HUB/);
  assert.match(css, /voyager-gallery-hub-grid/);
  assert.match(css, /voyager-mandatory-card/);
  assert.match(css, /voyager-structured-empty/);
});
''',
)

set_test_block(
    "Shared action dialogs replace native browser prompts",
    r'''
test("Shared action dialogs replace native browser prompts", async () => {
  const provider = await read("components/action-dialog-provider.tsx");
  const layout = await read("app/layout.tsx");
  const auditedPages = [
    "app/admin/events/page.tsx",
    "app/admin/page.tsx",
    "app/garage/page.tsx",
    "app/kas/page.tsx",
    "app/voyager/page.tsx",
    "app/voyager/voyager-manage-sheet.tsx",
  ];

  assert.match(layout, /ActionDialogProvider/);
  assert.match(provider, /AlertDialog/);
  assert.match(provider, /DialogContent/);
  assert.match(provider, /confirmAction/);
  assert.match(provider, /promptAction/);
  assert.match(provider, /min-h-11/);

  for (const file of auditedPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /window\.(?:confirm|prompt|alert)\(/);
  }
});
''',
)

set_test_block(
    "Voyager makes member status and evidence visible",
    r'''
test("Voyager makes member status and evidence visible", async () => {
  const hub = await read("app/voyager/voyager-hub.tsx");
  const derived = await read("app/voyager/voyager-derived.ts");
  const css = await read("app/system-ui.css");

  assert.match(derived, /currentMemberVoyagerEvents/);
  assert.match(derived, /featuredMemberStatus/);
  assert.match(hub, /aria-label="Status Voyager saya"/);
  assert.match(hub, /BUKTI FOTO/);
  assert.match(hub, /onOpenDetail\(state\.featuredEvent/);

  assert.match(css, /voyager-member-progress/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 390px\)/);
});
''',
)

set_test_block(
    "Destructive action dialogs use explicit safe labels",
    r'''
test("Destructive action dialogs use explicit safe labels", async () => {
  const files = [
    "app/admin/events/page.tsx",
    "app/admin/page.tsx",
    "app/garage/page.tsx",
    "app/kas/page.tsx",
    "app/voyager/page.tsx",
    "app/voyager/voyager-manage-sheet.tsx",
  ];

  const sources = await Promise.all(files.map(read));
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /window\.(?:confirm|prompt|alert)\(/);
  assert.match(combined, /destructive:\s*true/);
  assert.match(combined, /Hapus Permanen/);
  assert.match(combined, /Hapus Motor/);
  assert.match(combined, /Hapus Foto/);
  assert.match(combined, /Koreksi Transaksi/);
});
''',
)

set_test_block(
    "Static and Voyager gallery images use Next Image",
    r'''
test("Static and Voyager gallery images use Next Image", async () => {
  const voyagerHub = await read("app/voyager/voyager-hub.tsx");
  const voyagerDetail = await read("app/voyager/voyager-detail-sheet.tsx");
  const voyagerManage = await read("app/voyager/voyager-manage-sheet.tsx");
  const invitation = await read("app/undangan/[token]/page.tsx");
  const setup = await read("app/setup/page.tsx");
  const offline = await read("app/offline/page.tsx");
  const config = await read("next.config.ts");

  for (const source of [voyagerHub, voyagerDetail, voyagerManage, invitation, setup, offline]) {
    assert.match(source, /from "next\/image"/);
    assert.doesNotMatch(source, /<img\b/);
  }

  assert.match(config, /uloqjgwgupuaatdixvsa\.supabase\.co/);
  assert.match(voyagerDetail, /sizes="\(max-width: 520px\) 50vw, 320px"/);
  assert.match(voyagerManage, /sizes="\(max-width: 520px\) 50vw, 320px"/);
});
''',
)

set_test_block(
    "Voyager gallery images decode lazily",
    r'''
test("Voyager gallery images decode lazily", async () => {
  const page = await read("app/voyager/page.tsx");
  const hub = await read("app/voyager/voyager-hub.tsx");

  assert.match(hub, /loading="lazy"/);
  assert.match(hub, /decoding="async"/);
  assert.match(page, /PageSkeleton/);
});
''',
)

contract_path.write_text(contract)

# Remove temporary helper files in the generated commit.
for relative in [
    "scripts/tmp-voyager-complete.py",
    ".github/workflows/tmp-voyager-complete.yml",
]:
    target = ROOT / relative
    if target.exists():
        target.unlink()
