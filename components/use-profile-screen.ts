"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { type RideLogEditData } from "@/components/ride-log-edit-modal";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { getRiderProgress } from "@/lib/rider-progression";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Bike, CalendarDays, Clock3, Route, ShieldCheck, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Account, Profile, Detail, PrimaryMotorcycle, Ride, RideRow, RsvpActivity, ActivityEvent, ProfileSnapshot } from "./profile-screen-model";

export function useProfileScreen() {

  const { confirmAction } = useActionDialog();
  const router = useRouter();
  const { user, account: accessAccount, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [primaryMotorcycle, setPrimaryMotorcycle] = useState<PrimaryMotorcycle | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [rsvpActivities, setRsvpActivities] = useState<RsvpActivity[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rideActionError, setRideActionError] = useState("");
  const [nickname, setNickname] = useState("");
  const [motorcycle, setMotorcycle] = useState("");
  const [city, setCity] = useState("");
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<RideLogEditData | null>(null);

  const displayName =
    detail?.nickname_override ||
    profile?.nickname ||
    profile?.full_name ||
    account?.member_external_id ||
    "Member";

  // Single Source of Truth for Total KM (no double counting)
  const totalKm = Number(profile?.total_km || 0);
  const eventTitleById = useMemo(
    () => new Map(activityEvents.map((event) => [event.id, event.title])),
    [activityEvents]
  );

  const load = useCallback(async (forceRefresh = false) => {
    if (accessLoading) return;

    if (!user) {
      setEmail("");
      setAccount(null);
      setProfile(null);
      setDetail(null);
      setPrimaryMotorcycle(null);
      setRides([]);
      setRsvpActivities([]);
      setActivityEvents([]);
      setLoading(false);
      return;
    }

    setEmail(user.email ?? "");
    const nextAccount = accessAccount as Account | null;
    setAccount(nextAccount);

    if (!nextAccount) {
      setLoading(false);
      return;
    }

    if (!forceRefresh) setLoading(true);
    setError("");

    try {
      const snapshot = await fetchWithCache<ProfileSnapshot>(
        `profile:${nextAccount.member_external_id}`,
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [profileResult, detailResult, rideResult, rsvpResult, garageResult] =
            await Promise.all([
              supabase
                .from("member_profiles")
                .select(
                  "member_external_id,full_name,nickname,city,join_date,club_role,total_km",
                )
                .eq("member_external_id", nextAccount.member_external_id)
                .maybeSingle(),
              supabase
                .from("member_details")
                .select("nickname_override,motorcycle,city_override")
                .eq("member_external_id", nextAccount.member_external_id)
                .maybeSingle(),
              supabase
                .from("ride_logs")
                .select(
                  "id,event_id,title,status,distance_km,odometer_start,odometer_end,created_at,rejection_reason",
                )
                .eq("member_external_id", nextAccount.member_external_id)
                .order("created_at", { ascending: false })
                .limit(40),
              supabase
                .from("event_rsvps")
                .select("event_id,status,responded_at")
                .eq("member_external_id", nextAccount.member_external_id)
                .order("responded_at", { ascending: false })
                .limit(15),
              supabase
                .from("member_motorcycles")
                .select("nickname,brand,model")
                .eq("member_external_id", nextAccount.member_external_id)
                .eq("is_primary", true)
                .maybeSingle(),
            ]);

          if (profileResult.error) throw profileResult.error;
          if (detailResult.error) throw detailResult.error;
          if (rideResult.error) throw rideResult.error;
          if (rsvpResult.error) throw rsvpResult.error;
          if (garageResult.error) throw garageResult.error;

          const nextProfile = profileResult.data
            ? ({
                ...profileResult.data,
                total_km: Number(profileResult.data.total_km),
              } as Profile)
            : null;
          const nextDetail = detailResult.data as Detail | null;
          const nextRides = ((rideResult.data ?? []) as RideRow[]).map(
            (ride: RideRow) => ({
              ...ride,
              distance_km:
                ride.distance_km === null ? null : Number(ride.distance_km),
              odometer_start:
                ride.odometer_start === null || ride.odometer_start === undefined
                  ? null
                  : Number(ride.odometer_start),
              odometer_end:
                ride.odometer_end === null || ride.odometer_end === undefined
                  ? null
                  : Number(ride.odometer_end),
            }),
          ) as Ride[];
          const nextRsvps = (rsvpResult.data ?? []) as RsvpActivity[];
          const activityEventIds = [
            ...new Set(
              [
                ...nextRides.map((ride) => ride.event_id),
                ...nextRsvps.map((rsvp) => rsvp.event_id),
              ].filter(Boolean),
            ),
          ] as string[];

          let activityEvents: ActivityEvent[] = [];
          if (activityEventIds.length > 0) {
            const eventResult = await supabase
              .from("events")
              .select("id,title")
              .in("id", activityEventIds);
            if (eventResult.error) throw eventResult.error;
            activityEvents = (eventResult.data ?? []) as ActivityEvent[];
          }

          return {
            profile: nextProfile,
            detail: nextDetail,
            primaryMotorcycle:
              (garageResult.data as PrimaryMotorcycle | null) ?? null,
            rides: nextRides,
            rsvpActivities: nextRsvps,
            activityEvents,
          };
        },
        { ttlMs: 60_000, forceRefresh },
      );

      setProfile(snapshot.profile);
      setDetail(snapshot.detail);
      setPrimaryMotorcycle(snapshot.primaryMotorcycle);
      setRides(snapshot.rides);
      setRsvpActivities(snapshot.rsvpActivities);
      setActivityEvents(snapshot.activityEvents);
      setNickname(
        snapshot.detail?.nickname_override || snapshot.profile?.nickname || "",
      );
      setMotorcycle(snapshot.detail?.motorcycle || "");
      setCity(snapshot.detail?.city_override || snapshot.profile?.city || "");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Profil member belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessAccount, accessLoading, fetchWithCache, user]);

  useEffect(() => {
    if (accessLoading) return;
    void load();
  }, [accessLoading, load]);

  const handleRideUpdated = async () => {
    invalidateCache("riding:");
    invalidateCache("member_profiles_list");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");
    if (account) {
      invalidateCache(`dashboard_member_profile_${account.member_external_id}`);
      invalidateCache(`profile:${account.member_external_id}`);
      invalidateCache(`member_touring:${account.member_external_id}`);
    }
    await load(true);
  };

  const saveDetails = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      if (!user || !account) throw new Error("Sesi member tidak ditemukan.");
      const { error: upsertError } = await supabase.from("member_details").upsert({
        member_external_id: account.member_external_id,
        nickname_override: nickname.trim() || null,
        motorcycle: motorcycle.trim() || null,
        city_override: city.trim() || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;
      setMessage("Profil member berhasil disimpan.");
      invalidateCache("member_profiles_list");
      invalidateCache("admin_dashboard_overview");
      invalidateCache(`dashboard_member_profile_${account.member_external_id}`);
      invalidateCache(`profile:${account.member_external_id}`);
      await load(true);
      setProfileEditOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profil belum dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const approvedRidesCount = rides.filter((r) => r.status === "approved").length;
  const attendedAgendaCount = rsvpActivities.filter((rsvp) => rsvp.status === "attending").length;
  const joinDate = profile?.join_date ? new Date(profile.join_date) : null;
  const joinYear =
    joinDate && !Number.isNaN(joinDate.getTime()) ? joinDate.getFullYear() : null;

  const riderProgress = getRiderProgress({
    totalKm,
    approvedRideCount: approvedRidesCount,
    approvedRideDates: rides
      .filter((ride) => ride.status === "approved")
      .map((ride) => ride.created_at),
    attendedAgendaCount,
    activeMember: account.status === "active",
  });
  const previousKmMilestone = riderProgress.level.minKm;
  const nextKmMilestone = riderProgress.level.nextKm;
  const milestoneProgress = riderProgress.levelProgress;
  const remainingKmToMilestone = riderProgress.remainingKm;

  const badgeIcon = (key: string) => {
    if (key === "verified") return ShieldCheck;
    if (key === "streak-3") return Clock3;
    if (key.includes("agenda")) return CalendarDays;
    if (key.includes("road-")) return key === "road-1k" ? Route : Trophy;
    return Bike;
  };

  const passportBadges = riderProgress.badges
    .filter((badge) =>
      ["verified", "first-ride", "road-1k", "five-rides", "streak-3", "road-5k"].includes(
        badge.key,
      ),
    )
    .map((badge) => ({ ...badge, Icon: badgeIcon(badge.key) }));


  return { confirmAction, email, account, profile, detail, primaryMotorcycle, rides, loading, saving, message, setMessage, error, setError, rideActionError, setRideActionError, nickname, setNickname, motorcycle, setMotorcycle, city, setCity, profileEditOpen, setProfileEditOpen, editModalOpen, setEditModalOpen, editModalData, setEditModalData, displayName, totalKm, eventTitleById, handleRideUpdated, saveDetails, logout, approvedRidesCount, attendedAgendaCount, joinDate, joinYear, riderProgress, previousKmMilestone, nextKmMilestone, milestoneProgress, remainingKmToMilestone, passportBadges };

}
