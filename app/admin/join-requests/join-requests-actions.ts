import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const acceptJoinRequest = async (requestId: string) => {
  const { error } = await getSupabaseBrowserClient().rpc("accept_join_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
};

export const rejectJoinRequest = async (requestId: string, reason: string) => {
  const { error } = await getSupabaseBrowserClient().rpc("reject_join_request", {
    p_request_id: requestId,
    p_reason: reason.trim() || null,
  });
  if (error) throw error;
};

export const activateJoinRequest = async (requestId: string, memberId: string) => {
  const { error } = await getSupabaseBrowserClient().rpc("activate_join_request", {
    p_request_id: requestId,
    p_member_id: memberId,
  });
  if (error) throw error;
};
