"use client";

import Image from "next/image";
import { Check, Route, Save, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
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
  const [countsAsMandatory, setCountsAsMandatory] = useState(() => event?.counts_as_mandatory ?? false);
  const [officialDistance, setOfficialDistance] = useState(() =>
    event?.official_distance_km == null ? "" : String(event.official_distance_km),
  );
  const [officialSupport, setOfficialSupport] = useState(() => event?.official_support ?? "");
  const [activitySummary, setActivitySummary] = useState(() => event?.activity_summary ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(() => [...participantIds]);
  const [memberQuery, setMemberQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);


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
