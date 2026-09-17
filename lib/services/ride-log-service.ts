import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type RideLogMutationInput = {
  id?: string;
  memberExternalId: string;
  title: string;
  km: number;
  date?: string;
};

export async function saveRideLog(
  input: RideLogMutationInput,
): Promise<{ success: boolean; totalKm?: number }> {
  const supabase = getSupabaseBrowserClient();
  const isUpdate = Boolean(input.id);
  const cleanTitle = input.title.trim() || "Touring Mandiri";
  const cleanKm = Math.max(0, Number(input.km) || 0);
  const cleanDate = input.date
    ? new Date(input.date).toISOString()
    : new Date().toISOString();

  // Try RPC manage_ride_log first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "manage_ride_log",
      {
        p_action: isUpdate ? "update" : "create",
        p_ride_id: input.id || null,
        p_member_external_id: input.memberExternalId,
        p_title: cleanTitle,
        p_km: cleanKm,
        p_date: cleanDate,
      },
    );

    if (!rpcError && (rpcData as { success?: boolean })?.success) {
      return { success: true, totalKm: (rpcData as { total_km?: number }).total_km };
    }
    if (rpcError && !rpcError.message.includes("Could not find the function")) {
      throw rpcError;
    }
  } catch (err) {
    console.warn("RPC manage_ride_log error, fallback to direct mutation:", err);
  }

  // Fallback to direct table mutation
  if (isUpdate && input.id) {
    const { error: updateError } = await supabase
      .from("ride_logs")
      .update({
        title: cleanTitle,
        odometer_start: 0,
        odometer_end: cleanKm,
        created_at: cleanDate,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await supabase.from("ride_logs").insert({
      member_external_id: input.memberExternalId,
      title: cleanTitle,
      odometer_start: 0,
      odometer_end: cleanKm,
      status: "approved",
      created_at: cleanDate,
      reviewed_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;
  }

  // Recalculate member total_km
  const { data: allRides } = await supabase
    .from("ride_logs")
    .select("distance_km")
    .eq("member_external_id", input.memberExternalId)
    .eq("status", "approved");

  const newTotalKm = (
    (allRides ?? []) as { distance_km: number | string | null }[]
  ).reduce((acc: number, r) => acc + (Number(r.distance_km) || 0), 0);

  await supabase
    .from("member_profiles")
    .update({ total_km: newTotalKm, updated_at: new Date().toISOString() })
    .eq("member_external_id", input.memberExternalId);

  return { success: true, totalKm: newTotalKm };
}

export async function deleteRideLog(
  rideId: string,
  memberExternalId: string,
): Promise<{ success: boolean; totalKm?: number }> {
  const supabase = getSupabaseBrowserClient();

  // Try RPC manage_ride_log first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "manage_ride_log",
      {
        p_action: "delete",
        p_ride_id: rideId,
        p_member_external_id: memberExternalId,
      },
    );

    if (!rpcError && (rpcData as { success?: boolean })?.success) {
      return { success: true, totalKm: (rpcData as { total_km?: number }).total_km };
    }
    if (rpcError && !rpcError.message.includes("Could not find the function")) {
      throw rpcError;
    }
  } catch (err) {
    console.warn("RPC manage_ride_log delete error, fallback to direct delete:", err);
  }

  // Fallback to direct delete
  const { error: delError } = await supabase
    .from("ride_logs")
    .delete()
    .eq("id", rideId);

  if (delError) throw delError;

  // Recalculate member total_km
  const { data: allRides } = await supabase
    .from("ride_logs")
    .select("distance_km")
    .eq("member_external_id", memberExternalId)
    .eq("status", "approved");

  const newTotalKm = (
    (allRides ?? []) as { distance_km: number | string | null }[]
  ).reduce((acc: number, r) => acc + (Number(r.distance_km) || 0), 0);

  await supabase
    .from("member_profiles")
    .update({ total_km: newTotalKm, updated_at: new Date().toISOString() })
    .eq("member_external_id", memberExternalId);

  return { success: true, totalKm: newTotalKm };
}
