import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Detail,
  Member,
  MemberAccount,
  MemberAdminSnapshot,
} from "./member-admin-model";

export const fetchMemberAdminSnapshot = async (): Promise<MemberAdminSnapshot> => {
  const supabase = getSupabaseBrowserClient();
  const [memberResult, detailResult, accountListResult] = await Promise.all([
    supabase
      .from("member_profiles")
      .select(
        "member_external_id,full_name,nickname,city,join_date,club_role,total_km",
      )
      .order("member_external_id"),
    supabase
      .from("member_details")
      .select(
        "member_external_id,nickname_override,motorcycle,city_override",
      ),
    supabase
      .from("member_accounts")
      .select("id,member_external_id,role,status")
      .order("member_external_id"),
  ]);

  const failed =
    memberResult.error || detailResult.error || accountListResult.error;
  if (failed) throw failed;

  return {
    members: ((memberResult.data ?? []) as Member[]).map((member) => ({
      ...member,
      total_km: Number(member.total_km),
    })),
    details: (detailResult.data ?? []) as Detail[],
    accounts: (accountListResult.data ?? []) as MemberAccount[],
  };
};
