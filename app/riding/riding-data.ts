import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  MemberProfile,
  RideEvent,
  RidingSnapshot,
  UserRide,
} from "./riding-model";

export async function fetchRidingSnapshot(
  memberExternalId: string,
): Promise<RidingSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const [eventsRes, profileRes, ridesRes] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,type,start_at")
      .in("status", ["published", "completed"])
      .in("type", ["riding", "touring"])
      .order("start_at", { ascending: false })
      .limit(50),
    supabase
      .from("member_profiles")
      .select("member_external_id,full_name,nickname,total_km")
      .eq("member_external_id", memberExternalId)
      .maybeSingle(),
    supabase
      .from("ride_logs")
      .select(
        "id,title,event_id,odometer_start,odometer_end,distance_km,status,created_at,rejection_reason,source_type,counts_as_mandatory",
      )
      .eq("member_external_id", memberExternalId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (profileRes.error) throw profileRes.error;
  if (ridesRes.error) throw ridesRes.error;

  const profile = profileRes.data
    ? {
        ...(profileRes.data as Omit<MemberProfile, "total_km"> & {
          total_km: number | string;
        }),
        total_km: Number(profileRes.data.total_km) || 0,
      }
    : null;

  const rides = ((ridesRes.data ?? []) as { [key: string]: unknown }[]).map(
    (ride): UserRide => ({
      id: String(ride.id),
      title: (ride.title as string) || null,
      event_id: (ride.event_id as string) || null,
      odometer_start: Number(ride.odometer_start) || 0,
      odometer_end: Number(ride.odometer_end) || 0,
      distance_km:
        ride.distance_km !== null && ride.distance_km !== undefined
          ? Number(ride.distance_km)
          : null,
      status: ride.status as UserRide["status"],
      created_at: String(ride.created_at),
      rejection_reason: (ride.rejection_reason as string) || null,
      source_type:
        (ride.source_type as UserRide["source_type"]) || "member_submission",
      counts_as_mandatory: Boolean(ride.counts_as_mandatory),
    }),
  );

  return {
    events: (eventsRes.data ?? []) as RideEvent[],
    profile,
    rides,
  };
}
