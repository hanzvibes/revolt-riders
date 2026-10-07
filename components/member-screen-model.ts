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

export type TouringItem = {
  id: string;
  no: number;
  title: string;
  km: number | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
  date?: string | null;
  source: "ride_log" | "event_attendance";
};
