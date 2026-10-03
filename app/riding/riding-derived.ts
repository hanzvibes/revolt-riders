import type { MemberProfile, UserRide } from "./riding-model";

export type RidingDerivedState = {
  pendingRides: UserRide[];
  approvedRides: UserRide[];
  totalVerifiedKm: number;
  displayName: string;
  recapYear: number;
  yearApprovedRides: UserRide[];
  yearKm: number;
  longestRideKm: number;
  activeRideMonths: number;
};

export function deriveRidingState({
  rides,
  profile,
  memberExternalId,
  now = new Date(),
}: {
  rides: UserRide[];
  profile: MemberProfile | null;
  memberExternalId?: string | null;
  now?: Date;
}): RidingDerivedState {
  const pendingRides = rides.filter((ride) => ride.status === "pending");
  const approvedRides = rides.filter((ride) => ride.status === "approved");
  const totalVerifiedKm =
    profile?.total_km ??
    approvedRides.reduce((sum, ride) => sum + (ride.distance_km ?? 0), 0);
  const displayName =
    profile?.nickname || profile?.full_name || memberExternalId || "Rider";
  const recapYear = now.getFullYear();
  const yearApprovedRides = approvedRides.filter((ride) => {
    const date = new Date(ride.created_at);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === recapYear;
  });
  const yearKm = yearApprovedRides.reduce(
    (sum, ride) => sum + (ride.distance_km ?? 0),
    0,
  );
  const longestRideKm = yearApprovedRides.reduce(
    (max, ride) => Math.max(max, ride.distance_km ?? 0),
    0,
  );
  const activeRideMonths = new Set(
    yearApprovedRides.map((ride) => {
      const date = new Date(ride.created_at);
      return `${date.getFullYear()}-${date.getMonth() + 1}`;
    }),
  ).size;

  return {
    pendingRides,
    approvedRides,
    totalVerifiedKm,
    displayName,
    recapYear,
    yearApprovedRides,
    yearKm,
    longestRideKm,
    activeRideMonths,
  };
}

export function buildRideRecapText(state: RidingDerivedState) {
  return [
    `REVOLT RIDERS · RIDE RECAP ${state.recapYear}`,
    state.displayName,
    `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(state.yearKm)} KM terverifikasi`,
    `${state.yearApprovedRides.length} ride disetujui`,
    `Longest ride ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(state.longestRideKm)} KM`,
    `${state.activeRideMonths} bulan aktif riding`,
  ].join("\n");
}
