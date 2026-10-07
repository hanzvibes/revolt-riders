import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type Profile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
  join_date: string | null;
  club_role: string | null;
  total_km: number;
};

export type ProfileDetail = {
  nickname_override: string | null;
  motorcycle: string | null;
  city_override: string | null;
};

export type PrimaryMotorcycle = {
  nickname: string | null;
  brand: string;
  model: string;
};

export type ProfileRide = {
  id: string;
  event_id: string | null;
  title: string | null;
  status: "pending" | "approved" | "rejected";
  distance_km: number | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
  created_at: string;
  rejection_reason: string | null;
};

type ProfileRideRow = Omit<
  ProfileRide,
  "distance_km" | "odometer_start" | "odometer_end"
> & {
  distance_km: number | string | null;
  odometer_start?: number | string | null;
  odometer_end?: number | string | null;
};

export type ProfileRsvpActivity = {
  event_id: string;
  status: "attending" | "declined" | "maybe";
  responded_at: string;
};

export type ProfileActivityEvent = { id: string; title: string };

export type ProfileSnapshot = {
  profile: Profile | null;
  detail: ProfileDetail | null;
  primaryMotorcycle: PrimaryMotorcycle | null;
  rides: ProfileRide[];
  rsvpActivities: ProfileRsvpActivity[];
  activityEvents: ProfileActivityEvent[];
};

export function getProfileDataClient() {
  return getSupabaseBrowserClient();
}

export async function fetchProfileSnapshot(
  memberExternalId: string,
): Promise<ProfileSnapshot> {
  const supabase = getProfileDataClient();
  const [profileResult, detailResult, rideResult, rsvpResult, garageResult] =
    await Promise.all([
      supabase
        .from("member_profiles")
        .select(
          "member_external_id,full_name,nickname,city,join_date,club_role,total_km",
        )
        .eq("member_external_id", memberExternalId)
        .maybeSingle(),
      supabase
        .from("member_details")
        .select("nickname_override,motorcycle,city_override")
        .eq("member_external_id", memberExternalId)
        .maybeSingle(),
      supabase
        .from("ride_logs")
        .select(
          "id,event_id,title,status,distance_km,odometer_start,odometer_end,created_at,rejection_reason",
        )
        .eq("member_external_id", memberExternalId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("event_rsvps")
        .select("event_id,status,responded_at")
        .eq("member_external_id", memberExternalId)
        .order("responded_at", { ascending: false })
        .limit(15),
      supabase
        .from("member_motorcycles")
        .select("nickname,brand,model")
        .eq("member_external_id", memberExternalId)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

  if (profileResult.error) throw profileResult.error;
  if (detailResult.error) throw detailResult.error;
  if (rideResult.error) throw rideResult.error;
  if (rsvpResult.error) throw rsvpResult.error;
  if (garageResult.error) throw garageResult.error;

  const profile = profileResult.data
    ? ({
        ...profileResult.data,
        total_km: Number(profileResult.data.total_km),
      } as Profile)
    : null;
  const detail = detailResult.data as ProfileDetail | null;
  const rides = ((rideResult.data ?? []) as ProfileRideRow[]).map((ride) => ({
    ...ride,
    distance_km: ride.distance_km === null ? null : Number(ride.distance_km),
    odometer_start:
      ride.odometer_start === null || ride.odometer_start === undefined
        ? null
        : Number(ride.odometer_start),
    odometer_end:
      ride.odometer_end === null || ride.odometer_end === undefined
        ? null
        : Number(ride.odometer_end),
  })) as ProfileRide[];
  const rsvpActivities = (rsvpResult.data ?? []) as ProfileRsvpActivity[];
  const activityEventIds = [
    ...new Set(
      [
        ...rides.map((ride) => ride.event_id),
        ...rsvpActivities.map((rsvp) => rsvp.event_id),
      ].filter(Boolean),
    ),
  ] as string[];

  let activityEvents: ProfileActivityEvent[] = [];
  if (activityEventIds.length > 0) {
    const eventResult = await supabase
      .from("events")
      .select("id,title")
      .in("id", activityEventIds);
    if (eventResult.error) throw eventResult.error;
    activityEvents = (eventResult.data ?? []) as ProfileActivityEvent[];
  }

  return {
    profile,
    detail,
    primaryMotorcycle:
      (garageResult.data as PrimaryMotorcycle | null) ?? null,
    rides,
    rsvpActivities,
    activityEvents,
  };
}
