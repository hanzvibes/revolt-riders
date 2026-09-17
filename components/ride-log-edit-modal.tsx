"use client";

import { deleteRideLog, saveRideLog } from "@/lib/services/ride-log-service";
import { Calendar, Check, Gauge, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";

export type RideLogEditData = {
  id?: string;
  memberExternalId: string;
  memberName: string;
  title: string;
  km: number;
  date: string;
};

export function RideLogEditModal({
  open,
  onClose,
  data,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  data: RideLogEditData | null;
  onSaved: (totalKm?: number) => void;
  onDeleted?: (totalKm?: number) => void;
}) {
  if (!open || !data) return null;

  return (
    <div className="tour-modal-backdrop" onClick={onClose}>
      <RideLogEditForm
        key={`${data.id ?? "new"}-${data.memberExternalId}`}
        data={data}
        onClose={onClose}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </div>
  );
}

function RideLogEditForm({
  data,
  onClose,
  onSaved,
  onDeleted,
}: {
  data: RideLogEditData;
  onClose: () => void;
  onSaved: (totalKm?: number) => void;
  onDeleted?: (totalKm?: number) => void;
}) {
  const isEdit = Boolean(data.id);
  const [title, setTitle] = useState(data.title || "");
  const [km, setKm] = useState(
    data.km !== undefined && data.km !== null ? String(data.km) : "",
  );
  const [date, setDate] = useState(() => {
    if (data.date) {
      try {
        const d = new Date(data.date);
        return d.toISOString().slice(0, 10);
      } catch {
        return new Date().toISOString().slice(0, 10);
      }
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Nama kegiatan / agenda tidak boleh kosong.");
      return;
    }
    const numKm = Number(km);
    if (isNaN(numKm) || numKm < 0) {
      setError("Jarak kilometer harus berupa angka valid (minimal 0).");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await saveRideLog({
        id: data.id,
        memberExternalId: data.memberExternalId,
        title: title.trim(),
        km: numKm,
        date: date || undefined,
      });

      onSaved(res.totalKm);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menyimpan riwayat touring.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!data.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const res = await deleteRideLog(data.id, data.memberExternalId);
      if (onDeleted) onDeleted(res.totalKm);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal menghapus riwayat touring.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const deleteBtnClass = confirmDelete
    ? "tour-modal-del-btn confirm"
    : "tour-modal-del-btn";

  return (
    <div className="tour-modal-backdrop" onClick={onClose}>
      <div
        className="tour-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="tour-modal-header">
          <div>
            <em>{isEdit ? "EDIT RIWAYAT" : "TAMBAH RIWAYAT"}</em>
            <h3>
              {isEdit ? "Perbarui Catatan Sowan / Touring" : "Catat Touring Baru"}
            </h3>
            <small style={{ color: "var(--muted)", fontSize: "0.68rem" }}>
              Member: <b>{data.memberName}</b> ({data.memberExternalId})
            </small>
          </div>
          <button
            type="button"
            className="tour-modal-close"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tour-modal-form">
          {error && <p className="error-message">{error}</p>}

          <label>
            <span>Nama Kegiatan / Agenda Sowan</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Sowan ke RR-002 Bondowoso"
              required
            />
          </label>

          <div className="tour-modal-grid">
            <label>
              <span>Jarak Tempuh (KM)</span>
              <div className="tour-modal-input-icon">
                <Gauge />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="0.0"
                  required
                />
              </div>
            </label>

            <label>
              <span>Tanggal Pelaksanaan</span>
              <div className="tour-modal-input-icon">
                <Calendar />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </label>
          </div>

          <div className="tour-modal-actions">
            {isEdit && (
              <button
                type="button"
                className={deleteBtnClass}
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                <Trash2 />
                {confirmDelete ? "Yakin Hapus?" : "Hapus"}
              </button>
            )}

            <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
              <button
                type="button"
                className="tour-modal-cancel-btn"
                onClick={onClose}
                disabled={saving || deleting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="primary-action tour-modal-submit-btn"
                disabled={saving || deleting}
              >
                <Check />
                {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah Riwayat"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
