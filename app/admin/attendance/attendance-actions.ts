import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ManualAttendanceInput = {
  eventId: string;
  memberExternalId: string;
  checkedInBy: string;
};

export async function createManualAttendance({
  eventId,
  memberExternalId,
  checkedInBy,
}: ManualAttendanceInput) {
  const supabase = getSupabaseBrowserClient();
  const { error: insertError } = await supabase.from("event_attendance").insert({
    event_id: eventId,
    member_external_id: memberExternalId,
    method: "manual",
    checked_in_by: checkedInBy,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("Member ini sudah tercatat hadir pada agenda yang dipilih.");
    }
    throw insertError;
  }
}
