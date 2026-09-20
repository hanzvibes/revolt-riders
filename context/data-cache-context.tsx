/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AppRole =
  | "member"
  | "road_captain"
  | "treasurer"
  | "admin"
  | "superadmin";
export type AccountStatus = "pending" | "active" | "inactive";
export type MemberAccess = {
  member_external_id: string;
  role: AppRole;
  status: AccountStatus;
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
};

type DataCacheContextType = {
  user: User | null;
  account: MemberAccess | null;
  loading: boolean;
  error: string;
  refreshAccess: () => Promise<void>;
  getCached: <T>(key: string) => T | undefined;
  setCached: <T>(key: string, data: T, ttlMs?: number) => void;
  invalidateCache: (keyPrefix?: string) => void;
  fetchWithCache: <T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttlMs?: number; forceRefresh?: boolean },
  ) => Promise<T>;
};

const DataCacheContext = createContext<DataCacheContextType | null>(null);

const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<MemberAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cacheRef = useRef<Map<string, CacheEntry<unknown>>>(new Map());
  const inFlightRef = useRef<Map<string, Promise<unknown>>>(new Map());
  const userIdRef = useRef<string | null>(null);

  const refreshAccess = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const nextUser = userData.user;

      if (nextUser && userIdRef.current && userIdRef.current !== nextUser.id) {
        cacheRef.current.clear();
        inFlightRef.current.clear();
      }
      userIdRef.current = nextUser?.id ?? null;
      setUser(nextUser);

      if (userError || !nextUser) {
        cacheRef.current.clear();
        inFlightRef.current.clear();
        setAccount(null);
        if (userError && !userError.message.includes("Auth session missing")) {
          setError("Sesi akun belum dapat diperiksa.");
        } else {
          setError("");
        }
        setLoading(false);
        return;
      }

      const { data, error: accountError } = await supabase
        .from("member_accounts")
        .select("member_external_id,role,status")
        .eq("user_id", nextUser.id)
        .maybeSingle();

      setAccount((data as MemberAccess | null) ?? null);
      if (accountError) {
        setError("Status akun member belum dapat dimuat.");
      } else {
        setError("");
      }
    } catch {
      setError("Gagal memeriksa sesi pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccess();

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!session) {
          userIdRef.current = null;
          setUser(null);
          setAccount(null);
          setLoading(false);
          cacheRef.current.clear();
          inFlightRef.current.clear();
          return;
        }
        window.setTimeout(() => void refreshAccess(), 0);
      },
    );

    const onFocus = () => {
      // Background revalidation without resetting loading spinner
      if (document.visibilityState === "visible") {
        void refreshAccess();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshAccess]);

  const getCached = useCallback(<T,>(key: string): T | undefined => {
    const entry = cacheRef.current.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp >= entry.ttl) {
      cacheRef.current.delete(key);
      return undefined;
    }
    return entry.data;
  }, []);

  const setCached = useCallback(
    <T,>(key: string, data: T, ttlMs = DEFAULT_TTL_MS) => {
      cacheRef.current.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      });
    },
    [],
  );

  const invalidateCache = useCallback((keyPrefix?: string) => {
    if (!keyPrefix) {
      cacheRef.current.clear();
      return;
    }
    for (const key of cacheRef.current.keys()) {
      if (key.startsWith(keyPrefix)) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  const fetchWithCache = useCallback(
    async <T,>(
      key: string,
      fetcher: () => Promise<T>,
      options?: { ttlMs?: number; forceRefresh?: boolean },
    ): Promise<T> => {
      const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
      const forceRefresh = options?.forceRefresh ?? false;

      if (!forceRefresh) {
        const cached = cacheRef.current.get(key) as CacheEntry<T> | undefined;
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          return cached.data;
        }
        if (cached) cacheRef.current.delete(key);
      }

      // Check if there is already an in-flight request for this key to deduplicate
      const inFlight = inFlightRef.current.get(key) as Promise<T> | undefined;
      if (inFlight) {
        return inFlight;
      }

      const promise = (async () => {
        try {
          const freshData = await fetcher();
          cacheRef.current.set(key, {
            data: freshData,
            timestamp: Date.now(),
            ttl: ttlMs,
          });
          return freshData;
        } finally {
          inFlightRef.current.delete(key);
        }
      })();

      inFlightRef.current.set(key, promise);
      return promise;
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      account,
      loading,
      error,
      refreshAccess,
      getCached,
      setCached,
      invalidateCache,
      fetchWithCache,
    }),
    [
      account,
      error,
      fetchWithCache,
      getCached,
      invalidateCache,
      loading,
      refreshAccess,
      setCached,
      user,
    ],
  );

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error("useDataCache must be used within a DataCacheProvider");
  }
  return context;
}
