import type { GalleryPhoto, Member, Participant, VoyagerEvent } from "./voyager-model";

export type VoyagerView = "active" | "history";

export type VoyagerDerivedState = {
  activeEvents: VoyagerEvent[];
  historyEvents: VoyagerEvent[];
  visibleEvents: VoyagerEvent[];
  featuredEvent: VoyagerEvent | null;
  totalOfficialKm: number;
  uniqueParticipantCount: number;
  participantIdsByEvent: Map<string, string[]>;
  participantsByEvent: Map<string, Member[]>;
  photosByEvent: Map<string, GalleryPhoto[]>;
  eventById: Map<string, VoyagerEvent>;
  galleryPreview: GalleryPhoto[];
  currentMemberVoyagerEvents: VoyagerEvent[];
  completedMemberVoyagers: number;
  featuredJoined: boolean;
  featuredPhotoCount: number;
  featuredMemberStatus: string;
  journalEvents: VoyagerEvent[];
};

export function deriveVoyagerState({
  events,
  members,
  participants,
  photos,
  currentMemberId,
  view,
}: {
  events: VoyagerEvent[];
  members: Member[];
  participants: Participant[];
  photos: GalleryPhoto[];
  currentMemberId?: string | null;
  view: VoyagerView;
}): VoyagerDerivedState {
  const activeEvents = events.filter((event) => event.status !== "completed");
  const historyEvents = events.filter((event) => event.status === "completed");
  const visibleEvents = view === "active" ? activeEvents : historyEvents;
  const featuredEvent = activeEvents[0] ?? historyEvents[0] ?? null;
  const totalOfficialKm = historyEvents.reduce(
    (sum, event) => sum + (Number(event.official_distance_km) || 0),
    0,
  );
  const uniqueParticipantCount = new Set(
    participants.map((item) => item.member_external_id),
  ).size;

  const participantIdsByEvent = new Map<string, string[]>();
  for (const participant of participants) {
    const current = participantIdsByEvent.get(participant.event_id);
    if (current) current.push(participant.member_external_id);
    else participantIdsByEvent.set(participant.event_id, [participant.member_external_id]);
  }

  const memberById = new Map(
    members.map((member) => [member.member_external_id, member]),
  );
  const participantsByEvent = new Map<string, Member[]>();
  for (const [eventId, memberIds] of participantIdsByEvent) {
    participantsByEvent.set(
      eventId,
      memberIds
        .map((memberId) => memberById.get(memberId))
        .filter((member): member is Member => Boolean(member)),
    );
  }

  const photosByEvent = new Map<string, GalleryPhoto[]>();
  for (const photo of photos) {
    if (!photo.event_id) continue;
    const current = photosByEvent.get(photo.event_id);
    if (current) current.push(photo);
    else photosByEvent.set(photo.event_id, [photo]);
  }

  const eventById = new Map(events.map((event) => [event.id, event]));
  const galleryPreview = photos.slice(0, 4);

  const joinedEventIds = new Set(
    currentMemberId
      ? participants
          .filter((item) => item.member_external_id === currentMemberId)
          .map((item) => item.event_id)
      : [],
  );
  const currentMemberVoyagerEvents = currentMemberId
    ? events.filter((event) => joinedEventIds.has(event.id))
    : [];
  const completedMemberVoyagers = currentMemberVoyagerEvents.filter(
    (event) => event.status === "completed",
  ).length;
  const featuredJoined = Boolean(
    featuredEvent && currentMemberVoyagerEvents.some((event) => event.id === featuredEvent.id),
  );
  const featuredPhotoCount = featuredEvent
    ? (photosByEvent.get(featuredEvent.id)?.length ?? 0)
    : 0;
  const featuredMemberStatus = !featuredEvent
    ? "Belum ada Voyager"
    : featuredJoined
      ? featuredEvent.status === "completed"
        ? "Selesai"
        : "Tercatat"
      : "Belum tercatat";
  const journalEvents = featuredEvent
    ? visibleEvents.filter((event) => event.id !== featuredEvent.id)
    : visibleEvents;

  return {
    activeEvents,
    historyEvents,
    visibleEvents,
    featuredEvent,
    totalOfficialKm,
    uniqueParticipantCount,
    participantIdsByEvent,
    participantsByEvent,
    photosByEvent,
    eventById,
    galleryPreview,
    currentMemberVoyagerEvents,
    completedMemberVoyagers,
    featuredJoined,
    featuredPhotoCount,
    featuredMemberStatus,
    journalEvents,
  };
}
