"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export type AppRole = "member" | "road_captain" | "treasurer" | "admin" | "superadmin";
export type AccountStatus = "pending" | "active" | "inactive";
export type MemberAccess = { member_external_id: string; role: AppRole; status: AccountStatus };

export function useMemberAccess() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<MemberAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setLoading(true);
    setError("");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const nextUser = userData.user;
    setUser(nextUser);
    if (userError || !nextUser) {
      setAccount(null);
      if (userError) setError("Sesi akun belum dapat diperiksa.");
      setLoading(false);
      return;
    }
    const { data, error: accountError } = await supabase.from("member_accounts")
      .select("member_external_id,role,status").eq("user_id", nextUser.id).maybeSingle();
    setAccount((data as MemberAccess | null) ?? null);
    if (accountError) setError("Status akun member belum dapat dimuat.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        setUser(null); setAccount(null); setLoading(false);
        return;
      }
      window.setTimeout(() => void refresh(), 0);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return { user, account, loading, error, refresh };
}
