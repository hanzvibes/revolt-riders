import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type LeaderboardRider = {
  member_external_id: string;
  full_name: string;
  total_km: number;
};

type ProfileRow = {
  member_external_id: string;
  full_name: string;
  nickname?: string | null;
  total_km: number | string | null;
};

export function getLeaderboardDataClient() {
  return getSupabaseBrowserClient();
}

export async function fetchLeaderboardRiders(): Promise<LeaderboardRider[]> {
  const supabase = getLeaderboardDataClient();
  const { data: profiles, error: profileError } = await supabase
    .from("member_profiles")
    .select("member_external_id,full_name,nickname,total_km")
    .order("total_km", { ascending: false });

  if (!profileError && profiles && profiles.length > 0) {
    return (profiles as ProfileRow[]).map((profile) => ({
      member_external_id: profile.member_external_id,
      full_name: profile.nickname
        ? `${profile.nickname} (${profile.full_name})`
        : profile.full_name,
      total_km: Math.round(Number(profile.total_km) || 0),
    }));
  }

  const { data: result, error: fallbackError } = await supabase.rpc(
    "get_riding_leaderboard",
  );
  if (fallbackError) throw profileError || fallbackError;

  return ((result ?? []) as LeaderboardRider[]).map((row) => ({
    ...row,
    total_km: Math.round(Number(row.total_km) || 0),
  }));
}
