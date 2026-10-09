import type { EventRecord } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AdminAccount = {
  role: string;
  status: "pending" | "active" | "inactive";
};

export type AdminEventRecord = EventRecord & {
  counts_as_mandatory: boolean;
  official_distance_km: number | null;
};

export type PendingRequest = {
  id: string;
  user_id: string;
  member_external_id: string;
  email: string | null;
};

export type AdminMember = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
};

export type AdminInvitation = {
  event_id: string;
  member_external_id: string;
};

export type AdminRsvp = {
  event_id: string;
  member_external_id: string;
  status: "attending" | "declined" | "maybe";
  guest_count: number;
  responded_at: string;
};

export type BulkLink = {
  memberId: string;
  name: string;
  url: string;
};

export type ManagedAccount = {
  id: string;
  member_external_id: string;
  role:
    | "member"
    | "road_captain"
    | "treasurer"
    | "admin"
    | "superadmin";
  status: string;
};

export type AdminOverviewSnapshot = {
  events: AdminEventRecord[];
  requests: PendingRequest[];
  members: AdminMember[];
  invitations: AdminInvitation[];
  rsvps: AdminRsvp[];
  managedAccounts: ManagedAccount[];
};

export const ADMIN_ROLES: ManagedAccount["role"][] = [
  "member",
  "road_captain",
  "treasurer",
  "admin",
  "superadmin",
];

export async function fetchAdminOverviewSnapshot(
  isSuperadmin: boolean,
): Promise<AdminOverviewSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const [
    eventResult,
    requestResult,
    memberResult,
    invitationResult,
    rsvpResult,
    managedAccountResult,
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status,counts_as_mandatory,official_distance_km",
      )
      .order("start_at", { ascending: false }),
    supabase
      .from("member_account_requests")
      .select("id,user_id,member_external_id,email")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("member_profiles")
      .select("member_external_id,full_name,nickname")
      .order("full_name"),
    supabase
      .from("event_invitations")
      .select("event_id,member_external_id"),
    supabase
      .from("event_rsvps")
      .select(
        "event_id,member_external_id,status,guest_count,responded_at",
      ),
    isSuperadmin
      ? supabase
          .from("member_accounts")
          .select("id,member_external_id,role,status")
          .order("member_external_id")
      : Promise.resolve({ data: [] }),
  ]);

  return {
    events: ((eventResult.data ?? []) as AdminEventRecord[]).map(
      (event) => ({
        ...event,
        official_distance_km:
          event.official_distance_km === null
            ? null
            : Number(event.official_distance_km),
      }),
    ),
    requests:
      (requestResult.data ?? []) as PendingRequest[],
    members: (memberResult.data ?? []) as AdminMember[],
    invitations:
      (invitationResult.data ?? []) as AdminInvitation[],
    rsvps: (rsvpResult.data ?? []) as AdminRsvp[],
    managedAccounts:
      (managedAccountResult.data ?? []) as ManagedAccount[],
  };
}
