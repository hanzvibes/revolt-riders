export type RiderProgressInput = {
  totalKm: number;
  approvedRideCount: number;
  approvedRideDates: string[];
  attendedAgendaCount?: number;
  activeMember?: boolean;
};

export type RiderLevel = {
  level: number;
  title: string;
  minKm: number;
  nextKm: number | null;
};

export type RiderBadge = {
  key: string;
  label: string;
  detail: string;
  unlocked: boolean;
};

const LEVELS = [
  { level: 1, title: "Start Line", minKm: 0 },
  { level: 2, title: "Roadbound", minKm: 500 },
  { level: 3, title: "Mile Chaser", minKm: 1000 },
  { level: 4, title: "Long Haul", minKm: 2500 },
  { level: 5, title: "Iron Mile", minKm: 5000 },
  { level: 6, title: "Road Veteran", minKm: 10000 },
  { level: 7, title: "RR Legend", minKm: 25000 },
] as const;

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

const toJakartaCalendarDate = (date: Date) =>
  new Date(date.getTime() + JAKARTA_OFFSET_MS);

const monthKey = (date: Date) => {
  const jakartaDate = toJakartaCalendarDate(date);
  return `${jakartaDate.getUTCFullYear()}-${String(jakartaDate.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthCursorKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const previousMonth = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));

export function getMonthlyRideStreak(
  approvedRideDates: string[],
  now = new Date(),
): number {
  const rideMonths = new Set(
    approvedRideDates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(monthKey),
  );

  const jakartaNow = toJakartaCalendarDate(now);
  const currentMonth = new Date(
    Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), 1),
  );
  const previous = previousMonth(currentMonth);
  let cursor = rideMonths.has(monthCursorKey(currentMonth)) ? currentMonth : previous;

  if (!rideMonths.has(monthCursorKey(cursor))) return 0;

  let streak = 0;
  while (rideMonths.has(monthCursorKey(cursor))) {
    streak += 1;
    cursor = previousMonth(cursor);
  }
  return streak;
}

export function getRiderProgress(input: RiderProgressInput) {
  const totalKm = Math.max(0, Number(input.totalKm) || 0);
  const approvedRideCount = Math.max(0, Number(input.approvedRideCount) || 0);
  const attendedAgendaCount = Math.max(0, Number(input.attendedAgendaCount) || 0);
  const streakMonths = getMonthlyRideStreak(input.approvedRideDates);

  const currentIndex = Math.max(
    0,
    LEVELS.findLastIndex((item) => totalKm >= item.minKm),
  );
  const current = LEVELS[currentIndex];
  const next = LEVELS[currentIndex + 1] ?? null;
  const span = next ? next.minKm - current.minKm : 0;
  const levelProgress = next
    ? Math.min(100, Math.max(0, ((totalKm - current.minKm) / span) * 100))
    : 100;

  const level: RiderLevel = {
    level: current.level,
    title: current.title,
    minKm: current.minKm,
    nextKm: next?.minKm ?? null,
  };

  const badges: RiderBadge[] = [
    {
      key: "verified",
      label: "Verified",
      detail: "Member resmi aktif",
      unlocked: Boolean(input.activeMember),
    },
    {
      key: "first-ride",
      label: "First Ride",
      detail: "Ride pertama disetujui",
      unlocked: approvedRideCount >= 1,
    },
    {
      key: "road-1k",
      label: "Road 1K",
      detail: "1.000 KM resmi",
      unlocked: totalKm >= 1000,
    },
    {
      key: "five-rides",
      label: "5 Rides",
      detail: "5 ride disetujui",
      unlocked: approvedRideCount >= 5,
    },
    {
      key: "streak-3",
      label: "3M Streak",
      detail: "Riding 3 bulan beruntun",
      unlocked: streakMonths >= 3,
    },
    {
      key: "five-agenda",
      label: "5 Agenda",
      detail: "5 RSVP hadir",
      unlocked: attendedAgendaCount >= 5,
    },
    {
      key: "road-5k",
      label: "Road 5K",
      detail: "5.000 KM resmi",
      unlocked: totalKm >= 5000,
    },
    {
      key: "ten-rides",
      label: "10 Rides",
      detail: "10 ride disetujui",
      unlocked: approvedRideCount >= 10,
    },
    {
      key: "road-10k",
      label: "Road 10K",
      detail: "10.000 KM resmi",
      unlocked: totalKm >= 10000,
    },
    {
      key: "road-25k",
      label: "Road 25K",
      detail: "25.000 KM resmi",
      unlocked: totalKm >= 25000,
    },
  ];

  const lockedBadges = badges.filter((badge) => !badge.unlocked);

  return {
    level,
    levelProgress,
    remainingKm: next ? Math.max(0, next.minKm - totalKm) : 0,
    streakMonths,
    badges,
    unlockedBadges: badges.filter((badge) => badge.unlocked),
    nextBadge: lockedBadges[0] ?? null,
  };
}
