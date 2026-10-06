"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { AppShell } from "@/components/app-shell";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { Check, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  deleteEvent,
  saveEventActivity,
  saveEventRecord,
  syncOfficialRidesIfReady,
  updateEventStatus,
} from "./events-actions";
import { fetchAdminEventsSnapshot, subscribeAdminEvents } from "./events-data";
import { EventsFormModal } from "./events-form-modal";
import { EventsList } from "./events-list";
import {
  canManageEvents,
  createEmptyEventForm,
  eventToForm,
  filterEvents,
  parseOfficialDistance,
  toggleParticipantId,
  type AdminEventsSnapshot,
  type EventFormState,
  type EventStatus,
  type ManagedEvent,
  type Member,
  type Participant,
  type Rsvp,
} from "./events-model";

export default function AdminEventsScreen() {
  const { confirmAction } = useActionDialog();
  const { user, account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();

  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ManagedEvent | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | EventStatus>("all");
  const [rsvpFilter, setRsvpFilter] = useState<"all" | Rsvp["status"]>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(() => createEmptyEventForm());

  const invalidateAgendaCaches = useCallback(() => {
    invalidateCache("admin:events:");
    invalidateCache("dashboard_upcoming_events");
    invalidateCache("voyager:");
    invalidateCache("riding:");
  }, [invalidateCache]);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (account?.status !== "active" || !canManageEvents(account.role)) {
        setLoading(false);
        return;
      }

      if (!forceRefresh) setLoading(true);
      setError("");

      try {
        const snapshot = await fetchWithCache<AdminEventsSnapshot>(
          "admin:events:workspace",
          fetchAdminEventsSnapshot,
          { ttlMs: 30_000, forceRefresh },
        );

        setEvents(snapshot.events);
        setRsvps(snapshot.rsvps);
        setMembers(snapshot.members);
        setParticipants(snapshot.participants);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Data agenda belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [account, fetchWithCache],
  );

  useEffect(() => {
    if (
      accessLoading ||
      account?.status !== "active" ||
      !canManageEvents(account.role)
    ) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "voyager") return;

    setEditing(null);
    setForm(createEmptyEventForm({ type: "voyager", countsAsMandatory: true }));
    setError("");
    setMessage("");
    setFormOpen(true);
    window.history.replaceState(null, "", "/admin/events");
  }, [accessLoading, account?.status, account?.role]);

  useEffect(() => {
    if (
      accessLoading ||
      account?.status !== "active" ||
      !canManageEvents(account.role)
    ) {
      return;
    }

    void load();
    return subscribeAdminEvents(() => {
      invalidateAgendaCaches();
      void load(true);
    });
  }, [accessLoading, account?.role, account?.status, invalidateAgendaCaches, load]);

  const reset = useCallback(() => {
    setEditing(null);
    setForm(createEmptyEventForm());
    setFormOpen(false);
  }, []);

  const beginCreate = () => {
    setEditing(null);
    setForm(createEmptyEventForm());
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const beginEdit = (event: ManagedEvent) => {
    const eventParticipantIds = participants
      .filter((item) => item.event_id === event.id)
      .map((item) => item.member_external_id);

    setEditing(event);
    setForm(eventToForm(event, eventParticipantIds));
    setFormOpen(true);
    setError("");
    setMessage("");
  };

  const handleFormChange = (patch: Partial<EventFormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleToggleParticipant = (memberId: string) => {
    setForm((current) => ({
      ...current,
      participantIds: toggleParticipantId(current.participantIds, memberId),
    }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !account) return;

    setSaving(true);
    setError("");
    setMessage("");

    let targetId: string;
    try {
      targetId = await saveEventRecord({ editing, userId: user.id, form });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agenda belum dapat disimpan.");
      setSaving(false);
      return;
    }

    try {
      await saveEventActivity({ eventId: targetId, form, editing });
    } catch (caught) {
      setError(
        `Agenda tersimpan, tetapi pengaturan aktivitas gagal: ${
          caught instanceof Error ? caught.message : "Pengaturan aktivitas gagal."
        }`,
      );
      setSaving(false);
      invalidateAgendaCaches();
      await load(true);
      return;
    }

    let syncedMembers = 0;
    if (editing) {
      try {
        syncedMembers = await syncOfficialRidesIfReady({
          eventId: targetId,
          status: editing.status,
          mandatory: form.countsAsMandatory,
          distanceKm: parseOfficialDistance(form.officialDistance),
          participantIds: form.participantIds,
        });
      } catch (caught) {
        setError(
          `Agenda tersimpan, tetapi Official KM belum tersinkron: ${
            caught instanceof Error ? caught.message : "Sinkronisasi gagal."
          }`,
        );
        setSaving(false);
        invalidateAgendaCaches();
        await load(true);
        return;
      }
    }

    setMessage(
      editing
        ? syncedMembers > 0
          ? `Agenda berhasil diperbarui. Official KM tersinkron ke ${syncedMembers} member.`
          : "Agenda berhasil diperbarui."
        : "Draft agenda berhasil dibuat. Publikasikan saat siap.",
    );
    reset();
    invalidateAgendaCaches();
    await load(true);
    setSaving(false);
  };

  const syncOfficialKm = async () => {
    if (!editing) return;
    if (editing.status === "draft") {
      setError("Publikasikan agenda terlebih dahulu sebelum Sync Official KM.");
      return;
    }
    if (!form.countsAsMandatory) {
      setError("Aktifkan Count as Mandatory Ride terlebih dahulu.");
      return;
    }

    const parsedDistance = parseOfficialDistance(form.officialDistance);
    if (!parsedDistance || parsedDistance <= 0) {
      setError("Isi Official Trip Distance lebih dari 0 KM.");
      return;
    }
    if (form.participantIds.length === 0) {
      setError("Pilih minimal satu participant.");
      return;
    }

    setSyncing(true);
    setError("");
    setMessage("");

    try {
      await saveEventActivity({ eventId: editing.id, form, editing });
      const count = await syncOfficialRidesIfReady({
        eventId: editing.id,
        status: editing.status,
        mandatory: true,
        distanceKm: parsedDistance,
        participantIds: form.participantIds,
      });

      setMessage(`Official KM berhasil disinkronkan ke ${count} member.`);
      invalidateAgendaCaches();
      await load(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Sinkronisasi Official KM gagal.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const deletePermanently = async (event: ManagedEvent) => {
    if (
      !(await confirmAction({
        title: "Hapus agenda permanen?",
        description: `Agenda "${event.title}" beserta undangan dan respons terkait akan dibersihkan dari sistem.`,
        confirmLabel: "Hapus Permanen",
        cancelLabel: "Batal",
        destructive: true,
      }))
    ) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await deleteEvent(event.id);
      setMessage(`Agenda "${event.title}" berhasil dihapus secara permanen.`);
      invalidateAgendaCaches();
      await load(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Agenda gagal dihapus.");
    }
  };

  const changeStatus = async (event: ManagedEvent, status: EventStatus) => {
    if (!user) return;
    if (
      !(await confirmAction({
        title: status === "completed" ? "Selesaikan agenda?" : "Publikasikan agenda?",
        description:
          status === "completed"
            ? "Agenda akan dipindahkan ke History komunitas."
            : "Agenda akan terlihat sebagai agenda aktif untuk member.",
        confirmLabel: status === "completed" ? "Tandai Selesai" : "Publikasikan",
        cancelLabel: "Batal",
      }))
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await updateEventStatus(event.id, status);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status agenda gagal diperbarui.");
      return;
    }

    const participantIds = participants
      .filter((item) => item.event_id === event.id)
      .map((item) => item.member_external_id);

    let syncedMembers = 0;
    try {
      syncedMembers = await syncOfficialRidesIfReady({
        eventId: event.id,
        status,
        mandatory: event.counts_as_mandatory,
        distanceKm: event.official_distance_km,
        participantIds,
      });
    } catch (caught) {
      setError(
        `Status agenda berhasil diperbarui, tetapi Official KM belum tersinkron: ${
          caught instanceof Error ? caught.message : "Sinkronisasi gagal."
        }`,
      );
      invalidateAgendaCaches();
      await load(true);
      return;
    }

    setMessage(
      status === "completed"
        ? syncedMembers > 0
          ? `Agenda masuk History komunitas. Official KM tersinkron ke ${syncedMembers} member.`
          : "Agenda masuk History komunitas."
        : syncedMembers > 0
          ? `Agenda dipublikasikan. Official KM tersinkron ke ${syncedMembers} member.`
          : "Agenda dipublikasikan.",
    );
    invalidateAgendaCaches();
    await load(true);
  };

  const visibleEvents = useMemo(
    () => filterEvents(events, filter, query),
    [events, filter, query],
  );

  if (accessLoading || loading) {
    return (
      <AppShell active="Kelola Agenda" title="Manajemen Agenda">
        <PageSkeleton title="Memuat Manajemen Agenda..." />
      </AppShell>
    );
  }

  if (account?.status !== "active" || !canManageEvents(account?.role)) {
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
  }

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
          <p className="success-message" role="status" aria-live="polite">
            <Check aria-hidden="true" />
            {message}
          </p>
        )}
        {!formOpen && error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <EventsList
          events={visibleEvents}
          rsvps={rsvps}
          query={query}
          filter={filter}
          rsvpFilter={rsvpFilter}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          onRsvpFilterChange={setRsvpFilter}
          onEdit={beginEdit}
          onChangeStatus={(event, status) => void changeStatus(event, status)}
          onDelete={(event) => void deletePermanently(event)}
        />

        <FloatingActionButton label="Agenda baru" onClick={beginCreate} />

        <EventsFormModal
          open={formOpen}
          editing={editing}
          form={form}
          members={members}
          saving={saving}
          syncing={syncing}
          error={error}
          onChange={handleFormChange}
          onToggleParticipant={handleToggleParticipant}
          onSubmit={(event) => void save(event)}
          onSyncOfficialKm={() => void syncOfficialKm()}
          onClose={reset}
        />
      </div>
    </AppShell>
  );
}
