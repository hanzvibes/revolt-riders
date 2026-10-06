import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Account,
  Attendance,
  Audit,
  Cash,
  InsightsSnapshot,
  Invitation,
  MemberProfile,
  Ride,
  Rsvp,
} from "./insights-model";

export async function fetchAdminInsightsSnapshot(): Promise<InsightsSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const results = await Promise.all([
    supabase.from("member_accounts").select("user_id,member_external_id,status"),
    supabase.from("member_profiles").select("member_external_id,full_name,nickname"),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("event_invitations").select("event_id,member_external_id"),
    supabase.from("event_rsvps").select("event_id,member_external_id,status"),
    supabase.from("event_attendance").select("event_id,member_external_id"),
    supabase.from("ride_logs").select("distance_km").eq("status", "approved"),
    supabase.from("cash_transactions").select("transaction_type,amount"),
    supabase
      .from("club_cash_transactions")
      .select("transaction_type,amount")
      .is("voided_at", null),
    supabase
      .from("audit_logs")
      .select("id,actor_id,action,entity_type,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const failed = results.find((result) => result.error)?.error;
  if (failed) throw failed;

  return {
    accounts: (results[0].data ?? []) as Account[],
    profiles: (results[1].data ?? []) as MemberProfile[],
    publishedEvents: results[2].count ?? 0,
    invitations: (results[3].data ?? []) as Invitation[],
    rsvps: (results[4].data ?? []) as Rsvp[],
    attendance: (results[5].data ?? []) as Attendance[],
    rides: (results[6].data ?? []) as Ride[],
    cash: [...(results[7].data ?? []), ...(results[8].data ?? [])] as Cash[],
    audits: (results[9].data ?? []) as Audit[],
  };
}
