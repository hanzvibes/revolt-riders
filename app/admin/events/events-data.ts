import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminEventsSnapshot, ManagedEvent, Member, Participant, Rsvp } from "./events-model";

export const fetchAdminEventsSnapshot = async (): Promise<AdminEventsSnapshot> => {
  const supabase = getSupabaseBrowserClient();
  const [eventResult, rsvpResult, memberResult, participantResult] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id,title,type,description,location_name,location_url,start_at,meetup_at,end_at,status,is_public,cancellation_reason,counts_as_mandatory,official_distance_km,official_support,activity_summary",
      )
      .order("start_at", { ascending: false }),
    supabase.from("event_rsvps").select("event_id,status"),
    supabase
      .from("member_profiles")
      .select("member_external_id,full_name,nickname,city")
      .order("full_name", { ascending: true }),
    supabase.from("event_participants").select("event_id,member_external_id"),
  ]);

  const failed =
    eventResult.error ||
    rsvpResult.error ||
    memberResult.error ||
    participantResult.error;
  if (failed) throw failed;

  return {
    events: ((eventResult.data ?? []) as ManagedEvent[]).map((item) => ({
      ...item,
      official_distance_km:
        item.official_distance_km === null
          ? null
          : Number(item.official_distance_km),
    })),
    rsvps: (rsvpResult.data ?? []) as Rsvp[],
    members: (memberResult.data ?? []) as Member[],
    participants: (participantResult.data ?? []) as Participant[],
  };
};

export const subscribeAdminEvents = (onChange: () => void) => {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase
    .channel("admin-events-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "events" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_rsvps" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_participants" },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};
