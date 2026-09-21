"use client";

import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import type { EventRecord } from "@/lib/domain";
import { formatEventDate, formatShortDate } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CalendarDays, Clock3, MapPin, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function AgendaPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [view, setView] = useState<"upcoming" | "history">("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data, error: fetchError } = await getSupabaseBrowserClient()
        .from("events")
        .select(
          "id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status",
        )
        .in("status", ["published", "completed"])
        .order("start_at", { ascending: true });

      if (fetchError) throw fetchError;
      setEvents((data ?? []) as EventRecord[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agenda gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("agenda-page-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const { upcoming, history } = useMemo(() => {
    const now = Date.now();
    const upcomingEvents = events.filter(
      (event) =>
        event.status === "published" &&
        new Date(event.start_at).getTime() >= now,
    );
    const historyEvents = events
      .filter(
        (event) =>
          event.status === "completed" ||
          new Date(event.start_at).getTime() < now,
      )
      .sort(
        (a, b) =>
          new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
      );

    return { upcoming: upcomingEvents, history: historyEvents };
  }, [events]);

  const visible = view === "upcoming" ? upcoming : history;

  const refresh = () => {
    setLoading(true);
    setError("");
    void load();
  };

  if (loading && events.length === 0) {
    return (
      <AppShell active="Agenda" title="Agenda">
        <PageSkeleton title="Memuat Agenda..." />
      </AppShell>
    );
  }

  if (error && events.length === 0) {
    return (
      <AppShell active="Agenda" title="Agenda">
        <div className="page-wrap">
          <PageState
            tone="error"
            icon={<CalendarDays />}
            title="Agenda belum dapat dimuat"
            description={error}
            action={
              <button type="button" className="primary-action" onClick={refresh}>
                <RefreshCw />
                COBA LAGI
              </button>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Agenda" title="Agenda">
      <div className="page-wrap">
        <section className="page-intro">
          <div>
            <em>Agenda komunitas</em>
            <h2>Jadwal Revolt Riders</h2>
            <p>Agenda resmi, lokasi kumpul, dan waktu keberangkatan dalam WIB.</p>
          </div>
          <button
            type="button"
            className="outline-action"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={loading ? "spin" : ""} />
            {loading ? "Memuat" : "Refresh"}
          </button>
        </section>

        <div className="agenda-tabs" aria-label="Jenis agenda">
          <button
            type="button"
            aria-pressed={view === "upcoming"}
            className={view === "upcoming" ? "active" : ""}
            onClick={() => setView("upcoming")}
          >
            <CalendarDays />
            Mendatang <b>{upcoming.length}</b>
          </button>
          <button
            type="button"
            aria-pressed={view === "history"}
            className={view === "history" ? "active" : ""}
            onClick={() => setView("history")}
          >
            <Clock3 />
            Riwayat <b>{history.length}</b>
          </button>
        </div>

        {error ? (
          <p className="error-message" role="alert">{error}</p>
        ) : null}

        <div className="event-grid">
          {visible.map((event) => {
            const date = formatShortDate(event.start_at);
            return (
              <article className="agenda-detail" id={event.slug} key={event.id}>
                <time>
                  <b>{date.day}</b>
                  <small>{date.month}</small>
                </time>
                <div>
                  <div className="agenda-labels">
                    <em>{event.type}</em>
                    {view === "history" ? (
                      <small>{event.status === "completed" ? "SELESAI" : "TERLEWAT"}</small>
                    ) : null}
                  </div>
                  <h3>{event.title}</h3>
                  <p>{event.description ?? "Informasi lengkap akan diperbarui oleh pengurus."}</p>
                  <span><CalendarDays />{formatEventDate(event.start_at)}</span>
                  <span><MapPin />{event.location_name ?? "Lokasi menyusul"}</span>
                  {event.location_url ? (
                    <a href={event.location_url} target="_blank" rel="noreferrer">Buka lokasi</a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {!loading && !error && visible.length === 0 ? (
          <PageState
            icon={view === "upcoming" ? <CalendarDays /> : <Clock3 />}
            title={view === "upcoming" ? "Belum ada agenda mendatang" : "Belum ada riwayat agenda"}
            description={
              view === "upcoming"
                ? "Agenda yang dipublikasikan pengurus akan muncul otomatis di sini."
                : "Agenda yang selesai akan tersimpan sebagai histori komunitas."
            }
          />
        ) : null}
      </div>
    </AppShell>
  );
}
