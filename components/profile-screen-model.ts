export type Account = { member_external_id: string; role: string; status: string };
export type Profile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
  join_date: string | null;
  club_role: string | null;
  total_km: number;
};
export type Detail = {
  nickname_override: string | null;
  motorcycle: string | null;
  city_override: string | null;
};
export type PrimaryMotorcycle = {
  nickname: string | null;
  brand: string;
  model: string;
};
export type Ride = {
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
export type RideRow = Omit<Ride, "distance_km" | "odometer_start" | "odometer_end"> & {
  distance_km: number | string | null;
  odometer_start?: number | string | null;
  odometer_end?: number | string | null;
};
export type RsvpActivity = {
  event_id: string;
  status: "attending" | "declined" | "maybe";
  responded_at: string;
};
export type ActivityEvent = { id: string; title: string };
export type ProfileSnapshot = {
  profile: Profile | null;
  detail: Detail | null;
  primaryMotorcycle: PrimaryMotorcycle | null;
  rides: Ride[];
  rsvpActivities: RsvpActivity[];
  activityEvents: ActivityEvent[];
};

export const getRoleClass = (role: string | null) => {
  const r = (role ?? "").toUpperCase().trim();
  if (r === "PRESIDENT") return "badge-president";
  if (r === "FOUNDER") return "badge-founder";
  if (r === "EXCECUTOR" || r === "EXECUTOR") return "badge-executor";
  if (r === "NEGOSIATOR") return "badge-negosiator";
  if (r === "CAPROS") return "badge-capros";
  if (r === "PROSPEK") return "badge-prospek";
  if (r === "VIRGIN") return "badge-virgin";
  if (r === "LIFE MEMBER" || r === "LIFEMEMBER") return "badge-lifemember";
  if (r.includes("CAPTAIN")) return "badge-rc";
  if (
    r.includes("ADMIN") ||
    r.includes("KETUA") ||
    r.includes("SEKRETARIS") ||
    r.includes("BENDAHARA")
  )
    return "badge-admin";
  return "";
};
