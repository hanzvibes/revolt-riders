export type Account = {
  user_id: string;
  member_external_id: string;
  status: string;
};

export type MemberProfile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
};

export type Invitation = {
  event_id: string;
  member_external_id: string;
};

export type Rsvp = {
  event_id: string;
  member_external_id: string;
  status: string;
};

export type Attendance = {
  event_id: string;
  member_external_id: string;
};

export type Ride = {
  distance_km: number | string | null;
};

export type Cash = {
  transaction_type: "income" | "expense" | "advance";
  amount: number | string;
};

export type Audit = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export type InsightsSnapshot = {
  accounts: Account[];
  profiles: MemberProfile[];
  publishedEvents: number;
  invitations: Invitation[];
  rsvps: Rsvp[];
  attendance: Attendance[];
  rides: Ride[];
  cash: Cash[];
  audits: Audit[];
};

export type InsightsAnalytics = {
  activeMembers: number;
  publishedEvents: number;
  responseRate: number;
  attendanceRate: number;
  totalKm: number;
  balance: number;
};

const memberEventKey = (row: {
  event_id: string;
  member_external_id: string;
}) => `${row.event_id}:${row.member_external_id}`;

const percentage = (numerator: number, denominator: number) => {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
};

export function calculateInsights(snapshot: InsightsSnapshot): InsightsAnalytics {
  const invitationKeys = new Set(snapshot.invitations.map(memberEventKey));
  const responseKeys = new Set(snapshot.rsvps.map(memberEventKey));
  const matchingResponses = [...invitationKeys].filter((key) => responseKeys.has(key)).length;

  const attendingKeys = new Set(
    snapshot.rsvps
      .filter((row) => row.status === "attending")
      .map(memberEventKey),
  );
  const attendanceKeys = new Set(snapshot.attendance.map(memberEventKey));
  const checkedInAttending = [...attendingKeys].filter((key) =>
    attendanceKeys.has(key),
  ).length;

  const totalKm = snapshot.rides.reduce(
    (total, row) => total + Number(row.distance_km ?? 0),
    0,
  );
  const income = snapshot.cash
    .filter((row) => row.transaction_type === "income")
    .reduce((total, row) => total + Number(row.amount), 0);
  const expense = snapshot.cash
    .filter((row) => row.transaction_type === "expense")
    .reduce((total, row) => total + Number(row.amount), 0);

  return {
    activeMembers: snapshot.accounts.filter((row) => row.status === "active").length,
    publishedEvents: snapshot.publishedEvents,
    responseRate: percentage(matchingResponses, invitationKeys.size),
    attendanceRate: percentage(checkedInAttending, attendingKeys.size),
    totalKm,
    balance: income - expense,
  };
}
