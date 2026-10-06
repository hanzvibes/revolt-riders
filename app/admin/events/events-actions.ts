import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fromInputDate,
  parseOfficialDistance,
  slugifyEventTitle,
  type EventFormState,
  type EventStatus,
  type ManagedEvent,
} from "./events-model";

export const saveEventRecord = async ({
  editing,
  userId,
  form,
}: {
  editing: ManagedEvent | null;
  userId: string;
  form: EventFormState;
}) => {
  const startAt = fromInputDate(form.start);
  if (!startAt) throw new Error("Waktu mulai wajib diisi.");

  const payload = {
    title: form.title.trim(),
    type: form.type,
    description: form.description.trim() || null,
    location_name: form.location.trim() || null,
    location_url: form.locationUrl.trim() || null,
    start_at: startAt,
    meetup_at: fromInputDate(form.meetup),
    end_at: fromInputDate(form.end),
    is_public: form.isPublic,
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
          slug: `${slugifyEventTitle(form.title)}-${crypto.randomUUID().slice(0, 6)}`,
          status: "draft",
          created_by: userId,
        })
        .select("id")
        .single();

  if (result.error) throw result.error;
  if (!result.data?.id) throw new Error("Agenda belum dapat disimpan.");
  return result.data.id as string;
};

export const saveEventActivity = async ({
  eventId,
  form,
  editing,
}: {
  eventId: string;
  form: EventFormState;
  editing: ManagedEvent | null;
}) => {
  const { error } = await getSupabaseBrowserClient().rpc("save_event_activity", {
    p_event_id: eventId,
    p_counts_as_mandatory: form.countsAsMandatory,
    p_official_distance_km: parseOfficialDistance(form.officialDistance),
    p_official_support: editing?.official_support ?? null,
    p_activity_summary: editing?.activity_summary ?? null,
    p_member_external_ids: form.participantIds,
  });
  if (error) throw error;
};

export const syncOfficialRidesIfReady = async ({
  eventId,
  status,
  mandatory,
  distanceKm,
  participantIds,
}: {
  eventId: string;
  status: EventStatus;
  mandatory: boolean;
  distanceKm: number | null;
  participantIds: string[];
}) => {
  if (
    status === "draft" ||
    !mandatory ||
    !distanceKm ||
    distanceKm <= 0 ||
    participantIds.length === 0
  ) {
    return 0;
  }

  const { data, error } = await getSupabaseBrowserClient().rpc(
    "sync_event_official_rides",
    { p_event_id: eventId },
  );
  if (error) throw error;

  return Number((data as { synced_members?: number } | null)?.synced_members) || 0;
};

export const deleteEvent = async (eventId: string) => {
  const { error } = await getSupabaseBrowserClient().rpc("delete_event", {
    p_event_id: eventId,
  });
  if (error) throw error;
};

export const updateEventStatus = async (
  eventId: string,
  status: EventStatus,
) => {
  const patch = {
    status,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    published_at: status === "published" ? new Date().toISOString() : undefined,
    completed_at: status === "completed" ? new Date().toISOString() : undefined,
  };

  const { error } = await getSupabaseBrowserClient()
    .from("events")
    .update(patch)
    .eq("id", eventId);
  if (error) throw error;
};
