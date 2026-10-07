"use client";

import { useDataCache } from "@/context/data-cache-context";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchLeaderboardRiders,
  type LeaderboardRider,
} from "./leaderboard-data";
import { deriveLeaderboard } from "./leaderboard-model";

export function useLeaderboardController() {
  const {
    user,
    account,
    loading: authLoading,
    fetchWithCache,
    invalidateCache,
  } = useDataCache();

  const [riders, setRiders] = useState<LeaderboardRider[]>([]);
  const [query, setQuery] = useState("");
  const [activeTopIndex, setActiveTopIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(
    async (forceRefresh = false) => {
      if (authLoading) return;

      try {
        setLoading(true);
        const data = await fetchWithCache<LeaderboardRider[]>(
          "riding_leaderboard_data",
          fetchLeaderboardRiders,
          {
            ttlMs: 2 * 60 * 1000,
            forceRefresh,
          },
        );

        setRiders(data);
        setError("");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Leaderboard belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [authLoading, fetchWithCache],
  );

  useEffect(() => {
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      void loadLeaderboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authLoading, loadLeaderboard]);

  const derived = useMemo(
    () =>
      deriveLeaderboard({
        riders,
        query,
        memberExternalId: account?.member_external_id,
        activeTopIndex,
      }),
    [
      account?.member_external_id,
      activeTopIndex,
      query,
      riders,
    ],
  );

  const rotateTopStack = useCallback(
    (direction: 1 | -1) => {
      if (derived.top3.length < 2) return;
      setActiveTopIndex(
        (current) =>
          (current + direction + derived.top3.length) %
          derived.top3.length,
      );
    },
    [derived.top3.length],
  );

  const refreshLeaderboard = useCallback(() => {
    invalidateCache("riding_leaderboard_data");
    invalidateCache("member_profiles_list");
    void loadLeaderboard(true);
  }, [invalidateCache, loadLeaderboard]);

  return {
    user,
    account,
    authLoading,
    riders,
    query,
    activeTopIndex: derived.safeTopIndex,
    loading,
    error,
    ...derived,
    setQuery,
    setActiveTopIndex,
    rotateTopStack,
    refreshLeaderboard,
  };
}
