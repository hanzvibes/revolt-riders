export type RideEvent = {
  id: string;
  title: string;
  type: "riding" | "touring";
  start_at: string;
};

export type UserRide = {
  id: string;
  title: string | null;
  event_id: string | null;
  odometer_start: number;
  odometer_end: number;
  distance_km: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  source_type: "member_submission" | "official_agenda";
  counts_as_mandatory: boolean;
};

export type MemberProfile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  total_km: number;
};

export type RidingSnapshot = {
  events: RideEvent[];
  profile: MemberProfile | null;
  rides: UserRide[];
};

export const eventDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
