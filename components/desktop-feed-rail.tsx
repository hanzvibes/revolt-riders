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
import { useCallback, useEffect, useMemo, useState } from "react";

type RailEvent = {
  id: string;
  title: string;
  slug: string;
  type: string;
  location_name: string | null;
  start_at: string;
  status: "published" | "completed";
  official_support?: string | null;
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
  const [events, setEvents] = useState<RailEvent[]>([]);
  const [enabled, setEnabled] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabaseBrowserClient()
      .from("events")
      .select(
        "id,title,slug,type,location_name,start_at,status,official_support",
      )
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(12);

    if (error) {
      console.error("Right rail dashboard gagal dimuat.", error);
      return;
    }

    setEvents((data ?? []) as RailEvent[]);
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

  const nextAgenda = useMemo(
    () => events.find((event) => event.type !== "voyager") ?? null,
    [events],
  );

  const nextVoyager = useMemo(
    () => events.find((event) => event.type === "voyager") ?? null,
    [events],
  );

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
