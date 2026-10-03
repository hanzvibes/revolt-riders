import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GalleryPhoto, VoyagerEvent } from "./voyager-model";

export type SaveVoyagerActivityInput = {
  eventId: string;
  countsAsMandatory: boolean;
  officialDistanceKm: number | null;
  officialSupport: string | null;
  activitySummary: string | null;
  memberExternalIds: string[];
};

export async function saveVoyagerActivity(input: SaveVoyagerActivityInput) {
  const { error } = await getSupabaseBrowserClient().rpc("save_event_activity", {
    p_event_id: input.eventId,
    p_counts_as_mandatory: input.countsAsMandatory,
    p_official_distance_km: input.officialDistanceKm,
    p_official_support: input.officialSupport,
    p_activity_summary: input.activitySummary,
    p_member_external_ids: input.memberExternalIds,
  });

  if (error) throw error;
}

export async function syncVoyagerOfficialKm(eventId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "sync_event_official_rides",
    { p_event_id: eventId },
  );

  if (error) throw error;
  return Number((data as { synced_members?: number } | null)?.synced_members) || 0;
}

export function validateVoyagerPhotos(files: File[]) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  const invalid = files.find(
    (file) => !allowed.has(file.type) || file.size > 8 * 1024 * 1024,
  );

  return invalid
    ? "Gunakan JPG, PNG, atau WEBP dengan ukuran maksimal 8 MB per foto."
    : null;
}

export async function uploadVoyagerPhotos(event: VoyagerEvent, files: File[]) {
  const supabase = getSupabaseBrowserClient();

  for (const file of files) {
    const extension =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${event.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("club-activity")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from("club_gallery").insert({
      event_id: event.id,
      title: event.title,
      image_url: path,
      location: event.location_name,
      ride_date: event.start_at.slice(0, 10),
      is_public: false,
    });

    if (rowError) {
      await supabase.storage.from("club-activity").remove([path]);
      throw rowError;
    }
  }

  return files.length;
}

export async function deleteVoyagerPhoto(photo: GalleryPhoto) {
  const supabase = getSupabaseBrowserClient();

  if (!/^https?:\/\//i.test(photo.image_url)) {
    const { error: storageError } = await supabase.storage
      .from("club-activity")
      .remove([photo.image_url]);
    if (storageError) throw storageError;
  }

  const { error: rowError } = await supabase
    .from("club_gallery")
    .delete()
    .eq("id", photo.id);
  if (rowError) throw rowError;
}
