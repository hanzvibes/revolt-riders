import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MemberAccount, MemberForm } from "./member-admin-model";

type AccountAccessUpdate = {
  linkedAccount: MemberAccount;
  accountStatus: "active" | "inactive";
  accountRole: string;
  canManageRole: boolean;
};

export const upsertMemberProfile = async (form: MemberForm) => {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("upsert_member_profile", {
    p_member_external_id: form.memberId.trim().toUpperCase(),
    p_full_name: form.fullName.trim(),
    p_nickname: form.nickname.trim() || null,
    p_city: form.city.trim() || null,
    p_join_date: form.joinDate || null,
    p_club_role: form.clubRole.trim() || null,
    p_total_km: Number(form.totalKm || 0),
    p_motorcycle: form.motorcycle.trim() || null,
  });

  return error;
};

export const syncMemberAccountAccess = async ({
  linkedAccount,
  accountStatus,
  accountRole,
  canManageRole,
}: AccountAccessUpdate) => {
  const supabase = getSupabaseBrowserClient();

  if (accountStatus !== linkedAccount.status) {
    await supabase.rpc("set_member_account_status", {
      p_account_id: linkedAccount.id,
      p_status: accountStatus,
    });
  }

  if (canManageRole && accountRole !== linkedAccount.role) {
    await supabase.rpc("set_member_account_role", {
      p_account_id: linkedAccount.id,
      p_role: accountRole,
    });
  }
};

export const resetMemberAccountPassword = async (
  memberExternalId: string,
  password: string,
) => {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.functions.invoke(
    "admin-reset-member-password",
    {
      body: {
        memberExternalId,
        password,
      },
    },
  );

  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
};
