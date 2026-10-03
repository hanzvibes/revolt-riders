"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Bike, CalendarDays, Gauge } from "lucide-react";
import { saveRideLog } from "@/lib/services/ride-log-service";
import { eventDate, type RideEvent } from "./riding-model";

export function RidingForm({
  visible,
  events,
  memberExternalId,
  accountExists,
  isStaff,
  onClose,
  onSaved,
  onMessage,
  onError,
}: {
  visible: boolean;
  events: RideEvent[];
  memberExternalId: string | null;
  accountExists: boolean;
  isStaff: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((item) => item.id === eventId),
    [eventId, events],
  );
  const distance = Math.max(0, Number(end || 0) - Number(start || 0));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!memberExternalId) return;

    const cleanTitle = title.trim() || (selectedEvent ? selectedEvent.title : "");
    if (!cleanTitle && !selectedEvent) {
      onError("Harap isi nama kegiatan, agenda, atau destinasi riding.");
      return;
    }

    if (distance <= 0) {
      onError(
        "Jarak harus lebih besar dari 0 KM (Odometer akhir harus lebih besar dari awal).",
      );
      return;
    }

    setSaving(true);
    onError("");
    onMessage("");

    try {
      const finalTitle = cleanTitle || "Ride Mandiri";
      const result = await saveRideLog({
        memberExternalId,
        title: finalTitle,
        km: distance,
        eventId: eventId || null,
        odometerStart: Number(start),
        odometerEnd: Number(end),
      });

      if (result.status === "approved" || isStaff) {
        onMessage(
          `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil disimpan dan langsung disetujui (Approved).`,
        );
      } else {
        onMessage(
          `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil dikirim! Menunggu validasi Road Captain / Pengurus.`,
        );
      }

      setEventId("");
      setTitle("");
      setStart("");
      setEnd("");
      onClose();
      await onSaved();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Ride log belum dapat dikirim.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <section className="form-card card" style={{ marginBottom: "24px" }}>
      <div className="form-heading">
        <Bike />
        <span>
          <em>Catat riding</em>
          <h2>Catat Riding Baru</h2>
          <p>
            Pilih agenda club atau catat touring mandiri. Odometer awal dan akhir akan menghitung jarak kilometer secara otomatis.
          </p>
        </span>
      </div>

      {!memberExternalId ? (
        <div className="notice" style={{ marginTop: "14px" }}>
          Akun member harus aktif untuk mencatat riding.{" "}
          <a href={accountExists ? "/profil" : "/login"}>
            {accountExists ? "Lihat status akun" : "Masuk sekarang"}
          </a>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            Pilih Agenda Resmi (Opsional)
            <select
              value={eventId}
              onChange={(changeEvent) => {
                setEventId(changeEvent.target.value);
                const nextEvent = events.find(
                  (item) => item.id === changeEvent.target.value,
                );
                setTitle(nextEvent?.title ?? "");
              }}
            >
              <option value="">Touring / Ride Mandiri (Tanpa Agenda)</option>
              {events.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title} · {eventDate(item.start_at)}
                </option>
              ))}
            </select>
          </label>

          {selectedEvent && (
            <p className="system-message" style={{ margin: "4px 0 10px" }}>
              <CalendarDays size={15} /> Terhubung ke agenda {selectedEvent.type}:{" "}
              <b>{selectedEvent.title}</b>
            </p>
          )}

          <label>
            Nama Kegiatan / Destinasi {selectedEvent ? "(Otomatis dari agenda)" : "*"}
            <input
              type="text"
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder={
                selectedEvent
                  ? selectedEvent.title
                  : "Contoh: Sowan ke RR Banyuwangi, Sunmori Pasir Putih, dsb."
              }
              required={!selectedEvent}
            />
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
          >
            <label>
              Odometer Awal (KM)
              <input
                type="number"
                min="0"
                step="0.1"
                value={start}
                onChange={(changeEvent) => setStart(changeEvent.target.value)}
                placeholder="Contoh: 12450"
                required
              />
            </label>

            <label>
              Odometer Akhir (KM)
              <input
                type="number"
                min={start || "0"}
                step="0.1"
                value={end}
                onChange={(changeEvent) => setEnd(changeEvent.target.value)}
                placeholder="Contoh: 12580"
                required
              />
            </label>
          </div>

          <div className="distance-preview">
            <Gauge />
            <span>
              <small>JARAK TERHITUNG OTOMATIS</small>
              <b>{distance.toLocaleString("id-ID")} KM</b>
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              className="primary-action"
              disabled={saving || distance <= 0}
              style={{ flex: 1 }}
            >
              {saving
                ? "Mengirim Catatan…"
                : isStaff
                  ? "SIMPAN & VERIFIKASI SEBAGAI PENGURUS"
                  : "KIRIM CATATAN RIDING"}
            </button>
            <button
              type="button"
              className="outline-action"
              onClick={onClose}
              style={{ padding: "0 18px" }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
