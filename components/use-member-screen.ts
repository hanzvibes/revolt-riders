"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import { type RideLogEditData } from "@/components/ride-log-edit-modal";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MemberDisplay, TouringItem } from "./member-screen-model";

export function useMemberScreen() {

  const { confirmAction } = useActionDialog();
  const {
    user,
    account,
    loading: authLoading,
    fetchWithCache,
    getCached,
    invalidateCache,
  } = useDataCache();
  const [members, setMembers] = useState<MemberDisplay[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberDisplay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [touringRecords, setTouringRecords] = useState<TouringItem[]>([]);
  const [loadingTouring, setLoadingTouring] = useState(false);
  const [touringError, setTouringError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<RideLogEditData | null>(null);
  const detailRequestRef = useRef(0);

  const loadMembers = useCallback(async () => {
    if (authLoading) return;

    try {
      setLoading(true);
      const data = await fetchWithCache<MemberDisplay[]>(
        "member_profiles_list",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [profilesRes, detailsRes, rideCountsRes] = await Promise.all([
            supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname,club_role,total_km,city,join_date")
              .order("full_name"),
            supabase
              .from("member_details")
              .select("member_external_id,nickname_override,motorcycle,city_override"),
            supabase
              .from("ride_logs")
              .select("member_external_id")
              .eq("status", "approved"),
          ]);

          type DetailRow = {
            member_external_id: string;
            nickname_override: string | null;
            motorcycle: string | null;
            city_override: string | null;
          };

          const detailMap = new Map<string, DetailRow>(
            ((detailsRes.data ?? []) as DetailRow[]).map((d) => [d.member_external_id, d]),
          );

          const rideCountByMember = new Map<string, number>();
          for (const r of (rideCountsRes.data ?? []) as { member_external_id: string }[]) {
            if (r.member_external_id) {
              rideCountByMember.set(
                r.member_external_id,
                (rideCountByMember.get(r.member_external_id) || 0) + 1,
              );
            }
          }

          type MemberDbRow = {
            member_external_id: string;
            full_name: string;
            nickname: string | null;
            club_role: string | null;
            total_km: number | string | null;
            city: string | null;
            join_date: string | null;
          };

          return ((profilesRes.data ?? []) as MemberDbRow[]).map((row) => {
            const detail = detailMap.get(row.member_external_id);
            const nickname = detail?.nickname_override || row.nickname || null;
            const city = detail?.city_override || row.city || null;
            const motorcycle = detail?.motorcycle || null;
            const joinDate = row.join_date;
            let joinDateLabel = joinDate;
            if (joinDate) {
              try {
                joinDateLabel = new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "long",
                }).format(new Date(joinDate));
              } catch {
                joinDateLabel = joinDate;
              }
            }

            return {
              member_external_id: row.member_external_id,
              full_name: row.full_name,
              nickname,
              club_role: row.club_role || null,
              total_km: Number(row.total_km) || 0,
              city,
              motorcycle,
              join_date: joinDate,
              join_date_label: joinDateLabel,
              touring_count: rideCountByMember.get(row.member_external_id) || 0,
            };
          });
        },
        { ttlMs: 3 * 60 * 1000 },
      );

      setMembers(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Direktori member belum dapat dimuat. Coba lagi beberapa saat.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, fetchWithCache]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const target = `${m.full_name} ${m.nickname ?? ""} ${m.member_external_id} ${m.club_role ?? ""} ${m.city ?? ""} ${m.motorcycle ?? ""}`.toLowerCase();
      return target.includes(q);
    });
  }, [members, query]);

  const totalKmCombined = useMemo(() => {
    return members.reduce((sum, m) => sum + (Number(m.total_km) || 0), 0);
  }, [members]);

  const totalVerifiedActivities = useMemo(() => {
    return members.reduce((sum, m) => sum + (Number(m.touring_count) || 0), 0);
  }, [members]);

  const getInitials = (name: string, nickname: string | null) => {
    const text = (nickname || name || "RR").trim();
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  const getRoleClass = (role: string | null) => {
    const r = (role ?? "").toUpperCase().trim();
    if (r === "PRESIDENT") return "badge-president";
    if (r === "FOUNDER") return "badge-founder";
    if (r === "EXCECUTOR" || r === "EXECUTOR") return "badge-executor";
    if (r === "NEGOSIATOR") return "badge-negosiator";
    if (r === "CAPROS") return "badge-capros";
    if (r === "PROSPEK") return "badge-prospek";
    if (r === "VIRGIN") return "badge-virgin";
    if (r === "LIFE MEMBER" || r === "LIFEMEMBER") return "badge-lifemember";
    if (r.includes("CAPTAIN")) return "badge-rc";
    if (
      r.includes("ADMIN") ||
      r.includes("KETUA") ||
      r.includes("SEKRETARIS") ||
      r.includes("BENDAHARA")
    )
      return "badge-admin";
    return "";
  };

  const openDetail = async (member: MemberDisplay) => {
    const requestId = ++detailRequestRef.current;
    const cacheKey = `member_touring:${member.member_external_id}`;
    const cached = getCached<TouringItem[]>(cacheKey);

    setSelectedMember(member);
    setSheetOpen(true);
    setTouringRecords(cached ?? []);
    setTouringError("");
    setLoadingTouring(!cached);

    if (cached) return;

    let cacheable = true;

    try {
      const items = await fetchWithCache<TouringItem[]>(
        cacheKey,
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [rideLogsRes, attendanceRes] = await Promise.all([
            supabase
              .from("ride_logs")
              .select(
                "id,event_id,title,distance_km,odometer_start,odometer_end,created_at",
              )
              .eq("member_external_id", member.member_external_id)
              .eq("status", "approved")
              .order("created_at", { ascending: false }),
            supabase
              .from("event_attendance")
              .select("event_id,checked_in_at")
              .eq("member_external_id", member.member_external_id)
              .order("checked_in_at", { ascending: false }),
          ]);

          if (rideLogsRes.error || attendanceRes.error) {
            cacheable = false;
          }

          type RideLogItem = {
            id: string;
            event_id: string | null;
            title?: string | null;
            distance_km: number | string | null;
            odometer_start?: number | string | null;
            odometer_end?: number | string | null;
            created_at: string;
          };
          type AttendanceItem = {
            event_id: string;
            checked_in_at: string;
          };

          const rides = (rideLogsRes.data ?? []) as RideLogItem[];
          const attendance = (attendanceRes.data ?? []) as AttendanceItem[];

          const eventIds: string[] = [
            ...new Set(
              [
                ...rides.map((ride) => ride.event_id),
                ...attendance.map((item) => item.event_id),
              ].filter((id): id is string => Boolean(id)),
            ),
          ];

          const eventsRes = eventIds.length
            ? await supabase.from("events").select("id,title").in("id", eventIds)
            : { data: [], error: null };

          if (eventsRes.error) {
            cacheable = false;
          }

          const eventTitleMap = new Map<string, string>(
            ((eventsRes.data ?? []) as { id: string; title: string }[]).map(
              (event) => [event.id, event.title],
            ),
          );

          const items: TouringItem[] = [];
          let counter = 1;

          for (const ride of rides) {
            const title =
              ride.title &&
              !["Ride Mandiri", "Ride mandiri"].includes(ride.title.trim())
                ? ride.title
                : ride.event_id
                  ? eventTitleMap.get(ride.event_id) || "Agenda Riding"
                  : "Touring / Sowan Mandiri";
            items.push({
              id: `ride-${ride.id}`,
              no: counter++,
              title,
              km:
                ride.distance_km !== null ? Number(ride.distance_km) : null,
              odometer_start:
                ride.odometer_start !== null &&
                ride.odometer_start !== undefined
                  ? Number(ride.odometer_start)
                  : null,
              odometer_end:
                ride.odometer_end !== null && ride.odometer_end !== undefined
                  ? Number(ride.odometer_end)
                  : null,
              date: ride.created_at,
              source: "ride_log",
            });
          }

          const coveredEventIds = new Set(
            rides.map((ride) => ride.event_id).filter(Boolean),
          );
          for (const item of attendance) {
            if (!item.event_id || coveredEventIds.has(item.event_id)) continue;
            items.push({
              id: `att-${item.event_id}-${item.checked_in_at}`,
              no: counter++,
              title:
                eventTitleMap.get(item.event_id) || "Kegiatan Komunitas",
              km: null,
              date: item.checked_in_at,
              source: "event_attendance",
            });
          }

          return items;
        },
        { ttlMs: 2 * 60 * 1000 },
      );

      if (!cacheable) {
        invalidateCache(cacheKey);
      }

      if (detailRequestRef.current === requestId) {
        setTouringRecords(items);
      }
    } catch {
      invalidateCache(cacheKey);
      if (detailRequestRef.current === requestId) {
        setTouringRecords([]);
      }
    } finally {
      if (detailRequestRef.current === requestId) {
        setLoadingTouring(false);
      }
    }
  };

  const closeDetail = () => {
    detailRequestRef.current += 1;
    setSheetOpen(false);
    setLoadingTouring(false);
  };

  const canEditTouring = useMemo(() => {
    if (!account || account.status !== "active" || !selectedMember) return false;
    const isStaff = ["admin", "superadmin", "road_captain"].includes(account.role);
    const isOwner = account.member_external_id === selectedMember.member_external_id;
    return isStaff || isOwner;
  }, [account, selectedMember]);

  const handleTourUpdated = (newTotalKm?: number) => {
    if (selectedMember) {
      const updatedKm =
        newTotalKm !== undefined ? newTotalKm : selectedMember.total_km;
      const updatedMember = { ...selectedMember, total_km: updatedKm };
      invalidateCache(
        `member_touring:${selectedMember.member_external_id}`,
      );
      setSelectedMember(updatedMember);
      setMembers((prev) =>
        prev.map((m) =>
          m.member_external_id === selectedMember.member_external_id
            ? { ...m, total_km: updatedKm }
            : m,
        ),
      );
      void openDetail(updatedMember);
    }
    invalidateCache("member_profiles_list");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");
  };


  return { confirmAction, user, authLoading, invalidateCache, members, query, setQuery, loading, error, selectedMember, sheetOpen, touringRecords, loadingTouring, touringError, setTouringError, editModalOpen, setEditModalOpen, editModalData, setEditModalData, loadMembers, filtered, totalKmCombined, totalVerifiedActivities, getInitials, getRoleClass, openDetail, closeDetail, canEditTouring, handleTourUpdated };

}
