import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  type GalleryPhoto,
  type Member,
  type Participant,
  type RideRow,
  type VoyagerEventRow,
  type VoyagerSnapshot,
} from "./voyager-model";

export async function fetchVoyagerSnapshot(
  memberExternalId: string,
  year: number,
): Promise<VoyagerSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const startYear = new Date(Date.UTC(year, 0, 1)).toISOString();
  const nextYear = new Date(Date.UTC(year + 1, 0, 1)).toISOString();

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
      .eq("member_external_id", memberExternalId)
      .eq("status", "approved")
      .eq("counts_as_mandatory", true)
      .gte("created_at", startYear)
      .lt("created_at", nextYear),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (membersRes.error) throw membersRes.error;
  if (ridesRes.error) throw ridesRes.error;

  const events = ((eventsRes.data ?? []) as VoyagerEventRow[]).map((item) => ({
    ...item,
    official_distance_km:
      item.official_distance_km === null
        ? null
        : Number(item.official_distance_km),
  }));
  const members = (membersRes.data ?? []) as Member[];
  const mandatoryKm = ((ridesRes.data ?? []) as RideRow[]).reduce(
    (sum, row) => sum + (Number(row.distance_km) || 0),
    0,
  );

  const eventIds = events.map((item) => item.id);
  if (eventIds.length === 0) {
    return {
      events,
      members,
      participants: [],
      photos: [],
      mandatoryKm,
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

  const photos = rawPhotos.map((photo) => ({
    ...photo,
    signedUrl: /^https?:\/\//i.test(photo.image_url)
      ? photo.image_url
      : signedUrlByPath.get(photo.image_url),
  }));

  return {
    events,
    members,
    participants: (participantsRes.data ?? []) as Participant[],
    photos,
    mandatoryKm,
  };
}
