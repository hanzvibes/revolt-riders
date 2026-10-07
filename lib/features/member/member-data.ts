import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type MemberDisplay = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  club_role: string | null;
  total_km: number;
  city?: string | null;
  motorcycle?: string | null;
  join_date?: string | null;
  join_date_label?: string | null;
  touring_count: number;
};

export type MemberTouringItem = {
  id: string;
  no: number;
  title: string;
  km: number | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
  date?: string | null;
  source: "ride_log" | "event_attendance";
};

type DetailRow = {
  member_external_id: string;
  nickname_override: string | null;
  motorcycle: string | null;
  city_override: string | null;
};

type MemberDbRow = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  club_role: string | null;
  total_km: number | string | null;
  city: string | null;
  join_date: string | null;
};

type RideLogItem = {
  id: string;
  event_id: string | null;
  title?: string | null;
  distance_km: number | string | null;
  odometer_start?: number | string | null;
  odometer_end?: number | string | null;
  created_at: string;
};

type AttendanceItem = {
  event_id: string;
  checked_in_at: string;
};

export function getMemberDataClient() {
  return getSupabaseBrowserClient();
}

export async function fetchMemberDirectory(): Promise<MemberDisplay[]> {
  const supabase = getMemberDataClient();
  const [profilesRes, detailsRes, rideCountsRes] = await Promise.all([
    supabase
      .from("member_profiles")
      .select(
        "member_external_id,full_name,nickname,club_role,total_km,city,join_date",
      )
      .order("full_name"),
    supabase
      .from("member_details")
      .select(
        "member_external_id,nickname_override,motorcycle,city_override",
      ),
    supabase
      .from("ride_logs")
      .select("member_external_id")
      .eq("status", "approved"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (detailsRes.error) throw detailsRes.error;
  if (rideCountsRes.error) throw rideCountsRes.error;

  const detailMap = new Map<string, DetailRow>(
    ((detailsRes.data ?? []) as DetailRow[]).map((detail) => [
      detail.member_external_id,
      detail,
    ]),
  );

  const rideCountByMember = new Map<string, number>();
  for (const ride of (rideCountsRes.data ?? []) as {
    member_external_id: string;
  }[]) {
    if (!ride.member_external_id) continue;
    rideCountByMember.set(
      ride.member_external_id,
      (rideCountByMember.get(ride.member_external_id) || 0) + 1,
    );
  }

  return ((profilesRes.data ?? []) as MemberDbRow[]).map((row) => {
    const detail = detailMap.get(row.member_external_id);
    const joinDate = row.join_date;
    let joinDateLabel = joinDate;

    if (joinDate) {
      try {
        joinDateLabel = new Intl.DateTimeFormat("id-ID", {
          dateStyle: "long",
        }).format(new Date(joinDate));
      } catch {
        joinDateLabel = joinDate;
      }
    }

    return {
      member_external_id: row.member_external_id,
      full_name: row.full_name,
      nickname: detail?.nickname_override || row.nickname || null,
      club_role: row.club_role || null,
      total_km: Number(row.total_km) || 0,
      city: detail?.city_override || row.city || null,
      motorcycle: detail?.motorcycle || null,
      join_date: joinDate,
      join_date_label: joinDateLabel,
      touring_count: rideCountByMember.get(row.member_external_id) || 0,
    };
  });
}

export async function fetchMemberTouring(
  memberExternalId: string,
): Promise<{ items: MemberTouringItem[]; cacheable: boolean }> {
  const supabase = getMemberDataClient();
  const [rideLogsRes, attendanceRes] = await Promise.all([
    supabase
      .from("ride_logs")
      .select(
        "id,event_id,title,distance_km,odometer_start,odometer_end,created_at",
      )
      .eq("member_external_id", memberExternalId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_attendance")
      .select("event_id,checked_in_at")
      .eq("member_external_id", memberExternalId)
      .order("checked_in_at", { ascending: false }),
  ]);

  let cacheable = !rideLogsRes.error && !attendanceRes.error;
  const rides = (rideLogsRes.data ?? []) as RideLogItem[];
  const attendance = (attendanceRes.data ?? []) as AttendanceItem[];
  const eventIds = [
    ...new Set(
      [
        ...rides.map((ride) => ride.event_id),
        ...attendance.map((item) => item.event_id),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];

  const eventsRes = eventIds.length
    ? await supabase.from("events").select("id,title").in("id", eventIds)
    : { data: [], error: null };

  if (eventsRes.error) cacheable = false;

  const eventTitleMap = new Map<string, string>(
    ((eventsRes.data ?? []) as { id: string; title: string }[]).map((event) => [
      event.id,
      event.title,
    ]),
  );

  const items: MemberTouringItem[] = [];
  let counter = 1;

  for (const ride of rides) {
    const title =
      ride.title &&
      !["Ride Mandiri", "Ride mandiri"].includes(ride.title.trim())
        ? ride.title
        : ride.event_id
          ? eventTitleMap.get(ride.event_id) || "Agenda Riding"
          : "Touring / Sowan Mandiri";

    items.push({
      id: `ride-${ride.id}`,
      no: counter++,
      title,
      km: ride.distance_km !== null ? Number(ride.distance_km) : null,
      odometer_start:
        ride.odometer_start !== null && ride.odometer_start !== undefined
          ? Number(ride.odometer_start)
          : null,
      odometer_end:
        ride.odometer_end !== null && ride.odometer_end !== undefined
          ? Number(ride.odometer_end)
          : null,
      date: ride.created_at,
      source: "ride_log",
    });
  }

  const coveredEventIds = new Set(
    rides.map((ride) => ride.event_id).filter(Boolean),
  );
  for (const item of attendance) {
    if (!item.event_id || coveredEventIds.has(item.event_id)) continue;
    items.push({
      id: `att-${item.event_id}-${item.checked_in_at}`,
      no: counter++,
      title: eventTitleMap.get(item.event_id) || "Kegiatan Komunitas",
      km: null,
      date: item.checked_in_at,
      source: "event_attendance",
    });
  }

  return { items, cacheable };
}
