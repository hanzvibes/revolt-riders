"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { FloatingActionButton } from "@/components/floating-action-button";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CalendarCheck2,
  Check,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type EventStatus = "draft" | "published" | "completed" | "cancelled";
type Event = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location_name: string | null;
  location_url: string | null;
  start_at: string;
  meetup_at: string | null;
  end_at: string | null;
  status: EventStatus;
  cancellation_reason: string | null;
};
type Rsvp = { event_id: string; status: "attending" | "declined" | "maybe" };
const canManage = (role?: string) => role === "admin" || role === "superadmin";
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const toInputDate = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export default function AdminEventsPage() {
  const { user, account, loading: accessLoading } = useMemberAccess();
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Event | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | EventStatus>("all");
  const [rsvpFilter, setRsvpFilter] = useState<"all" | Rsvp["status"]>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("kopdar");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [start, setStart] = useState("");
  const [meetup, setMeetup] = useState("");
  const [end, setEnd] = useState("");
  const load = useCallback(async () => {
    if (account?.status !== "active" || !canManage(account.role)) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const [eventResult, rsvpResult] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id,title,type,description,location_name,location_url,start_at,meetup_at,end_at,status,cancellation_reason",
        )
        .order("start_at", { ascending: false }),
      supabase.from("event_rsvps").select("event_id,status"),
    ]);
    if (eventResult.error) setError(eventResult.error.message);
    setEvents((eventResult.data ?? []) as Event[]);
    setRsvps((rsvpResult.data ?? []) as Rsvp[]);
    setLoading(false);
  }, [account]);
  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);
  const reset = () => {
    setEditing(null);
    setTitle("");
    setType("kopdar");
    setDescription("");
    setLocation("");
    setLocationUrl("");
    setStart("");
    setMeetup("");
    setEnd("");
    setFormOpen(false);
  };
  const beginCreate = () => {
    reset();
    setFormOpen(true);
    setError("");
  };
  const beginEdit = (event: Event) => {
    setEditing(event);
    setTitle(event.title);
    setType(event.type);
    setDescription(event.description ?? "");
    setLocation(event.location_name ?? "");
    setLocationUrl(event.location_url ?? "");
    setStart(toInputDate(event.start_at));
    setMeetup(toInputDate(event.meetup_at));
    setEnd(toInputDate(event.end_at));
    setFormOpen(true);
    setError("");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !account) return;
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      title: title.trim(),
      type,
      description: description.trim() || null,
      location_name: location.trim() || null,
      location_url: locationUrl.trim() || null,
      start_at: new Date(start).toISOString(),
      meetup_at: meetup ? new Date(meetup).toISOString() : null,
      end_at: end ? new Date(end).toISOString() : null,
    };
    const supabase = getSupabaseBrowserClient();
    const result = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert({
          ...payload,
          slug: `${slugify(title)}-${Date.now().toString().slice(-6)}`,
          status: "draft",
          created_by: user.id,
        });
    if (result.error) setError(result.error.message);
    else {
      setMessage(
        editing
          ? "Agenda berhasil diperbarui."
          : "Draft agenda berhasil dibuat. Publikasikan saat siap.",
      );
      reset();
      await load();
    }
    setSaving(false);
  };
  const changeStatus = async (event: Event, status: EventStatus) => {
    if (!user) return;
    let cancellationReason: string | null = null;
    if (status === "cancelled") {
      cancellationReason =
        window
          .prompt("Alasan pembatalan agenda (minimal 3 karakter):", "")
          ?.trim() || null;
      if (!cancellationReason || cancellationReason.length < 3)
        return setError("Alasan pembatalan wajib diisi.");
    }
    if (
      !window.confirm(
        `${status === "completed" ? "Tandai agenda ini selesai?" : status === "cancelled" ? "Batalkan agenda ini?" : "Publikasikan agenda ini?"}`,
      )
    )
      return;
    setError("");
    setMessage("");
    const patch =
      status === "cancelled"
        ? {
            status,
            cancelled_at: new Date().toISOString(),
            cancelled_by: user.id,
            cancellation_reason: cancellationReason,
          }
        : {
            status,
            cancelled_at: null,
            cancelled_by: null,
            cancellation_reason: null,
            published_at:
              status === "published" ? new Date().toISOString() : undefined,
          };
    const { error: updateError } = await getSupabaseBrowserClient()
      .from("events")
      .update(patch)
      .eq("id", event.id);
    if (updateError) setError(updateError.message);
    else {
      setMessage(
        status === "completed"
          ? "Agenda masuk History komunitas."
          : status === "cancelled"
            ? "Agenda dibatalkan. Undangan publik otomatis tidak aktif."
            : "Agenda dipublikasikan.",
      );
      await load();
    }
  };
  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          (filter === "all" || event.status === filter) &&
          `${event.title} ${event.type} ${event.location_name ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [events, filter, query],
  );
  const rsvpStats = (eventId: string) => {
    const rows = rsvps.filter((item) => item.event_id === eventId);
    return {
      attending: rows.filter((item) => item.status === "attending").length,
      declined: rows.filter((item) => item.status === "declined").length,
      maybe: rows.filter((item) => item.status === "maybe").length,
    };
  };
  if (accessLoading || loading)
    return (
      <AppShell active="Kelola Agenda" title="Kelola Agenda">
        <div className="page-wrap">
          <p>Memeriksa agenda…</p>
        </div>
      </AppShell>
    );
  if (account?.status !== "active" || !canManage(account?.role))
    return (
      <AppShell active="Kelola Agenda" title="Kelola Agenda">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akses admin diperlukan</h2>
            <p>Pengelolaan agenda tersedia untuk Admin dan Superadmin aktif.</p>
          </section>
        </div>
      </AppShell>
    );
  return (
    <AppShell active="Kelola Agenda" title="Kelola Agenda">
      <div className="page-wrap admin-native-page">
        <div className="page-intro native-page-head">
          <div>
            <em>EVENT LIFECYCLE</em>
            <h2>Kelola agenda</h2>
            <p>Draft, terbitkan, dan pantau respons agenda.</p>
          </div>
        </div>
        {message && (
          <p className="success-message">
            <Check />
            {message}
          </p>
        )}
        {!formOpen && error && <p className="error-message">{error}</p>}
        <section className="card event-management">
          <div className="ledger-head">
            <div>
              <em>SEMUA AGENDA</em>
              <h3>Daftar agenda</h3>
            </div>
            <b>{visible.length} agenda</b>
          </div>
          <div className="finance-toolbar">
            <label className="finance-search">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari agenda"
              />
            </label>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as "all" | EventStatus)
              }
            >
              <option value="all">Semua status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <select
              value={rsvpFilter}
              onChange={(event) =>
                setRsvpFilter(event.target.value as "all" | Rsvp["status"])
              }
            >
              <option value="all">Semua RSVP</option>
              <option value="attending">Hadir</option>
              <option value="maybe">Mungkin</option>
              <option value="declined">Tidak hadir</option>
            </select>
          </div>
          {visible.length === 0 ? (
            <p className="system-message">Tidak ada agenda yang cocok.</p>
          ) : (
            <div className="event-management-list">
              {visible.map((event) => {
                const stats = rsvpStats(event.id);
                const selected = rsvpFilter === "all" || stats[rsvpFilter] > 0;
                return (
                  selected && (
                    <article key={event.id}>
                      <div>
                        <em>
                          {event.type} · {event.status}
                        </em>
                        <h3>{event.title}</h3>
                        <p>
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(event.start_at))}{" "}
                          WIB · {event.location_name || "Lokasi menyusul"}
                        </p>
                        <small>
                          RSVP: {stats.attending} hadir · {stats.maybe} mungkin
                          · {stats.declined} tidak hadir
                        </small>
                        {event.cancellation_reason && (
                          <small>Pembatalan: {event.cancellation_reason}</small>
                        )}
                      </div>
                      <div className="event-management-actions">
                        <button onClick={() => beginEdit(event)}>
                          <Pencil />
                          Edit
                        </button>
                        {event.status === "draft" && (
                          <button
                            onClick={() =>
                              void changeStatus(event, "published")
                            }
                          >
                            <CalendarCheck2 />
                            Publikasikan
                          </button>
                        )}
                        {event.status === "published" && (
                          <button
                            onClick={() =>
                              void changeStatus(event, "completed")
                            }
                          >
                            <Check />
                            Selesaikan
                          </button>
                        )}
                        {["draft", "published"].includes(event.status) && (
                          <button
                            className="danger"
                            onClick={() =>
                              void changeStatus(event, "cancelled")
                            }
                          >
                            <XCircle />
                            Batalkan
                          </button>
                        )}
                      </div>
                    </article>
                  )
                );
              })}
            </div>
          )}
        </section>
        <FloatingActionButton label="Agenda baru" onClick={beginCreate} />
        <ModalSheet
          open={formOpen}
          onClose={reset}
          eyebrow={editing ? "EDIT AGENDA" : "AGENDA BARU"}
          title={editing ? "Perbarui agenda" : "Buat draft agenda"}
        >
          <form className="event-create-form sheet-form" onSubmit={save}>
            <label className="field-title">
              Judul agenda
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={3}
                maxLength={120}
                required
              />
            </label>
            <label className="field-type">
              Jenis agenda
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="kopdar">Kopdar</option>
                <option value="riding">Riding</option>
                <option value="touring">Touring</option>
                <option value="social">Social</option>
                <option value="other">Lainnya</option>
              </select>
            </label>
            <label className="field-location">
              Lokasi
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                maxLength={180}
              />
            </label>
            <label className="field-url">
              Link Maps (opsional)
              <input
                type="url"
                value={locationUrl}
                onChange={(event) => setLocationUrl(event.target.value)}
              />
            </label>
            <label className="field-start">
              Waktu mulai
              <input
                type="datetime-local"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </label>
            <label className="field-meetup">
              Meetup (opsional)
              <input
                type="datetime-local"
                value={meetup}
                onChange={(event) => setMeetup(event.target.value)}
              />
            </label>
            <label className="field-end">
              Waktu selesai (opsional)
              <input
                type="datetime-local"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
            <label className="field-description entry-description">
              Deskripsi
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={3}
              />
            </label>
            {error && <p className="error-message">{error}</p>}
            <div className="sheet-actions">
              <button className="primary-action" disabled={saving}>
                {saving ? (
                  "MENYIMPAN…"
                ) : editing ? (
                  "SIMPAN PERUBAHAN"
                ) : (
                  <>
                    <Plus />
                    SIMPAN DRAFT
                  </>
                )}
              </button>
              <button type="button" className="outline-action" onClick={reset}>
                BATAL
              </button>
            </div>
          </form>
        </ModalSheet>
      </div>
    </AppShell>
  );
}
