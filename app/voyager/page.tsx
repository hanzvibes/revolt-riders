"use client";

import Image from "next/image";
import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bike,
  CalendarDays,
  Camera,
  Check,
  History,
  MapPin,
  Route,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";

type VoyagerEvent = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  location_name: string | null;
  location_url: string | null;
  start_at: string;
  end_at: string | null;
  status: "draft" | "published" | "completed";
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
  official_support: string | null;
  activity_summary: string | null;
  completed_at: string | null;
};

type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
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
  location: string | null;
  ride_date: string | null;
  signedUrl?: string;
};

type RideRow = {
  distance_km: number | null;
};

type VoyagerEventRow = Omit<VoyagerEvent, "official_distance_km"> & {
  official_distance_km: number | string | null;
};

type VoyagerSnapshot = {
  events: VoyagerEvent[];
  members: Member[];
  participants: Participant[];
  photos: GalleryPhoto[];
  mandatoryKm: number;
};

const isAdminRole = (role?: string) => role === "admin" || role === "superadmin";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

const formatKm = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(Number(value) || 0);

export default function VoyagerPage() {
  const { confirmAction } = useActionDialog();
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();
  const [events, setEvents] = useState<VoyagerEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [mandatoryKm, setMandatoryKm] = useState(0);
  const [view, setView] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [detailEvent, setDetailEvent] = useState<VoyagerEvent | null>(null);
  const [manageEvent, setManageEvent] = useState<VoyagerEvent | null>(null);
  const [countsAsMandatory, setCountsAsMandatory] = useState(false);
  const [officialDistance, setOfficialDistance] = useState("");
  const [officialSupport, setOfficialSupport] = useState("");
  const [activitySummary, setActivitySummary] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const activeAccount = account?.status === "active" ? account : null;
  const canManage = Boolean(activeAccount && isAdminRole(activeAccount.role));

  const load = useCallback(async (forceRefresh = false) => {
    if (!activeAccount) {
      setLoading(false);
      return;
    }

    setError("");
    try {
      const year = new Date().getFullYear();
      const startYear = new Date(Date.UTC(year, 0, 1)).toISOString();
      const nextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
      const cacheKey = `voyager:${activeAccount.member_external_id}:${year}`;

      const snapshot = await fetchWithCache<VoyagerSnapshot>(
        cacheKey,
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [eventsRes, membersRes, ridesRes] = await Promise.all([
            supabase
              .from("events")
              .select(
                "id,title,slug,description,location_name,location_url,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at",
              )
              .eq("type", "voyager")
              .order("start_at", { ascending: false }),
            supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname,city")
              .order("full_name", { ascending: true }),
            supabase
              .from("ride_logs")
              .select("distance_km")
              .eq("member_external_id", activeAccount.member_external_id)
              .eq("status", "approved")
              .eq("counts_as_mandatory", true)
              .gte("created_at", startYear)
              .lt("created_at", nextYear),
          ]);

          if (eventsRes.error) throw eventsRes.error;
          if (membersRes.error) throw membersRes.error;
          if (ridesRes.error) throw ridesRes.error;

          const eventRows = ((eventsRes.data ?? []) as VoyagerEventRow[]).map((item) => ({
            ...item,
            official_distance_km:
              item.official_distance_km === null ? null : Number(item.official_distance_km),
          }));
          const memberRows = (membersRes.data ?? []) as Member[];
          const mandatoryTotal = ((ridesRes.data ?? []) as RideRow[]).reduce(
            (sum, row) => sum + (Number(row.distance_km) || 0),
            0,
          );

          const eventIds = eventRows.map((item) => item.id);
          if (eventIds.length === 0) {
            return {
              events: eventRows,
              members: memberRows,
              participants: [],
              photos: [],
              mandatoryKm: mandatoryTotal,
            };
          }

          const [participantsRes, photosRes] = await Promise.all([
            supabase
              .from("event_participants")
              .select("event_id,member_external_id")
              .in("event_id", eventIds),
            supabase
              .from("club_gallery")
              .select("id,event_id,title,image_url,location,ride_date")
              .in("event_id", eventIds)
              .order("created_at", { ascending: true }),
          ]);

          if (participantsRes.error) throw participantsRes.error;
          if (photosRes.error) throw photosRes.error;

          const rawPhotos = (photosRes.data ?? []) as GalleryPhoto[];
          const privatePhotos = rawPhotos.filter(
            (photo) => !/^https?:\/\//i.test(photo.image_url),
          );
          const signedUrlByPath = new Map<string, string>();

          if (privatePhotos.length > 0) {
            const privatePaths = privatePhotos.map((photo) => photo.image_url);
            const { data: signedRows, error: signedError } = await supabase.storage
              .from("club-activity")
              .createSignedUrls(privatePaths, 60 * 60);
            if (signedError) throw signedError;

            for (const row of signedRows ?? []) {
              if (row.path && row.signedUrl) {
                signedUrlByPath.set(row.path, row.signedUrl);
              }
            }
          }

          const resolvedPhotos = rawPhotos.map((photo) => ({
            ...photo,
            signedUrl: /^https?:\/\//i.test(photo.image_url)
              ? photo.image_url
              : signedUrlByPath.get(photo.image_url),
          }));

          return {
            events: eventRows,
            members: memberRows,
            participants: (participantsRes.data ?? []) as Participant[],
            photos: resolvedPhotos,
            mandatoryKm: mandatoryTotal,
          };
        },
        { ttlMs: 90_000, forceRefresh },
      );

      setEvents(snapshot.events);
      setMembers(snapshot.members);
      setParticipants(snapshot.participants);
      setPhotos(snapshot.photos);
      setMandatoryKm(snapshot.mandatoryKm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data Voyager belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [activeAccount, fetchWithCache]);

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
  const visibleEvents = view === "active" ? activeEvents : historyEvents;
  const featuredEvent = activeEvents[0] ?? historyEvents[0] ?? null;
  const totalOfficialKm = useMemo(
    () =>
      historyEvents.reduce(
        (sum, event) => sum + (Number(event.official_distance_km) || 0),
        0,
      ),
    [historyEvents],
  );
  const uniqueParticipantCount = useMemo(
    () => new Set(participants.map((item) => item.member_external_id)).size,
    [participants],
  );
  const participantIdsByEvent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const participant of participants) {
      const current = map.get(participant.event_id);
      if (current) current.push(participant.member_external_id);
      else map.set(participant.event_id, [participant.member_external_id]);
    }
    return map;
  }, [participants]);
  const memberById = useMemo(
    () => new Map(members.map((member) => [member.member_external_id, member])),
    [members],
  );
  const participantsByEvent = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const [eventId, memberIds] of participantIdsByEvent) {
      map.set(
        eventId,
        memberIds
          .map((memberId) => memberById.get(memberId))
          .filter((member): member is Member => Boolean(member)),
      );
    }
    return map;
  }, [memberById, participantIdsByEvent]);
  const photosByEvent = useMemo(() => {
    const map = new Map<string, GalleryPhoto[]>();
    for (const photo of photos) {
      if (!photo.event_id) continue;
      const current = map.get(photo.event_id);
      if (current) current.push(photo);
      else map.set(photo.event_id, [photo]);
    }
    return map;
  }, [photos]);
  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );
  const galleryPreview = useMemo(() => photos.slice(0, 4), [photos]);
  const currentMemberVoyagerEvents = useMemo(() => {
    const memberId = activeAccount?.member_external_id;
    if (!memberId) return [];
    const joinedEventIds = new Set(
      participants
        .filter((item) => item.member_external_id === memberId)
        .map((item) => item.event_id),
    );
    return events.filter((event) => joinedEventIds.has(event.id));
  }, [activeAccount?.member_external_id, events, participants]);
  const completedMemberVoyagers = useMemo(
    () =>
      currentMemberVoyagerEvents.filter((event) => event.status === "completed")
        .length,
    [currentMemberVoyagerEvents],
  );
  const featuredJoined = Boolean(
    featuredEvent &&
      currentMemberVoyagerEvents.some((event) => event.id === featuredEvent.id),
  );
  const featuredPhotoCount = featuredEvent
    ? (photosByEvent.get(featuredEvent.id)?.length ?? 0)
    : 0;
  const featuredMemberStatus = !featuredEvent
    ? "Belum ada Voyager"
    : featuredJoined
      ? featuredEvent.status === "completed"
        ? "Selesai"
        : "Tercatat"
      : "Belum tercatat";
  const journalEvents = featuredEvent
    ? visibleEvents.filter((event) => event.id !== featuredEvent.id)
    : visibleEvents;

  const participantIdsFor = (eventId: string) =>
    participantIdsByEvent.get(eventId) ?? [];

  const participantsFor = (eventId: string) =>
    participantsByEvent.get(eventId) ?? [];

  const photosFor = (eventId: string) =>
    photosByEvent.get(eventId) ?? [];

  const openManage = (event: VoyagerEvent) => {
    setManageEvent(event);
    setCountsAsMandatory(event.counts_as_mandatory);
    setOfficialDistance(
      event.official_distance_km === null ? "" : String(event.official_distance_km),
    );
    setOfficialSupport(event.official_support ?? "");
    setActivitySummary(event.activity_summary ?? "");
    setSelectedMembers(participantIdsFor(event.id));
    setMemberQuery("");
    setError("");
    setMessage("");
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const saveActivity = async (silent = false) => {
    if (!manageEvent || !canManage) return false;
    const parsedDistance =
      officialDistance.trim() === "" ? null : Math.max(0, Number(officialDistance) || 0);

    setSaving(true);
    setError("");
    if (!silent) setMessage("");

    const { error: rpcError } = await getSupabaseBrowserClient().rpc(
      "save_event_activity",
      {
        p_event_id: manageEvent.id,
        p_counts_as_mandatory: countsAsMandatory,
        p_official_distance_km: parsedDistance,
        p_official_support: officialSupport.trim() || null,
        p_activity_summary: activitySummary.trim() || null,
        p_member_external_ids: selectedMembers,
      },
    );

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }

    if (!silent) {
      setMessage("Pengaturan Voyager dan peserta berhasil disimpan.");
      await load(true);
    }
    return true;
  };

  const syncOfficialKm = async () => {
    if (!manageEvent || !canManage) return;
    if (manageEvent.status === "draft") {
      setError("Publikasikan agenda terlebih dahulu sebelum Sync Official KM.");
      return;
    }
    if (Number(officialDistance) <= 0) {
      setError("Isi Official Trip Distance lebih dari 0 KM sebelum sinkronisasi.");
      return;
    }
    if (selectedMembers.length === 0) {
      setError("Pilih minimal satu peserta sebelum sinkronisasi KM.");
      return;
    }

    setSyncing(true);
    setError("");
    setMessage("");

    const saved = await saveActivity(true);
    if (!saved) {
      setSyncing(false);
      return;
    }

    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc(
      "sync_event_official_rides",
      { p_event_id: manageEvent.id },
    );

    setSyncing(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const synced = Number((data as { synced_members?: number } | null)?.synced_members) || 0;
    setMessage(
      `Official KM berhasil disinkronkan ke ${synced} member tanpa membuat duplikat.`,
    );
    await load(true);
  };

  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!manageEvent || !canManage) return;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const invalid = files.find(
      (file) => !allowed.has(file.type) || file.size > 8 * 1024 * 1024,
    );
    if (invalid) {
      setError("Gunakan JPG, PNG, atau WEBP dengan ukuran maksimal 8 MB per foto.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();

    try {
      for (const file of files) {
        const extension =
          file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${manageEvent.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("club-activity")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { error: rowError } = await supabase.from("club_gallery").insert({
          event_id: manageEvent.id,
          title: manageEvent.title,
          image_url: path,
          location: manageEvent.location_name,
          ride_date: manageEvent.start_at.slice(0, 10),
          is_public: false,
        });

        if (rowError) {
          await supabase.storage.from("club-activity").remove([path]);
          throw rowError;
        }
      }

      setMessage(`${files.length} foto dokumentasi berhasil ditambahkan.`);
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload dokumentasi gagal.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (photo: GalleryPhoto) => {
    if (!canManage) return;
    if (
      !await confirmAction({
        title: "Hapus foto dokumentasi?",
        description: "Foto akan dihapus dari Gallery Voyager dan tidak bisa dipulihkan.",
        confirmLabel: "Hapus Foto",
        cancelLabel: "Batal",
        destructive: true,
      })
    )
      return;

    const supabase = getSupabaseBrowserClient();
    setError("");
    const { error: storageError } = /^https?:\/\//i.test(photo.image_url)
      ? { error: null }
      : await supabase.storage.from("club-activity").remove([photo.image_url]);

    if (storageError) {
      setError(storageError.message);
      return;
    }

    const { error: rowError } = await supabase
      .from("club_gallery")
      .delete()
      .eq("id", photo.id);

    if (rowError) setError(rowError.message);
    else {
      setMessage("Foto dokumentasi dihapus.");
      await load(true);
    }
  };

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${member.member_external_id} ${member.full_name} ${member.nickname ?? ""} ${member.city ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [memberQuery, members]);

  if (accessLoading || loading) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <PageSkeleton title="Memuat Voyager..." />
      </AppShell>
    );
  }

  if (!activeAccount) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <div className="page-wrap">
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akun member aktif diperlukan"
            description="Voyager hanya tersedia untuk member Revolt Riders yang aktif."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Voyager" title="Voyager">
      <div className="page-wrap voyager-page">
        <section className="voyager-hero voyager-hero-compact">
          <div className="voyager-hero-copy">
            <h2>Voyager</h2>
            <p>Progress riding resmi, participant, dan bukti foto club.</p>
          </div>
          <div className="voyager-hero-tools">
            <span className="voyager-km-inline">
              <small>MANDATORY {new Date().getFullYear()}</small>
              <strong>{formatKm(mandatoryKm)} KM</strong>
            </span>
            {canManage && (
              <Link className="voyager-create-action" href="/admin/events?create=voyager">
                <Plus /> Buat
              </Link>
            )}
          </div>
        </section>

        {message && (
          <p className="success-message">
            <Check />
            {message}
          </p>
        )}
        {error && <p className="error-message" role="alert">{error}</p>}

        {featuredEvent ? (
          <section className="voyager-command-card" aria-label="Voyager utama dan status saya">
            <div className="voyager-command-head">
              <div className="voyager-command-copy">
                <span className="voyager-command-status">
                  {featuredEvent.status === "completed" ? "COMPLETED" : "UPCOMING"}
                </span>
                <h3>{featuredEvent.title}</h3>
                <div className="voyager-command-meta">
                  <span><CalendarDays />{formatDate(featuredEvent.start_at)}</span>
                  <span><MapPin />{featuredEvent.location_name ?? "Lokasi menyusul"}</span>
                </div>
              </div>

              <div className="voyager-command-actions">
                <button type="button" onClick={() => setDetailEvent(featuredEvent)}>
                  Lihat detail
                </button>
                {canManage && (
                  <button type="button" onClick={() => openManage(featuredEvent)}>
                    Kelola
                  </button>
                )}
              </div>
            </div>

            <div className="voyager-command-member">
              <div className="voyager-command-member-copy">
                <small>STATUS KAMU</small>
                <strong>{featuredMemberStatus}</strong>
                <p>
                  {featuredJoined
                    ? featuredEvent.status === "completed"
                      ? "Voyager ini sudah tercatat di riwayatmu."
                      : "Kamu sudah tercatat sebagai participant."
                    : "Belum tercatat sebagai participant."}
                </p>
              </div>

              <div className="voyager-command-metrics">
                <span>
                  <History aria-hidden="true" />
                  <small>Riwayat</small>
                  <b>{completedMemberVoyagers}</b>
                </span>
                <span>
                  <Bike aria-hidden="true" />
                  <small>KM resmi</small>
                  <b>{featuredEvent.official_distance_km ? formatKm(featuredEvent.official_distance_km) : "—"}</b>
                </span>
                <button type="button" onClick={() => setDetailEvent(featuredEvent)}>
                  <Camera aria-hidden="true" />
                  <small>Bukti foto</small>
                  <b>{featuredPhotoCount}</b>
                </button>
                <span>
                  <UsersRound aria-hidden="true" />
                  <small>Participant</small>
                  <b>{participantsFor(featuredEvent.id).length}</b>
                </span>
              </div>
            </div>

            <div className="voyager-command-tags">
              {featuredEvent.counts_as_mandatory && <span>Mandatory Ride</span>}
              {featuredJoined && <span className="neutral">Kamu ikut</span>}
              {featuredEvent.official_support && (
                <span className="neutral">{featuredEvent.official_support}</span>
              )}
            </div>
          </section>
        ) : (
          <section className="voyager-structured-empty compact">
            <span className="voyager-empty-icon"><Route /></span>
            <div>
              <strong>Belum ada Voyager</strong>
              <p>Activity Voyager akan muncul di sini setelah dibuat pengurus.</p>
            </div>
            {canManage && <Link href="/admin/events?create=voyager">Buat Voyager</Link>}
          </section>
        )}

        <section className="voyager-stat-strip" aria-label="Ringkasan Voyager">
          <span><Route /><small>Aktif</small><strong>{activeEvents.length}</strong></span>
          <span><History /><small>Selesai</small><strong>{historyEvents.length}</strong></span>
          <span><Bike /><small>Official KM</small><strong>{formatKm(totalOfficialKm)}</strong></span>
          <span><UsersRound /><small>Participant</small><strong>{uniqueParticipantCount}</strong></span>
        </section>

        <section className="voyager-journal-section voyager-journal-primary">
          <div className="voyager-section-heading voyager-journal-heading">
            <span>
              <h3>Activity & History</h3>
            </span>
            <div className="voyager-tabs" role="tablist" aria-label="Filter Voyager">
              <button
                id="voyager-tab-active"
                type="button"
                role="tab"
                aria-selected={view === "active"}
                aria-controls="voyager-panel"
                className={view === "active" ? "active" : ""}
                onClick={() => setView("active")}
              >
                <Route /> Aktif <b>{activeEvents.length}</b>
              </button>
              <button
                id="voyager-tab-history"
                type="button"
                role="tab"
                aria-selected={view === "history"}
                aria-controls="voyager-panel"
                className={view === "history" ? "active" : ""}
                onClick={() => setView("history")}
              >
                <History /> History <b>{historyEvents.length}</b>
              </button>
            </div>
          </div>

          <div
            id="voyager-panel"
            className="voyager-list"
            role="tabpanel"
            aria-labelledby={view === "active" ? "voyager-tab-active" : "voyager-tab-history"}
          >
            {journalEvents.length === 0 ? (
              <div className="voyager-list-empty">
                <History />
                <span>
                  <strong>
                    {visibleEvents.length > 0
                      ? "Activity utama sudah tampil di atas"
                      : view === "active"
                        ? "Belum ada Voyager aktif"
                        : "History masih kosong"}
                  </strong>
                  <small>
                    {visibleEvents.length > 0
                      ? "Buka kartu utama untuk melihat detail dan bukti foto."
                      : "Activity akan muncul otomatis saat tersedia."}
                  </small>
                </span>
              </div>
            ) : (
              journalEvents.map((event) => {
                  const eventParticipants = participantsFor(event.id);
                  const eventPhotos = photosFor(event.id);
                  const joined = eventParticipants.some(
                    (member) => member.member_external_id === activeAccount.member_external_id,
                  );

                  return (
                    <button
                      type="button"
                      className="voyager-list-row"
                      key={event.id}
                      onClick={() => setDetailEvent(event)}
                      aria-label={`Buka detail ${event.title}`}
                    >
                      <span className="voyager-list-date">
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

                      <span className="voyager-list-copy">
                        <strong>{event.title}</strong>
                        <small><MapPin />{event.location_name ?? "Lokasi menyusul"}</small>
                      </span>

                      <span className="voyager-list-meta" aria-hidden="true">
                        <b>{eventParticipants.length}<small>member</small></b>
                        <b>{event.official_distance_km ? formatKm(event.official_distance_km) : "—"}<small>km</small></b>
                        <b>{eventPhotos.length}<small>foto</small></b>
                      </span>

                      <span className="voyager-list-flags">
                        {event.counts_as_mandatory && <i>Mandatory</i>}
                        {joined && <i className="neutral">Kamu ikut</i>}
                      </span>
                    </button>
                  );
                })
            )}
          </div>
        </section>

        <details className="voyager-disclosure">
          <summary>
            <span>
              <strong>Cara Mandatory KM dihitung</strong>
              <small>{formatKm(mandatoryKm)} KM terverifikasi · {new Date().getFullYear()}</small>
            </span>
            <b>Info</b>
          </summary>
          <div className="voyager-disclosure-body">
            <span>
              <Route />
              <b>Official Agenda Distance</b>
              <small>Voyager dan agenda Mandatory lain memakai sumber KM yang sama.</small>
            </span>
            <span>
              <Check />
              <b>Single source of truth</b>
              <small>KM tidak digandakan di Riding, Leaderboard, atau progress Mandatory.</small>
            </span>
          </div>
        </details>

        <section className="voyager-gallery-hub voyager-gallery-compact">
          <div className="voyager-section-heading">
            <span>
              <h3>Bukti Foto</h3>
            </span>
            <b className="voyager-section-count">{photos.length} Foto</b>
          </div>

          {galleryPreview.length === 0 ? (
            <div className="voyager-gallery-empty compact">
              <Camera aria-hidden="true" />
              <span>
                <strong>Belum ada dokumentasi</strong>
                <p>Foto akan muncul setelah pengurus menambahkan bukti aktivitas.</p>
              </span>
              {canManage && featuredEvent && (
                <button type="button" onClick={() => openManage(featuredEvent)}>
                  <Upload /> Tambah Foto
                </button>
              )}
            </div>
          ) : (
            <div className="voyager-gallery-hub-grid voyager-gallery-preview">
              {galleryPreview.map((photo) => {
                const relatedEvent = photo.event_id
                  ? eventById.get(photo.event_id)
                  : undefined;
                const photoLabel = relatedEvent?.title ?? photo.title;

                return (
                  <button
                    type="button"
                    key={photo.id}
                    onClick={() => {
                      if (relatedEvent) setDetailEvent(relatedEvent);
                    }}
                    aria-label={`Buka dokumentasi ${photoLabel}`}
                  >
                    {photo.signedUrl ? (
                      <Image
                        src={photo.signedUrl}
                        alt={photo.title || "Dokumentasi Voyager"}
                        width={640}
                        height={640}
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 520px) 50vw, 280px"
                      />
                    ) : (
                      <span><Camera /></span>
                    )}
                    <i>
                      <b>{photoLabel}</b>
                      <small>{photo.ride_date ? formatDate(photo.ride_date) : "Voyager"}</small>
                    </i>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ModalSheet
        open={Boolean(detailEvent)}
        onClose={() => setDetailEvent(null)}
        eyebrow="VOYAGER DETAIL"
        title={detailEvent?.title ?? "Voyager"}
      >
        {detailEvent && (
          <div className="voyager-detail">
            <div className="voyager-detail-head">
              <span>
                <small>STATUS</small>
                <b>{detailEvent.status === "completed" ? "Completed" : detailEvent.status}</b>
              </span>
              <span>
                <small>OFFICIAL DISTANCE</small>
                <b>
                  {detailEvent.official_distance_km
                    ? `${formatKm(detailEvent.official_distance_km)} KM`
                    : "Belum diisi"}
                </b>
              </span>
              <span>
                <small>PARTICIPANT</small>
                <b>{participantsFor(detailEvent.id).length} Member</b>
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
                {formatDate(detailEvent.start_at)}
              </p>
              <p>
                <MapPin />
                {detailEvent.location_name ?? "Lokasi belum dicatat"}
              </p>
              {detailEvent.location_url && (
                <a href={detailEvent.location_url} target="_blank" rel="noreferrer">
                  Buka lokasi
                </a>
              )}
              {detailEvent.description && <div className="voyager-story">{detailEvent.description}</div>}
              {detailEvent.activity_summary && (
                <div className="voyager-story">{detailEvent.activity_summary}</div>
              )}
            </section>

            {detailEvent.official_support && (
              <section className="voyager-support">
                <small>OFFICIAL SUPPORT</small>
                <strong>{detailEvent.official_support}</strong>
              </section>
            )}

            <section className="voyager-detail-block">
              <div className="section-title">
                <span>
                  <em>Rombongan</em>
                  <h3>Member yang ikut</h3>
                </span>
                <b>{participantsFor(detailEvent.id).length}</b>
              </div>
              <div className="voyager-participant-list">
                {participantsFor(detailEvent.id).length === 0 ? (
                  <p className="system-message">Peserta belum dicatat pengurus.</p>
                ) : (
                  participantsFor(detailEvent.id).map((member) => (
                    <span key={member.member_external_id}>
                      <i>{member.member_external_id.replace(/^RR-?/i, "").slice(0, 3)}</i>
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
                <b>{photosFor(detailEvent.id).length}</b>
              </div>
              {photosFor(detailEvent.id).length === 0 ? (
                <p className="system-message">Dokumentasi belum ditambahkan pengurus.</p>
              ) : (
                <div className="voyager-gallery">
                  {photosFor(detailEvent.id).map((photo) => (
                    <figure key={photo.id}>
                      {photo.signedUrl ? (
                        <Image
                        src={photo.signedUrl}
                        alt={photo.title || "Dokumentasi Voyager"}
                        width={640}
                        height={640}
                        sizes="(max-width: 520px) 50vw, 320px"
                      />
                      ) : (
                        <span>Foto tidak tersedia</span>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </section>

            {canManage && (
              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  const current = detailEvent;
                  setDetailEvent(null);
                  openManage(current);
                }}
              >
                Kelola Voyager
              </button>
            )}
          </div>
        )}
      </ModalSheet>

      <ModalSheet
        open={Boolean(manageEvent)}
        onClose={() => setManageEvent(null)}
        eyebrow="VOYAGER MANAGEMENT"
        title={manageEvent?.title ?? "Kelola Voyager"}
      >
        {manageEvent && (
          <div className="voyager-manage">
            <section className="voyager-manage-section">
              <div className="section-title">
                <span>
                  <em>Official trip</em>
                  <h3>Pengaturan aktivitas</h3>
                </span>
              </div>

              <label>
                Official Trip Distance
                <div className="voyager-distance-input">
                  <input
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.1"
                    value={officialDistance}
                    onChange={(event) => setOfficialDistance(event.target.value)}
                    placeholder="184"
                  />
                  <span>KM</span>
                </div>
                <small>Tidak ada minimum KM. Isi jarak resmi perjalanan bersama.</small>
              </label>

              <label className="voyager-switch">
                <input
                  type="checkbox"
                  checked={countsAsMandatory}
                  onChange={(event) => setCountsAsMandatory(event.target.checked)}
                />
                <span>
                  <b>Count as Mandatory Ride</b>
                  <small>KM resmi akan masuk akumulasi Mandatory Ride peserta.</small>
                </span>
              </label>

              <label>
                Official Support
                <input
                  value={officialSupport}
                  onChange={(event) => setOfficialSupport(event.target.value)}
                  maxLength={120}
                  placeholder="Contoh: Boldriders"
                />
                <small>Hanya tampil pada detail activity.</small>
              </label>

              <label>
                Activity Summary
                <textarea
                  value={activitySummary}
                  onChange={(event) => setActivitySummary(event.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder="Catatan singkat perjalanan…"
                />
              </label>
            </section>

            <section className="voyager-manage-section">
              <div className="section-title">
                <span>
                  <em>Participant</em>
                  <h3>Pilih member yang ikut</h3>
                </span>
                <b>{selectedMembers.length}</b>
              </div>

              <label className="voyager-member-search">
                <Search />
                <input
                  aria-label="Cari participant Voyager"
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Cari nama atau ID RR"
                />
              </label>

              <div className="voyager-member-picker">
                {filteredMembers.map((member) => (
                  <label key={member.member_external_id}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.member_external_id)}
                      onChange={() => toggleMember(member.member_external_id)}
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
              <small>
                Participant tidak bergantung pada RSVP atau Check-in. Semua member terpilih
                menerima Official Trip Distance yang sama saat KM disinkronkan.
              </small>
            </section>

            <section className="voyager-manage-section">
              <div className="section-title">
                <span>
                  <em>Documentation</em>
                  <h3>Foto aktivitas</h3>
                </span>
                <b>{photosFor(manageEvent.id).length}</b>
              </div>

              <label className="voyager-upload">
                <Upload />
                <span>
                  <b>{uploading ? "Mengunggah…" : "Tambah dokumentasi"}</b>
                  <small>JPG, PNG, WEBP · maksimal 8 MB per foto</small>
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploading}
                  onChange={(event) => void uploadPhotos(event)}
                />
              </label>

              {photosFor(manageEvent.id).length > 0 && (
                <div className="voyager-admin-gallery">
                  {photosFor(manageEvent.id).map((photo) => (
                    <figure key={photo.id}>
                      {photo.signedUrl ? (
                        <Image
                        src={photo.signedUrl}
                        alt={photo.title || "Dokumentasi Voyager"}
                        width={640}
                        height={640}
                        sizes="(max-width: 520px) 50vw, 320px"
                      />
                      ) : (
                        <span>Foto</span>
                      )}
                      <button
                        type="button"
                        aria-label="Hapus foto"
                        onClick={() => void removePhoto(photo)}
                      >
                        <Trash2 />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </section>

            {error && <p className="error-message" role="alert">{error}</p>}
            {message && (
              <p className="success-message">
                <Check />
                {message}
              </p>
            )}

            <div className="voyager-manage-actions">
              <button
                type="button"
                className="outline-action"
                disabled={saving || syncing}
                onClick={() => void saveActivity()}
              >
                <Save />
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={
                  saving ||
                  syncing ||
                  manageEvent.status === "draft" ||
                  selectedMembers.length === 0 ||
                  Number(officialDistance) <= 0
                }
                onClick={() => void syncOfficialKm()}
              >
                <Route />
                {syncing ? "Sinkronisasi…" : "Sync Official KM"}
              </button>
            </div>
          </div>
        )}
      </ModalSheet>
    </AppShell>
  );
}
