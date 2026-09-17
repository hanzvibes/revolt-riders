"use client";

import {
  useDataCache,
  type AccountStatus,
  type AppRole,
  type MemberAccess,
} from "@/context/data-cache-context";

export type { AccountStatus, AppRole, MemberAccess };

export function useMemberAccess() {
  const cache = useDataCache();
  return {
    user: cache.user,
    account: cache.account,
    loading: cache.loading,
    error: cache.error,
    refresh: cache.refreshAccess,
  };
}

