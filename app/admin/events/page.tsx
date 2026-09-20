"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CalendarCheck2,
  Check,
  Pencil,
  Plus,
  Route,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type EventStatus = "draft" | "published" | "completed";
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
  is_public?: boolean;
  cancellation_reason: string | null;
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
  official_support: string | null;
  activity_summary: string | null;
};
type Rsvp = { event_id: string; status: "attending" | "declined" | "maybe" };
type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
};
type Participant = { event_id: string; member_external_id: string };
type AdminEventsSnapshot = {
  events: Event[];
  rsvps: Rsvp[];
  members: Member[];
  participants: Participant[];
};
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
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [events, setEvents] = useState<Event[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
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
  const [isPublic, setIsPublic] = useState(true);
  const [countsAsMandatory, setCountsAsMandatory] = useState(false);
  const [officialDistance, setOfficialDistance] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantQuery, setParticipantQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const load = useCallback(async (forceRefresh = false) => {
    if (account?.status !== "active" || !canManage(account.role)) {
      setLoading(false);
      return;
    }

    if (!forceRefresh) setLoading(true);
    setError("");

    try {
      const snapshot = await fetchWithCache<AdminEventsSnapshot>(
        "admin:events:workspace",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [eventResult, rsvpResult, memberResult, participantResult] =
            await Promise.all([
              supabase
                .from("events")
                .select(
                  "id,title,type,description,location_name,location_url,start_at,meetup_at,end_at,status,is_public,cancellation_reason,counts_as_mandatory,official_distance_km,official_support,activity_summary",
                )
                .order("start_at", { ascending: false }),
              supabase.from("event_rsvps").select("event_id,status"),
              supabase
                .from("member_profiles")
                .select("member_external_id,full_name,nickname,city")
                .order("full_name", { ascending: true }),
              supabase
                .from("event_participants")
                .select("event_id,member_external_id"),
            ]);

          const failed =
            eventResult.error ||
            rsvpResult.error ||
            memberResult.error ||
            participantResult.error;
          if (failed) throw failed;

          return {
            events: ((eventResult.data ?? []) as Event[]).map((item) => ({
              ...item,
              official_distance_km:
                item.official_distance_km === null
                  ? null
                  : Number(item.official_distance_km),
            })),
            rsvps: (rsvpResult.data ?? []) as Rsvp[],
            members: (memberResult.data ?? []) as Member[],
            participants: (participantResult.data ?? []) as Participant[],
          };
        },
        { ttlMs: 30_000, forceRefresh },
      );

      setEvents(snapshot.events);
      setRsvps(snapshot.rsvps);
      setMembers(snapshot.members);
      setParticipants(snapshot.participants);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Data agenda belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [account, fetchWithCache]);

  useEffect(() => {
    if (
      accessLoading ||
      account?.status !== "active" ||
      !canManage(account.role)
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "voyager") return;

    setEditing(null);
    setTitle("");
    setType("voyager");
    setDescription("");
    setLocation("");
    setLocationUrl("");
    setStart("");
    setMeetup("");
    setEnd("");
    setIsPublic(true);
    setCountsAsMandatory(true);
    setOfficialDistance("");
    setSelectedParticipants([]);
    setParticipantQuery("");
    setError("");
    setMessage("");
    setFormOpen(true);

    window.history.replaceState(null, "", "/admin/events");
  }, [accessLoading, account?.status, account?.role]);

  useEffect(() => {
    if (!accessLoading) void load();
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-events-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          invalidateCache("admin:events:");
          invalidateCache("dashboard_upcoming_events");
          invalidateCache("voyager:");
          void load(true);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [accessLoading, invalidateCache, load]);
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
    setIsPublic(true);
    setCountsAsMandatory(false);
    setOfficialDistance("");
    setSelectedParticipants([]);
    setParticipantQuery("");
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
    setIsPublic(event.is_public ?? true);
    setCountsAsMandatory(event.counts_as_mandatory ?? false);
    setOfficialDistance(
      event.official_distance_km === null || event.official_distance_km === undefined
        ? ""
        : String(event.official_distance_km),
    );
    setSelectedParticipants(
      participants
        .filter((item) => item.event_id === event.id)
        .map((item) => item.member_external_id),
    );
    setParticipantQuery("");
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
      is_public: isPublic,
    };
    const supabase = getSupabaseBrowserClient();
    const result = editing
      ? await supabase
          .from("events")
          .update(payload)
          .eq("id", editing.id)
          .select("id")
          .single()
      : await supabase
          .from("events")
          .insert({
            ...payload,
            slug: `${slugify(title)}-${Date.now().toString().slice(-6)}`,
            status: "draft",
            created_by: user.id,
          })
          .select("id")
          .single();

    if (result.error || !result.data?.id) {
      setError(result.error?.message ?? "Agenda belum dapat disimpan.");
      setSaving(false);
      return;
    }

    const targetId = result.data.id;
    const parsedDistance =
      officialDistance.trim() === "" ? null : Math.max(0, Number(officialDistance) || 0);
    const { error: activityError } = await supabase.rpc("save_event_activity", {
      p_event_id: targetId,
      p_counts_as_mandatory: countsAsMandatory,
      p_official_distance_km: parsedDistance,
      p_official_support: editing?.official_support ?? null,
      p_activity_summary: editing?.activity_summary ?? null,
      p_member_external_ids: selectedParticipants,
    });

    if (activityError) {
      setError(`Agenda tersimpan, tetapi pengaturan aktivitas gagal: ${activityError.message}`);
      setSaving(false);
      invalidateCache("admin:events:");
    invalidateCache("dashboard_upcoming_events");
    invalidateCache("voyager:");
    invalidateCache("riding:");
    await load(true);
      return;
    }

    setMessage(
      editing
        ? "Agenda berhasil diperbarui."
        : "Draft agenda berhasil dibuat. Publikasikan saat siap.",
    );
    reset();
    invalidateCache("admin:events:");
    invalidateCache("dashboard_upcoming_events");
    invalidateCache("voyager:");
    invalidateCache("riding:");
    await load(true);
    setSaving(false);
  };
  const toggleParticipant = (memberId: string) => {
    setSelectedParticipants((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const filteredMembers = useMemo(() => {
    const term = participantQuery.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      `${member.member_external_id} ${member.full_name} ${member.nickname ?? ""} ${member.city ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [members, participantQuery]);

  const syncOfficialKm = async () => {
    if (!editing) return;
    if (editing.status === "draft") {
      setError("Publikasikan agenda terlebih dahulu sebelum Sync Official KM.");
      return;
    }
    if (!countsAsMandatory) {
      setError("Aktifkan Count as Mandatory Ride terlebih dahulu.");
      return;
    }
    if (Number(officialDistance) <= 0) {
      setError("Isi Official Trip Distance lebih dari 0 KM.");
      return;
    }
    if (selectedParticipants.length === 0) {
      setError("Pilih minimal satu participant.");
      return;
    }

    setSyncing(true);
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const parsedDistance = Math.max(0, Number(officialDistance) || 0);
    const { error: activityError } = await supabase.rpc("save_event_activity", {
      p_event_id: editing.id,
      p_counts_as_mandatory: true,
      p_official_distance_km: parsedDistance,
      p_official_support: editing.official_support,
      p_activity_summary: editing.activity_summary,
      p_member_external_ids: selectedParticipants,
    });
    if (activityError) {
      setError(activityError.message);
      setSyncing(false);
      return;
    }

    const { data, error: syncError } = await supabase.rpc(
      "sync_event_official_rides",
      { p_event_id: editing.id },
    );
    setSyncing(false);
    if (syncError) {
      setError(syncError.message);
      return;
    }

    const count = Number((data as { synced_members?: number } | null)?.synced_members) || 0;
    setMessage(`Official KM berhasil disinkronkan ke ${count} member.`);
    invalidateCache("admin:events:");
    invalidateCache("dashboard_upcoming_events");
    invalidateCache("voyager:");
    invalidateCache("riding:");
    await load(true);
  };

  const deletePermanently = async (event: Event) => {
    if (
      !window.confirm(
        `Hapus agenda "${event.title}" secara permanen? Data undangan dan respons agenda ini akan dibersihkan dari sistem.`,
      )
    )
      return;
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const { error: rpcError } = await supabase.rpc("delete_event", {
      p_event_id: event.id,
    });
    if (rpcError) {
      // Fallback manual cleanup
      await supabase.from("ride_logs").delete().eq("event_id", event.id).eq("source_type", "official_agenda");
      await supabase.from("ride_logs").update({ event_id: null }).eq("event_id", event.id).neq("source_type", "official_agenda");
      await supabase.from("club_gallery").delete().eq("event_id", event.id);
      await supabase.from("event_participants").delete().eq("event_id", event.id);
      await supabase.from("event_checkin_codes").delete().eq("event_id", event.id);
      await supabase.from("event_attendance").delete().eq("event_id", event.id);
      await supabase.from("event_rsvps").delete().eq("event_id", event.id);
      await supabase.from("event_invitations").delete().eq("event_id", event.id);
      const { error: delError } = await supabase.from("events").delete().eq("id", event.id);
      if (delError) return setError(delError.message);
    }
    setMessage(`Agenda "${event.title}" berhasil dihapus secara permanen.`);
    invalidateCache("admin:events:");
    invalidateCache("dashboard_upcoming_events");
    invalidateCache("voyager:");
    invalidateCache("riding:");
    await load(true);
  };

  const changeStatus = async (event: Event, status: EventStatus) => {
    if (!user) return;
    if (
      !window.confirm(
        `${status === "completed" ? "Tandai agenda ini selesai?" : "Publikasikan agenda ini?"}`,
      )
    )
      return;
    setError("");
    setMessage("");
    const patch = {
      status,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      published_at:
        status === "published" ? new Date().toISOString() : undefined,
      completed_at: status === "completed" ? new Date().toISOString() : undefined,
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
          : "Agenda dipublikasikan.",
      );
      invalidateCache("admin:events:");
    invalidateCache("dashboard_upcoming_events");
    invalidateCache("voyager:");
    invalidateCache("riding:");
    await load(true);
    }
  };
  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          (event.status as string) !== "cancelled" &&
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
      <AppShell active="Kelola Agenda" title="Manajemen Agenda">
        <PageSkeleton title="Memuat Manajemen Agenda..." />
      </AppShell>
    );
  if (account?.status !== "active" || !canManage(account?.role))
    return (
      <AppShell active="Kelola Agenda" title="Manajemen Agenda">
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
    <AppShell active="Kelola Agenda" title="Manajemen Agenda">
      <div className="page-wrap admin-native-page">
        <div className="page-intro native-page-head">
          <div>
            <em>Siklus agenda</em>
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
              <em>Semua agenda</em>
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
                        <button
                          className="danger"
                          title="Hapus agenda ini secara permanen"
                          onClick={() =>
                            void deletePermanently(event)
                          }
                        >
                          <Trash2 />
                          Hapus
                        </button>
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
                <option value="voyager">Voyager</option>
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
            <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--line)", cursor: "pointer", marginTop: 4 }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--red)", cursor: "pointer" }}
              />
              <span style={{ display: "flex", flexDirection: "column" }}>
                <strong style={{ fontSize: "0.78rem", color: "var(--ink)" }}>Publik (Tampil di Landing Page)</strong>
                <small style={{ color: "var(--muted)", fontSize: "0.68rem" }}>
                  {isPublic ? "Agenda ini dapat dilihat masyarakat umum di Landing Page." : "Agenda internal (hanya terlihat member yang login)."}
                </small>
              </span>
            </label>
            <section className="voyager-admin-activity-fields">
              <div className="section-title">
                <span>
                  <em>Official ride</em>
                  <h3>Mandatory Ride & Participant</h3>
                </span>
                <b>{selectedParticipants.length} member</b>
              </div>

              <label className="voyager-switch">
                <input
                  type="checkbox"
                  checked={countsAsMandatory}
                  onChange={(event) => setCountsAsMandatory(event.target.checked)}
                />
                <span>
                  <b>Count as Mandatory Ride</b>
                  <small>
                    Agenda apa pun boleh dihitung Mandatory jika pengurus mengaktifkannya.
                  </small>
                </span>
              </label>

              {(countsAsMandatory || type === "voyager") && (
                <>
                  <label className="voyager-admin-distance">
                    Official Trip Distance
                    <div className="voyager-distance-input">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        value={officialDistance}
                        onChange={(event) => setOfficialDistance(event.target.value)}
                        placeholder="184"
                      />
                      <span>KM</span>
                    </div>
                    <small>Tidak ada minimum KM. Semua participant mendapat jarak yang sama.</small>
                  </label>

                  <label className="voyager-member-search">
                    <Search />
                    <input
                      value={participantQuery}
                      onChange={(event) => setParticipantQuery(event.target.value)}
                      placeholder="Cari participant berdasarkan nama atau ID RR"
                    />
                  </label>

                  <div className="voyager-member-picker">
                    {filteredMembers.map((member) => (
                      <label key={member.member_external_id}>
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(member.member_external_id)}
                          onChange={() => toggleParticipant(member.member_external_id)}
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

                  <small className="voyager-admin-helper">
                    Participant dipilih manual oleh pengurus dan tidak bergantung pada RSVP atau Check-in.
                  </small>

                  {editing && countsAsMandatory && (
                    <button
                      type="button"
                      className="voyager-admin-sync"
                      disabled={
                        syncing ||
                        saving ||
                        editing.status === "draft" ||
                        selectedParticipants.length === 0 ||
                        Number(officialDistance) <= 0
                      }
                      onClick={() => void syncOfficialKm()}
                    >
                      <Route />
                      {syncing ? "SINKRONISASI…" : "SYNC OFFICIAL KM"}
                    </button>
                  )}
                </>
              )}
            </section>

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
