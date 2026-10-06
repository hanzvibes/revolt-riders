import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { JoinRequest, JoinRequestsSnapshot } from "./join-requests-model";

export const fetchJoinRequestsSnapshot = async (): Promise<JoinRequestsSnapshot> => {
  const supabase = getSupabaseBrowserClient();
  const [requestsResult, profilesResult] = await Promise.all([
    supabase.from("join_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("member_profiles").select("member_external_id"),
  ]);

  if (requestsResult.error) throw requestsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  let maxNum = 27;
  for (const profile of profilesResult.data ?? []) {
    const match = profile.member_external_id?.match(/^RR-(\d+)$/);
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && value > maxNum) maxNum = value;
  }

  return {
    requests: (requestsResult.data ?? []) as JoinRequest[],
    suggestedMemberId: `RR-${String(maxNum + 1).padStart(3, "0")}`,
  };
};
