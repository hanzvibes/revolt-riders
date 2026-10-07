export type LeaderboardRiderLike = {
  member_external_id: string;
  full_name: string;
  total_km: number;
};

export function filterLeaderboardRiders<T extends LeaderboardRiderLike>(
  riders: readonly T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...riders];
  return riders.filter(
    (rider) =>
      rider.full_name.toLowerCase().includes(normalized) ||
      rider.member_external_id.toLowerCase().includes(normalized),
  );
}

export function buildLeaderboardRankMap<T extends LeaderboardRiderLike>(
  riders: readonly T[],
) {
  const ranks = new Map<string, number>();
  riders.forEach((rider, index) => ranks.set(rider.member_external_id, index + 1));
  return ranks;
}

export function getLeaderboardInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getLeaderboardTopStack<T>(
  top: readonly T[],
  activeIndex: number,
) {
  return top.map((rider, index) => ({
    rider,
    rank: index + 1,
    layer: (index - activeIndex + top.length) % top.length,
  }));
}
