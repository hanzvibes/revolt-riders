export type AdminInvitationLike = {
  event_id: string;
  member_external_id: string;
};

export type AdminRsvpLike = {
  event_id: string;
  member_external_id: string;
  status: string;
  guest_count: number | null;
  responded_at: string;
};

export function slugifyAdminValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function calculateAdminEventStats<
  TInvitation extends AdminInvitationLike,
  TRsvp extends AdminRsvpLike,
  TMember,
>(
  eventId: string,
  invitations: readonly TInvitation[],
  rsvps: readonly TRsvp[],
  memberById: ReadonlyMap<string, TMember>,
) {
  const invited = invitations.filter((row) => row.event_id === eventId);
  const answers = rsvps.filter((row) => row.event_id === eventId);
  const responseByMember = new Map(
    answers.map((row) => [row.member_external_id, row]),
  );
  const attending = answers.filter((row) => row.status === "attending");

  return {
    invited: invited.length,
    attending: attending.length,
    declined: answers.filter((row) => row.status === "declined").length,
    maybe: answers.filter((row) => row.status === "maybe").length,
    noResponse: Math.max(invited.length - responseByMember.size, 0),
    guests: attending.reduce(
      (total, row) => total + Math.max(row.guest_count || 0, 0),
      0,
    ),
    responseRate: invited.length
      ? Math.round((responseByMember.size / invited.length) * 100)
      : 0,
    attendees: answers
      .slice()
      .sort((a, b) => b.responded_at.localeCompare(a.responded_at))
      .map((rsvp) => ({
        rsvp,
        member: memberById.get(rsvp.member_external_id),
      })),
  };
}
