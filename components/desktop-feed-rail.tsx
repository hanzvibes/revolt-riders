"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Route,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RailEvent = {
  id: string;
  title: string;
  slug: string;
  type: string;
  location_name: string | null;
  start_at: string;
  status: "published" | "completed";
};

function formatRailDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function RailEventItem({
  event,
  href,
}: {
  event: RailEvent;
  href: string;
}) {
  return (
    <Link className="desktop-feed-rail-event" href={href}>
      <strong>{event.title}</strong>
      <span>
        <Clock3 aria-hidden="true" />
        {formatRailDate(event.start_at)} WIB
      </span>
      <span>
        <MapPin aria-hidden="true" />
        {event.location_name || "Lokasi menyusul"}
      </span>
      <small>
        Buka detail
        <ChevronRight aria-hidden="true" />
      </small>
    </Link>
  );
}

export function DesktopFeedRail() {
  const [nextAgenda, setNextAgenda] = useState<RailEvent | null>(null);
  const [nextVoyager, setNextVoyager] = useState<RailEvent | null>(null);
  const [enabled, setEnabled] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();

    const [agendaResult, voyagerResult] = await Promise.all([
      supabase
        .from("events")
        .select("id,title,slug,type,location_name,start_at,status")
        .eq("status", "published")
        .neq("type", "voyager")
        .gte("start_at", now)
        .order("start_at", { ascending: true })
        .limit(1),
      supabase
        .from("events")
        .select("id,title,slug,type,location_name,start_at,status")
        .eq("status", "published")
        .eq("type", "voyager")
        .order("start_at", { ascending: false })
        .limit(6),
    ]);

    if (agendaResult.error) {
      console.error("Agenda right rail gagal dimuat.", agendaResult.error);
    } else {
      setNextAgenda(((agendaResult.data ?? [])[0] as RailEvent | undefined) ?? null);
    }

    if (voyagerResult.error) {
      console.error("Voyager right rail gagal dimuat.", voyagerResult.error);
      return;
    }

    const voyagerRows = (voyagerResult.data ?? []) as RailEvent[];
    const started = voyagerRows.find(
      (event) => new Date(event.start_at).getTime() <= Date.now(),
    );
    const upcoming = [...voyagerRows]
      .filter((event) => new Date(event.start_at).getTime() > Date.now())
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      )[0];

    setNextVoyager(started ?? upcoming ?? null);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");

    const sync = () => {
      setEnabled(query.matches);
    };

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void load();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("dashboard-right-rail")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, load]);

  if (!enabled) return null;

  return (
    <aside className="desktop-feed-rail" aria-label="Konteks komunitas">
      <section className="desktop-feed-rail-section">
        <header>
          <span>
            <CalendarDays aria-hidden="true" />
            Agenda terdekat
          </span>
          <Link href="/agenda">Lihat semua</Link>
        </header>

        {nextAgenda ? (
          <RailEventItem
            event={nextAgenda}
            href={`/agenda#${nextAgenda.slug}`}
          />
        ) : (
          <p className="desktop-feed-rail-empty">
            Belum ada agenda mendatang.
          </p>
        )}
      </section>

      <section className="desktop-feed-rail-section">
        <header>
          <span>
            <Route aria-hidden="true" />
            Voyager
          </span>
          <Link href="/voyager">Buka</Link>
        </header>

        {nextVoyager ? (
          <RailEventItem event={nextVoyager} href="/voyager" />
        ) : (
          <p className="desktop-feed-rail-empty">
            Belum ada Voyager aktif.
          </p>
        )}
      </section>

      <section className="desktop-feed-rail-section desktop-feed-support">
        <header>
          <span>Official Support</span>
        </header>
        <div className="desktop-feed-support-logo">
          <Image
            src="/bold-riders-situbondo.jpg"
            alt="Bold Riders Situbondo"
            fill
            sizes="260px"
          />
        </div>
        <p>
          Support resmi aktivitas Revolt Riders.
        </p>
      </section>
    </aside>
  );
}
