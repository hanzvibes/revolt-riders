"use client";

import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Rider } from "./leaderboard-screen-model";

export function useLeaderboardScreen() {

  const { user, account, loading: authLoading, fetchWithCache, invalidateCache } = useDataCache();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [query, setQuery] = useState("");
  const [activeTopIndex, setActiveTopIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    if (authLoading) return;

    try {
      setLoading(true);
      const data = await fetchWithCache<Rider[]>(
        "riding_leaderboard_data",
        async () => {
          const supabase = getSupabaseBrowserClient();
          type ProfileRow = {
            member_external_id: string;
            full_name: string;
            nickname?: string | null;
            total_km: number | string | null;
          };
          const { data: profiles, error: profErr } = await supabase
            .from("member_profiles")
            .select("member_external_id,full_name,nickname,total_km")
            .order("total_km", { ascending: false });
          if (!profErr && profiles && profiles.length > 0) {
            return (profiles as ProfileRow[]).map((p: ProfileRow) => ({
              member_external_id: p.member_external_id,
              full_name: p.nickname ? `${p.nickname} (${p.full_name})` : p.full_name,
              total_km: Math.round(Number(p.total_km) || 0),
            }));
          }

          // Fallback to RPC get_riding_leaderboard
          const { data: result, error: fetchErr } =
            await supabase.rpc("get_riding_leaderboard");
          if (fetchErr) throw profErr || fetchErr;
          return ((result ?? []) as Rider[]).map((row: Rider) => ({
            ...row,
            total_km: Math.round(Number(row.total_km) || 0),
          }));
        },
        { ttlMs: 2 * 60 * 1000 },
      );

      setRiders(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Leaderboard belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, fetchWithCache]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const maxKm = useMemo(() => {
    return riders[0]?.total_km > 0 ? riders[0].total_km : 1;
  }, [riders]);

  const totalKmSum = useMemo(() => {
    return riders.reduce((acc, r) => acc + (r.total_km || 0), 0);
  }, [riders]);

  const myIndex = useMemo(() => {
    if (!account?.member_external_id) return -1;
    return riders.findIndex(
      (r) => r.member_external_id === account.member_external_id,
    );
  }, [riders, account]);

  const myRank = myIndex >= 0 ? myIndex + 1 : null;
  const myRider = myIndex >= 0 ? riders[myIndex] : null;
  const kmToNext =
    myIndex > 0 ? riders[myIndex - 1].total_km - (myRider?.total_km ?? 0) : 0;

  const rankByMemberId = useMemo(() => {
    const ranks = new Map<string, number>();
    riders.forEach((rider, index) => {
      ranks.set(rider.member_external_id, index + 1);
    });
    return ranks;
  }, [riders]);

  const filteredRiders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.member_external_id.toLowerCase().includes(q),
    );
  }, [riders, query]);

  const top3 = useMemo(() => {
    return riders.slice(0, 3);
  }, [riders]);

  useEffect(() => {
    if (top3.length > 0 && activeTopIndex >= top3.length) {
      setActiveTopIndex(0);
    }
  }, [activeTopIndex, top3.length]);

  const rotateTopStack = useCallback(
    (direction: 1 | -1) => {
      if (top3.length < 2) return;
      setActiveTopIndex((current) =>
        (current + direction + top3.length) % top3.length,
      );
    },
    [top3.length],
  );

  const top3Stack = useMemo(
    () =>
      top3.map((rider, index) => ({
        rider,
        rank: index + 1,
        layer: (index - activeTopIndex + top3.length) % top3.length,
      })),
    [activeTopIndex, top3],
  );

  const remainingRiders = useMemo(() => {
    if (query.trim()) {
      return filteredRiders;
    }
    return riders.slice(3);
  }, [query, filteredRiders, riders]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };


  return { user, account, authLoading, invalidateCache, riders, query, setQuery, activeTopIndex, setActiveTopIndex, reduceMotion, loading, error, loadLeaderboard, maxKm, totalKmSum, myRank, myRider, kmToNext, rankByMemberId, top3, rotateTopStack, top3Stack, remainingRiders, getInitials };

}
