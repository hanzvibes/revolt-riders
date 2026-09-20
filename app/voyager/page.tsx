"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  CalendarDays,
  Camera,
  CheckCircle2,
  History,
  MapPin,
  Route,
  Settings,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type VoyagerEvent = {
  id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  location_url: string | null;
  start_at: string;
  status: "draft" | "published" | "completed";
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
  official_support: string | null;
  activity_summary: string | null;
};

type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
};

type Participant = {
  event_id: string;
  member_external_id: string;
};

type GalleryPhoto = {
  id: string;
  event_id: string | null;
  title: string;
  image_url: string;
  signed_url: string | null;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

const formatKm = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  );

export default function VoyagerPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const [events, setEvents] = useState<VoyagerEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [mandatoryKm, setMandatoryKm] = useState(0);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [detail, setDetail] = useState<VoyagerEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeAccount = account?.status === "active" ? account : null;
  const canManage =
    activeAccount?.role === "admin" || activeAccount?.role === "superadmin";

  const load = useCallback(async () => {
    if (!activeAccount) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const year = new Date().getFullYear();
      const startYear = new Date(Date.UTC(year, 0, 1)).toISOString();
      const endYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

      const [eventsResult, membersResult, kmResult] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,title,description,location_name,location_url,start_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary",
          )
          .eq("type", "voyager")
          .in("status", ["published", "completed"])
          .order("start_at", { ascending: false }),
        supabase
          .from("member_profiles")
          .select("member_external_id,full_name,nickname")
          .order("full_name", { ascending: true }),
        supabase
          .from("ride_logs")
          .select("distance_km")
          .eq("member_external_id", activeAccount.member_external_id)
          .eq("status", "approved")
          .eq("counts_as_mandatory", true)
          .gte("created_at", startYear)
          .lt("created_at", endYear),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (membersResult.error) throw membersResult.error;
      if (kmResult.error) throw kmResult.error;

      const eventRows: VoyagerEvent[] = (eventsResult.data ?? []).map((row) => ({
        id: String(row.id),
        title: String(row.title),
        description: row.description ? String(row.description) : null,
        location_name: row.location_name ? String(row.location_name) : null,
        location_url: row.location_url ? String(row.location_url) : null,
        start_at: String(row.start_at),
        status: row.status as VoyagerEvent["status"],
        counts_as_mandatory: Boolean(row.counts_as_mandatory),
        official_distance_km:
          row.official_distance_km === null ||
          row.official_distance_km === undefined
            ? null
            : Number(row.official_distance_km),
        official_support: row.official_support
          ? String(row.official_support)
          : null,
        activity_summary: row.activity_summary
          ? String(row.activity_summary)
          : null,
      }));

      setEvents(eventRows);
      setMembers(
        (membersResult.data ?? []).map((row) => ({
          member_external_id: String(row.member_external_id),
          full_name: String(row.full_name),
          nickname: row.nickname ? String(row.nickname) : null,
        })),
      );
      setMandatoryKm(
        (kmResult.data ?? []).reduce(
          (total, row) => total + (Number(row.distance_km) || 0),
          0,
        ),
      );

      const eventIds = eventRows.map((event) => event.id);
      if (eventIds.length === 0) {
        setParticipants([]);
        setPhotos([]);
        return;
      }

      const [participantsResult, galleryResult] = await Promise.all([
        supabase
          .from("event_participants")
          .select("event_id,member_external_id")
          .in("event_id", eventIds),
        supabase
          .from("club_gallery")
          .select("id,event_id,title,image_url")
          .in("event_id", eventIds)
          .order("created_at", { ascending: true }),
      ]);

      if (participantsResult.error) throw participantsResult.error;
      if (galleryResult.error) throw galleryResult.error;

      setParticipants(
        (participantsResult.data ?? []).map((row) => ({
          event_id: String(row.event_id),
          member_external_id: String(row.member_external_id),
        })),
      );

      const galleryRows = galleryResult.data ?? [];
      const resolvedPhotos = await Promise.all(
        galleryRows.map(async (row): Promise<GalleryPhoto> => {
          const path = String(row.image_url);
          if (/^https?:\/\//i.test(path)) {
            return {
              id: String(row.id),
              event_id: row.event_id ? String(row.event_id) : null,
              title: String(row.title || "Dokumentasi Voyager"),
              image_url: path,
              signed_url: path,
            };
          }

          const signed = await supabase.storage
            .from("club-activity")
            .createSignedUrl(path, 60 * 60);

          return {
            id: String(row.id),
            event_id: row.event_id ? String(row.event_id) : null,
            title: String(row.title || "Dokumentasi Voyager"),
            image_url: path,
            signed_url: signed.data?.signedUrl ?? null,
          };
        }),
      );

      setPhotos(resolvedPhotos);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Data Voyager belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  const activeEvents = useMemo(
    () => events.filter((event) => event.status !== "completed"),
    [events],
  );
  const historyEvents = useMemo(
    () => events.filter((event) => event.status === "completed"),
    [events],
  );
  const visibleEvents = tab === "active" ? activeEvents : historyEvents;

  const participantsFor = (eventId: string) => {
    const participantIds = new Set(
      participants
        .filter((item) => item.event_id === eventId)
        .map((item) => item.member_external_id),
    );
    return members.filter((member) =>
      participantIds.has(member.member_external_id),
    );
  };

  const photosFor = (eventId: string) =>
    photos.filter((photo) => photo.event_id === eventId);

  if (accessLoading || loading) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <div className="page-wrap">
          <p className="system-message">Memuat Voyager…</p>
        </div>
      </AppShell>
    );
  }

  if (!activeAccount) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <div className="page-wrap">
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akun member aktif diperlukan</h2>
            <p>Voyager hanya tersedia untuk member Revolt Riders aktif.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Voyager" title="Voyager">
      <div className="page-wrap voyager-page">
        <section className="voyager-hero">
          <div>
            <em>REVOLT RIDERS · CLUB ACTIVITY</em>
            <h2>Voyager</h2>
            <p>
              Jejak riding resmi club, participant, dokumentasi, dan KM
              Mandatory dalam satu alur agenda.
            </p>
          </div>
          <div className="voyager-km">
            <small>MANDATORY KM {new Date().getFullYear()}</small>
            <strong>{formatKm(mandatoryKm)} KM</strong>
            <span>Total riding Mandatory terverifikasi milikmu.</span>
          </div>
        </section>

        {error && <p className="error-message">{error}</p>}

        {canManage && (
          <div className="voyager-admin-shortcut">
            <span>
              <Settings />
              <b>Pengelolaan Voyager</b>
              <small>
                Buat agenda, pilih participant, atur Official Distance, dan Sync
                KM dari Manajemen Agenda.
              </small>
            </span>
            <Link href="/admin/events">Kelola</Link>
          </div>
        )}

        <div className="voyager-tabs" role="tablist" aria-label="Voyager">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "active"}
            className={tab === "active" ? "active" : ""}
            onClick={() => setTab("active")}
          >
            <Route />
            Aktif
            <b>{activeEvents.length}</b>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "history"}
            className={tab === "history" ? "active" : ""}
            onClick={() => setTab("history")}
          >
            <History />
            History
            <b>{historyEvents.length}</b>
          </button>
        </div>

        {visibleEvents.length === 0 ? (
          <section className="empty-state card">
            <Route />
            <h2>
              {tab === "active"
                ? "Belum ada Voyager aktif"
                : "Belum ada history Voyager"}
            </h2>
            <p>
              Agenda dengan jenis Voyager akan muncul otomatis di halaman ini.
            </p>
          </section>
        ) : (
          <section className="voyager-grid">
            {visibleEvents.map((event) => {
              const eventParticipants = participantsFor(event.id);
              const eventPhotos = photosFor(event.id);
              const joined = eventParticipants.some(
                (member) =>
                  member.member_external_id ===
                  activeAccount.member_external_id,
              );

              return (
                <article className="voyager-card" key={event.id}>
                  <button
                    type="button"
                    className="voyager-card-main"
                    onClick={() => setDetail(event)}
                  >
                    <span className="voyager-date">
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
                    <span className="voyager-card-copy">
                      <em>
                        VOYAGER ·{" "}
                        {event.status === "completed"
                          ? "COMPLETED"
                          : "UPCOMING"}
                      </em>
                      <strong>{event.title}</strong>
                      <small>
                        <MapPin />
                        {event.location_name ?? "Lokasi menyusul"}
                      </small>
                    </span>
                  </button>

                  <div className="voyager-card-meta">
                    <span>
                      <UsersRound />
                      <b>{eventParticipants.length}</b>
                      <small>Member</small>
                    </span>
                    <span>
                      <Bike />
                      <b>
                        {event.official_distance_km
                          ? formatKm(event.official_distance_km)
                          : "—"}
                      </b>
                      <small>KM resmi</small>
                    </span>
                    <span>
                      <Camera />
                      <b>{eventPhotos.length}</b>
                      <small>Foto</small>
                    </span>
                  </div>

                  <div className="voyager-card-foot">
                    <div>
                      {event.counts_as_mandatory && (
                        <span className="voyager-badge">Mandatory Ride</span>
                      )}
                      {joined && (
                        <span className="voyager-badge neutral">Kamu ikut</span>
                      )}
                    </div>
                    <button type="button" onClick={() => setDetail(event)}>
                      Detail
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <ModalSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        eyebrow="VOYAGER DETAIL"
        title={detail?.title ?? "Voyager"}
      >
        {detail && (
          <div className="voyager-detail">
            <div className="voyager-detail-head">
              <span>
                <small>STATUS</small>
                <b>
                  {detail.status === "completed" ? "Completed" : "Published"}
                </b>
              </span>
              <span>
                <small>OFFICIAL DISTANCE</small>
                <b>
                  {detail.official_distance_km
                    ? `${formatKm(detail.official_distance_km)} KM`
                    : "Belum diisi"}
                </b>
              </span>
              <span>
                <small>PARTICIPANT</small>
                <b>{participantsFor(detail.id).length} Member</b>
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
                {formatDate(detail.start_at)}
              </p>
              <p>
                <MapPin />
                {detail.location_name ?? "Lokasi belum dicatat"}
              </p>
              {detail.location_url && (
                <a href={detail.location_url} target="_blank" rel="noreferrer">
                  Buka lokasi
                </a>
              )}
              {detail.description && (
                <div className="voyager-story">{detail.description}</div>
              )}
              {detail.activity_summary && (
                <div className="voyager-story">{detail.activity_summary}</div>
              )}
            </section>

            {detail.official_support && (
              <section className="voyager-support">
                <small>OFFICIAL SUPPORT</small>
                <strong>{detail.official_support}</strong>
              </section>
            )}

            <section className="voyager-detail-block">
              <div className="section-title">
                <span>
                  <em>Rombongan</em>
                  <h3>Member yang ikut</h3>
                </span>
                <b>{participantsFor(detail.id).length}</b>
              </div>
              <div className="voyager-participant-list">
                {participantsFor(detail.id).length === 0 ? (
                  <p className="system-message">Participant belum dicatat.</p>
                ) : (
                  participantsFor(detail.id).map((member) => (
                    <span key={member.member_external_id}>
                      <i>
                        {member.member_external_id
                          .replace(/^RR-?/i, "")
                          .slice(0, 3)}
                      </i>
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
                <b>{photosFor(detail.id).length}</b>
              </div>
              {photosFor(detail.id).length === 0 ? (
                <p className="system-message">
                  Dokumentasi belum ditambahkan pengurus.
                </p>
              ) : (
                <div className="voyager-gallery">
                  {photosFor(detail.id).map((photo) => (
                    <figure key={photo.id}>
                      {photo.signed_url ? (
                        <img
                          src={photo.signed_url}
                          alt={photo.title || "Dokumentasi Voyager"}
                        />
                      ) : (
                        <span>Foto tidak tersedia</span>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </section>

            {detail.counts_as_mandatory && (
              <section className="voyager-support">
                <CheckCircle2 />
                <span>
                  <small>MANDATORY RIDE</small>
                  <strong>Official KM dihitung ke progress peserta.</strong>
                </span>
              </section>
            )}
          </div>
        )}
      </ModalSheet>
    </AppShell>
  );
}
