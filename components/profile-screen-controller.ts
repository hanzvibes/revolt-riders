"use client";

import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  EMPTY_PROFILE_SNAPSHOT,
  fetchProfileSnapshot,
  type ProfileSnapshot,
} from "./profile-data";

export function useProfileScreenController() {
  const router = useRouter();
  const {
    user,
    account,
    loading: accessLoading,
  } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();

  const [snapshot, setSnapshot] = useState<ProfileSnapshot>(
    EMPTY_PROFILE_SNAPSHOT,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nickname, setNickname] = useState("");
  const [motorcycle, setMotorcycle] = useState("");
  const [city, setCity] = useState("");
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (accessLoading) return;

      if (!user) {
        setSnapshot(EMPTY_PROFILE_SNAPSHOT);
        setLoading(false);
        return;
      }

      if (!account) {
        setLoading(false);
        return;
      }

      if (!forceRefresh) setLoading(true);
      setError("");

      try {
        const nextSnapshot = await fetchWithCache<ProfileSnapshot>(
          "profile:" + account.member_external_id,
          () => fetchProfileSnapshot(account.member_external_id),
          { ttlMs: 60_000, forceRefresh },
        );

        setSnapshot(nextSnapshot);
        setNickname(
          nextSnapshot.detail?.nickname_override ||
            nextSnapshot.profile?.nickname ||
            "",
        );
        setMotorcycle(nextSnapshot.detail?.motorcycle || "");
        setCity(
          nextSnapshot.detail?.city_override ||
            nextSnapshot.profile?.city ||
            "",
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Profil member belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [accessLoading, account, fetchWithCache, user],
  );

  useEffect(() => {
    if (accessLoading) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [accessLoading, load]);

  const invalidateMemberProfileCaches = useCallback(() => {
    invalidateCache("member_profiles_list");
    invalidateCache("admin_dashboard_overview");

    if (!account) return;

    invalidateCache(
      "dashboard_member_profile_" + account.member_external_id,
    );
    invalidateCache("profile:" + account.member_external_id);
  }, [account, invalidateCache]);

  const handleRideUpdated = useCallback(async () => {
    invalidateCache("riding:");
    invalidateCache("member_profiles_list");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");

    if (account) {
      invalidateCache(
        "dashboard_member_profile_" + account.member_external_id,
      );
      invalidateCache("profile:" + account.member_external_id);
      invalidateCache(
        "member_touring:" + account.member_external_id,
      );
    }

    await load(true);
  }, [account, invalidateCache, load]);

  const saveDetails = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setMessage("");
      setError("");

      try {
        if (!user || !account) {
          throw new Error("Sesi member tidak ditemukan.");
        }

        const supabase = getSupabaseBrowserClient();
        const { error: upsertError } = await supabase
          .from("member_details")
          .upsert({
            member_external_id: account.member_external_id,
            nickname_override: nickname.trim() || null,
            motorcycle: motorcycle.trim() || null,
            city_override: city.trim() || null,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) throw upsertError;

        setMessage("Profil member berhasil disimpan.");
        invalidateMemberProfileCaches();
        await load(true);
        setProfileEditOpen(false);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Profil belum dapat disimpan.",
        );
      } finally {
        setSaving(false);
      }
    },
    [
      account,
      city,
      invalidateMemberProfileCaches,
      load,
      motorcycle,
      nickname,
      user,
    ],
  );

  const openProfileEdit = useCallback(() => {
    setMessage("");
    setError("");
    setProfileEditOpen(true);
  }, []);

  const logout = useCallback(async () => {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }, [router]);

  return {
    email: user?.email ?? "",
    account,
    ...snapshot,
    loading,
    saving,
    message,
    error,
    nickname,
    motorcycle,
    city,
    profileEditOpen,
    setNickname,
    setMotorcycle,
    setCity,
    setProfileEditOpen,
    openProfileEdit,
    saveDetails,
    handleRideUpdated,
    logout,
  };
}
