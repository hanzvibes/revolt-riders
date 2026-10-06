import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Attendance, AttendanceSnapshot, Member, Rsvp } from "./attendance-model";
import type { EventRecord } from "@/lib/domain";

export async function loadAttendanceSnapshot(): Promise<AttendanceSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const [eventResult, memberResult, attendanceResult, rsvpResult] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status",
        )
        .in("status", ["published", "completed"])
        .order("start_at", { ascending: false }),
      supabase
        .from("member_profiles")
        .select("member_external_id,full_name,nickname")
        .order("full_name"),
      supabase
        .from("event_attendance")
        .select("id,event_id,member_external_id,checked_in_at,method")
        .order("checked_in_at", { ascending: false }),
      supabase
        .from("event_rsvps")
        .select("event_id,member_external_id,status"),
    ]);

  const failed =
    eventResult.error ||
    memberResult.error ||
    attendanceResult.error ||
    rsvpResult.error;
  if (failed) throw failed;

  return {
    events: (eventResult.data ?? []) as EventRecord[],
    members: (memberResult.data ?? []) as Member[],
    attendance: (attendanceResult.data ?? []) as Attendance[],
    rsvps: (rsvpResult.data ?? []) as Rsvp[],
  };
}

export function subscribeAttendanceWorkspace(onChange: () => void) {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase
    .channel("attendance-admin-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_attendance" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_rsvps" },
      onChange,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
