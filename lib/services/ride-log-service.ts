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

  if (rpcError) throw rpcError;

  if (!(rpcData as { success?: boolean })?.success) {
    throw new Error("Mutation ride log tidak berhasil diproses.");
  }

  return {
    success: true,
    totalKm: (rpcData as { total_km?: number }).total_km,
  };
}

export async function deleteRideLog(
  rideId: string,
  memberExternalId: string,
): Promise<{ success: boolean; totalKm?: number }> {
  const supabase = getSupabaseBrowserClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "manage_ride_log",
    {
      p_action: "delete",
      p_ride_id: rideId,
      p_member_external_id: memberExternalId,
    },
  );

  if (rpcError) throw rpcError;

  if (!(rpcData as { success?: boolean })?.success) {
    throw new Error("Penghapusan ride log tidak berhasil diproses.");
  }

  return {
    success: true,
    totalKm: (rpcData as { total_km?: number }).total_km,
  };
}