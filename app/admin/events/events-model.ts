export type EventStatus = "draft" | "published" | "completed";

export type ManagedEvent = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  location_name: string | null;
  location_url: string | null;
  start_at: string;
  meetup_at: string | null;
  end_at: string | null;
  status: EventStatus;
  is_public?: boolean;
  cancellation_reason: string | null;
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
  official_support: string | null;
  activity_summary: string | null;
};

export type Rsvp = {
  event_id: string;
  status: "attending" | "declined" | "maybe";
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

export type AdminEventsSnapshot = {
  events: ManagedEvent[];
  rsvps: Rsvp[];
  members: Member[];
  participants: Participant[];
};

export type EventFormState = {
  title: string;
  type: string;
  description: string;
  location: string;
  locationUrl: string;
  start: string;
  meetup: string;
  end: string;
  isPublic: boolean;
  countsAsMandatory: boolean;
  officialDistance: string;
  participantIds: string[];
  participantQuery: string;
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const jakartaFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: JAKARTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const canManageEvents = (role?: string) =>
  role === "admin" || role === "superadmin";

export const slugifyEventTitle = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const toInputDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = Object.fromEntries(
    jakartaFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const fromInputDate = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const date = new Date(`${normalized}:00+07:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Waktu agenda tidak valid.");
  }
  return date.toISOString();
};

export const createEmptyEventForm = ({
  type = "kopdar",
  countsAsMandatory = false,
}: {
  type?: string;
  countsAsMandatory?: boolean;
} = {}): EventFormState => ({
  title: "",
  type,
  description: "",
  location: "",
  locationUrl: "",
  start: "",
  meetup: "",
  end: "",
  isPublic: true,
  countsAsMandatory,
  officialDistance: "",
  participantIds: [],
  participantQuery: "",
});

export const eventToForm = (
  event: ManagedEvent,
  participantIds: string[],
): EventFormState => ({
  title: event.title,
  type: event.type,
  description: event.description ?? "",
  location: event.location_name ?? "",
  locationUrl: event.location_url ?? "",
  start: toInputDate(event.start_at),
  meetup: toInputDate(event.meetup_at),
  end: toInputDate(event.end_at),
  isPublic: event.is_public ?? true,
  countsAsMandatory: event.counts_as_mandatory ?? false,
  officialDistance:
    event.official_distance_km === null || event.official_distance_km === undefined
      ? ""
      : String(event.official_distance_km),
  participantIds,
  participantQuery: "",
});

export const parseOfficialDistance = (value: string) =>
  value.trim() === "" ? null : Math.max(0, Number(value) || 0);

export const toggleParticipantId = (current: string[], memberId: string) =>
  current.includes(memberId)
    ? current.filter((id) => id !== memberId)
    : [...current, memberId];

export const filterMembers = (members: Member[], query: string) => {
  const term = query.trim().toLowerCase();
  if (!term) return members;
  return members.filter((member) =>
    `${member.member_external_id} ${member.full_name} ${member.nickname ?? ""} ${member.city ?? ""}`
      .toLowerCase()
      .includes(term),
  );
};

export const filterEvents = (
  events: ManagedEvent[],
  filter: "all" | EventStatus,
  query: string,
) => {
  const term = query.trim().toLowerCase();
  return events.filter(
    (event) =>
      (event.status as string) !== "cancelled" &&
      (filter === "all" || event.status === filter) &&
      (!term ||
        `${event.title} ${event.type} ${event.location_name ?? ""}`
          .toLowerCase()
          .includes(term)),
  );
};

export const getRsvpStats = (rsvps: Rsvp[], eventId: string) => {
  const rows = rsvps.filter((item) => item.event_id === eventId);
  return {
    attending: rows.filter((item) => item.status === "attending").length,
    declined: rows.filter((item) => item.status === "declined").length,
    maybe: rows.filter((item) => item.status === "maybe").length,
  };
};
