import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MotorcycleForm } from "./garage-model";

export async function saveMotorcycleRecord(
  form: MotorcycleForm,
) {
  const { error } = await getSupabaseBrowserClient().rpc(
    "save_member_motorcycle",
    {
      p_id: form.id,
      p_nickname: form.nickname.trim() || null,
      p_brand: form.brand.trim(),
      p_model: form.model.trim(),
      p_production_year: form.productionYear
        ? Number(form.productionYear)
        : null,
      p_style: form.style.trim() || null,
      p_engine_cc: form.engineCc
        ? Number(form.engineCc)
        : null,
      p_color: form.color.trim() || null,
      p_notes: form.notes.trim() || null,
      p_is_primary: form.isPrimary,
      p_is_visible_to_members: form.isVisibleToMembers,
    },
  );

  if (error) throw error;
}

export async function deleteMotorcycleRecord(
  motorcycleId: string,
) {
  const { error } = await getSupabaseBrowserClient().rpc(
    "delete_member_motorcycle",
    { p_id: motorcycleId },
  );

  if (error) throw error;
}
