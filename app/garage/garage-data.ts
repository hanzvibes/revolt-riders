import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type Motorcycle = {
  id: string;
  member_external_id: string;
  nickname: string | null;
  brand: string;
  model: string;
  production_year: number | null;
  style: string | null;
  engine_cc: number | null;
  color: string | null;
  notes: string | null;
  is_primary: boolean;
  is_visible_to_members: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchMotorcycles(
  memberExternalId: string,
): Promise<Motorcycle[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("member_motorcycles")
    .select(
      "id,member_external_id,nickname,brand,model,production_year,style,engine_cc,color,notes,is_primary,is_visible_to_members,created_at,updated_at",
    )
    .eq("member_external_id", memberExternalId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Motorcycle[];
}
