export type VoyagerEvent = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  location_name: string | null;
  location_url: string | null;
  start_at: string;
  end_at: string | null;
  status: "draft" | "published" | "completed";
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
  official_support: string | null;
  activity_summary: string | null;
  completed_at: string | null;
};

export type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  city: string | null;
};

export type Participant = {
  event_id: string;
  member_external_id: string;
};

export type GalleryPhoto = {
  id: string;
  event_id: string | null;
  title: string;
  image_url: string;
  location: string | null;
  ride_date: string | null;
  signedUrl?: string;
};

export type RideRow = {
  distance_km: number | null;
};

export type VoyagerEventRow = Omit<VoyagerEvent, "official_distance_km"> & {
  official_distance_km: number | string | null;
};

export type VoyagerSnapshot = {
  events: VoyagerEvent[];
  members: Member[];
  participants: Participant[];
  photos: GalleryPhoto[];
  mandatoryKm: number;
};

export const isAdminRole = (role?: string) =>
  role === "admin" || role === "superadmin";

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

export const formatKm = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  );
