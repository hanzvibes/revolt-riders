import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ManagedAccount,
  PendingRequest,
} from "./admin-overview-data";

export async function approveAdminAccountRequest(
  request: PendingRequest,
) {
  const { error } = await getSupabaseBrowserClient().rpc(
    "approve_member_account_request",
    {
      p_request_id: request.id,
      p_role: "member",
    },
  );

  if (error) throw error;
}

export async function rejectAdminAccountRequest(
  request: PendingRequest,
) {
  const { error } = await getSupabaseBrowserClient().rpc(
    "reject_member_account_request",
    {
      p_request_id: request.id,
    },
  );

  if (error) throw error;
}

export async function changeAdminAccountRole(
  managedAccount: ManagedAccount,
  nextRole: ManagedAccount["role"],
) {
  const { error } = await getSupabaseBrowserClient().rpc(
    "set_member_account_role",
    {
      p_account_id: managedAccount.id,
      p_role: nextRole,
    },
  );

  if (error) throw error;
}
