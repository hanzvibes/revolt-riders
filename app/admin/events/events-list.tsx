import { CalendarCheck2, Check, Pencil, Search, Trash2 } from "lucide-react";
import {
  getRsvpStats,
  type EventStatus,
  type ManagedEvent,
  type Rsvp,
} from "./events-model";

type EventsListProps = {
  events: ManagedEvent[];
  rsvps: Rsvp[];
  query: string;
  filter: "all" | EventStatus;
  rsvpFilter: "all" | Rsvp["status"];
  onQueryChange: (value: string) => void;
  onFilterChange: (value: "all" | EventStatus) => void;
  onRsvpFilterChange: (value: "all" | Rsvp["status"]) => void;
  onEdit: (event: ManagedEvent) => void;
  onChangeStatus: (event: ManagedEvent, status: EventStatus) => void;
  onDelete: (event: ManagedEvent) => void;
};

export function EventsList({
  events,
  rsvps,
  query,
  filter,
  rsvpFilter,
  onQueryChange,
  onFilterChange,
  onRsvpFilterChange,
  onEdit,
  onChangeStatus,
  onDelete,
}: EventsListProps) {
  return (
    <section className="card event-management">
      <div className="ledger-head">
        <div>
          <em>Semua agenda</em>
          <h3>Daftar agenda</h3>
        </div>
        <b>{events.length} agenda</b>
      </div>

      <div className="finance-toolbar">
        <label className="finance-search">
          <Search />
          <input
            aria-label="Cari agenda"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari agenda"
          />
        </label>

        <select
          aria-label="Filter status agenda"
          value={filter}
          onChange={(event) =>
            onFilterChange(event.target.value as "all" | EventStatus)
          }
        >
          <option value="all">Semua status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="completed">Selesai</option>
        </select>

        <select
          aria-label="Filter RSVP agenda"
          value={rsvpFilter}
          onChange={(event) =>
            onRsvpFilterChange(event.target.value as "all" | Rsvp["status"])
          }
        >
          <option value="all">Semua RSVP</option>
          <option value="attending">Hadir</option>
          <option value="maybe">Mungkin</option>
          <option value="declined">Tidak hadir</option>
        </select>
      </div>

      {events.length === 0 ? (
        <p className="system-message">Tidak ada agenda yang cocok.</p>
      ) : (
        <div className="event-management-list">
          {events.map((event) => {
            const stats = getRsvpStats(rsvps, event.id);
            const selected = rsvpFilter === "all" || stats[rsvpFilter] > 0;
            if (!selected) return null;

            return (
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
                    RSVP: {stats.attending} hadir · {stats.maybe} mungkin · {stats.declined}{" "}
                    tidak hadir
                  </small>
                </div>

                <div className="event-management-actions">
                  <button onClick={() => onEdit(event)}>
                    <Pencil />
                    Edit
                  </button>

                  {event.status === "draft" && (
                    <button onClick={() => onChangeStatus(event, "published")}>
                      <CalendarCheck2 />
                      Publikasikan
                    </button>
                  )}

                  {event.status === "published" && (
                    <button onClick={() => onChangeStatus(event, "completed")}>
                      <Check />
                      Selesaikan
                    </button>
                  )}

                  <button
                    className="danger"
                    title="Hapus agenda ini secara permanen"
                    onClick={() => onDelete(event)}
                  >
                    <Trash2 />
                    Hapus
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
