import type { LeaderboardRider } from "./leaderboard-data";

export type LeaderboardTopStackItem = {
  rider: LeaderboardRider;
  rank: number;
  layer: number;
};

export function getLeaderboardInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function deriveLeaderboard({
  riders,
  query,
  memberExternalId,
  activeTopIndex,
}: {
  riders: LeaderboardRider[];
  query: string;
  memberExternalId?: string | null;
  activeTopIndex: number;
}) {
  const maxKm = riders[0]?.total_km > 0 ? riders[0].total_km : 1;
  const totalKmSum = riders.reduce(
    (total, rider) => total + (rider.total_km || 0),
    0,
  );

  const myIndex = memberExternalId
    ? riders.findIndex(
        (rider) => rider.member_external_id === memberExternalId,
      )
    : -1;
  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myRider = myIndex >= 0 ? riders[myIndex] : null;
  const kmToNext =
    myIndex > 0
      ? riders[myIndex - 1].total_km - (myRider?.total_km ?? 0)
      : 0;

  const rankByMemberId = new Map<string, number>();
  riders.forEach((rider, index) => {
    rankByMemberId.set(rider.member_external_id, index + 1);
  });

  const normalizedQuery = query.trim().toLowerCase();
  const filteredRiders = normalizedQuery
    ? riders.filter(
        (rider) =>
          rider.full_name.toLowerCase().includes(normalizedQuery) ||
          rider.member_external_id.toLowerCase().includes(normalizedQuery),
      )
    : riders;

  const top3 = riders.slice(0, 3);
  const safeTopIndex =
    top3.length > 0 ? activeTopIndex % top3.length : 0;
  const top3Stack: LeaderboardTopStackItem[] = top3.map(
    (rider, index) => ({
      rider,
      rank: index + 1,
      layer: (index - safeTopIndex + top3.length) % top3.length,
    }),
  );

  return {
    maxKm,
    totalKmSum,
    myRank,
    myRider,
    kmToNext,
    rankByMemberId,
    top3,
    safeTopIndex,
    top3Stack,
    remainingRiders: normalizedQuery ? filteredRiders : riders.slice(3),
  };
}
