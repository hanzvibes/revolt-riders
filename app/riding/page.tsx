"use client";

import { AppShell } from "@/components/app-shell";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Bike, CalendarDays, CheckCircle2, Gauge } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type RideEvent = { id: string; title: string; type: "riding" | "touring"; start_at: string };
const eventDate = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));

export default function RidingPage() {
  const { account, loading } = useMemberAccess();
  const [events, setEvents] = useState<RideEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const activeAccount = account?.status === "active" ? account : null;
  const distance = Math.max(0, Number(end || 0) - Number(start || 0));
  const selectedEvent = useMemo(() => events.find((item) => item.id === eventId), [eventId, events]);

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error: loadError } = await getSupabaseBrowserClient()
        .from("events")
        .select("id,title,type,start_at")
        .in("status", ["published", "completed"])
        .in("type", ["riding", "touring"])
        .order("start_at", { ascending: false })
        .limit(50);
      if (loadError) setError("Agenda riding belum dapat dimuat.");
      else setEvents((data ?? []) as RideEvent[]);
    };
    void loadEvents();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeAccount) return;

    const cleanTitle = title.trim() || (selectedEvent ? selectedEvent.title : "");
    if (!cleanTitle && !selectedEvent) {
      setError("Harap isi nama kegiatan, agenda, atau destinasi riding mandiri.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi login tidak ditemukan.");

      const finalTitle = cleanTitle || "Ride Mandiri";
      const { error: insertError } = await supabase.from("ride_logs").insert({
        event_id: eventId || null,
        title: finalTitle,
        member_external_id: activeAccount.member_external_id,
        odometer_start: Number(start),
        odometer_end: Number(end),
        submitted_by: user.id,
        status: "pending",
      });
      if (insertError) throw insertError;

      setMessage(
        `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil dikirim dan menunggu validasi Road Captain.`,
      );
      setEventId("");
      setTitle("");
      setStart("");
      setEnd("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ride log belum dapat dikirim.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell active="Riding" title="Catat Riding">
      <div className="page-wrap">
        <section className="form-card card">
          <div className="form-heading">
            <Bike />
            <span>
              <em>RIDE LOG</em>
              <h2>Input Odometer & Destinasi</h2>
              <p>
                Pilih agenda riding atau catat destinasi ride mandiri. Jarak dihitung otomatis dan masuk statistik setelah disetujui Road Captain.
              </p>
            </span>
          </div>
          {loading ? (
            <p>Memeriksa akun…</p>
          ) : !activeAccount ? (
            <div className="notice">
              Akun member harus aktif untuk mencatat riding.{" "}
              <a href={account ? "/profil" : "/login"}>
                {account ? "Lihat status akun" : "Masuk sekarang"}
              </a>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label>
                Agenda riding / touring
                <select
                  value={eventId}
                  onChange={(event) => {
                    setEventId(event.target.value);
                    const ev = events.find((e) => e.id === event.target.value);
                    if (ev) setTitle(ev.title);
                    else setTitle("");
                  }}
                >
                  <option value="">Ride mandiri (tanpa agenda resmi)</option>
                  {events.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.title} · {eventDate(item.start_at)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedEvent ? (
                <p className="system-message">
                  <CalendarDays /> Terkait agenda {selectedEvent.type}: <b>{selectedEvent.title}</b>.
                </p>
              ) : null}

              <label>
                Nama Kegiatan / Destinasi Ride {selectedEvent ? "(Opsional)" : "*"}
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    selectedEvent
                      ? selectedEvent.title
                      : "Contoh: Sowan ke RR Banyuwangi, Sunmori Kawah Ijen, dsb."
                  }
                  required={!selectedEvent}
                />
              </label>

              <label>
                Odometer awal (KM)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  placeholder="0"
                  required
                />
              </label>

              <label>
                Odometer akhir (KM)
                <input
                  type="number"
                  min={start || "0"}
                  step="0.1"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  placeholder="0"
                  required
                />
              </label>

              <div className="distance-preview">
                <Gauge />
                <span>
                  <small>JARAK TERHITUNG</small>
                  <b>{distance.toLocaleString("id-ID")} KM</b>
                </span>
              </div>

              {error && <p className="error-message">{error}</p>}
              {message && (
                <p className="success-message">
                  <CheckCircle2 />
                  {message}
                </p>
              )}

              <button className="primary-action" disabled={saving || distance <= 0}>
                {saving ? "Mengirim…" : "KIRIM RIDE LOG"}
              </button>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
