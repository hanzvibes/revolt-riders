"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import type { RideLogEditData } from "@/components/ride-log-edit-modal";
import { useDataCache } from "@/context/data-cache-context";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchMemberDirectory,
  fetchMemberTouring,
  type MemberDisplay,
  type MemberTouringSnapshot,
  type TouringItem,
} from "./member-data";
import {
  filterMembers,
  getMemberDirectoryTotals,
} from "./member-model";

export function useMemberScreenController() {
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
  const [selectedMember, setSelectedMember] =
    useState<MemberDisplay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [touringRecords, setTouringRecords] =
    useState<TouringItem[]>([]);
  const [loadingTouring, setLoadingTouring] = useState(false);
  const [touringError, setTouringError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] =
    useState<RideLogEditData | null>(null);
  const detailRequestRef = useRef(0);

  const loadMembers = useCallback(
    async (forceRefresh = false) => {
      if (authLoading) return;

      try {
        setLoading(true);
        const data = await fetchWithCache<MemberDisplay[]>(
          "member_profiles_list",
          fetchMemberDirectory,
          {
            ttlMs: 3 * 60 * 1000,
            forceRefresh,
          },
        );
        setMembers(data);
        setError("");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Direktori member belum dapat dimuat. Coba lagi beberapa saat.",
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
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authLoading, loadMembers]);

  const filtered = useMemo(
    () => filterMembers(members, query),
    [members, query],
  );
  const totals = useMemo(
    () => getMemberDirectoryTotals(members),
    [members],
  );

  const openDetail = useCallback(
    async (member: MemberDisplay) => {
      const requestId = ++detailRequestRef.current;
      const cacheKey =
        "member_touring:" + member.member_external_id;
      const cached =
        getCached<MemberTouringSnapshot>(cacheKey);

      setSelectedMember(member);
      setSheetOpen(true);
      setTouringRecords(cached?.items ?? []);
      setTouringError("");
      setLoadingTouring(!cached);

      if (cached) return;

      try {
        const result =
          await fetchWithCache<MemberTouringSnapshot>(
            cacheKey,
            () =>
              fetchMemberTouring(member.member_external_id),
            { ttlMs: 2 * 60 * 1000 },
          );

        if (!result.cacheable) {
          invalidateCache(cacheKey);
        }

        if (detailRequestRef.current === requestId) {
          setTouringRecords(result.items);
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
    },
    [fetchWithCache, getCached, invalidateCache],
  );

  const closeDetail = useCallback(() => {
    detailRequestRef.current += 1;
    setSheetOpen(false);
    setLoadingTouring(false);
  }, []);

  const canEditTouring = useMemo(() => {
    if (!account || account.status !== "active" || !selectedMember) {
      return false;
    }

    const isStaff = [
      "admin",
      "superadmin",
      "road_captain",
    ].includes(account.role);
    const isOwner =
      account.member_external_id ===
      selectedMember.member_external_id;

    return isStaff || isOwner;
  }, [account, selectedMember]);

  const handleTourUpdated = useCallback(
    (newTotalKm?: number) => {
      if (selectedMember) {
        const updatedKm =
          newTotalKm !== undefined
            ? newTotalKm
            : selectedMember.total_km;
        const updatedMember = {
          ...selectedMember,
          total_km: updatedKm,
        };

        invalidateCache(
          "member_touring:" +
            selectedMember.member_external_id,
        );
        setSelectedMember(updatedMember);
        setMembers((current) =>
          current.map((member) =>
            member.member_external_id ===
            selectedMember.member_external_id
              ? { ...member, total_km: updatedKm }
              : member,
          ),
        );
        void openDetail(updatedMember);
      }

      invalidateCache("member_profiles_list");
      invalidateCache("riding_leaderboard_data");
      invalidateCache("dashboard_club_stats");
      invalidateCache("admin_dashboard_overview");
    },
    [invalidateCache, openDetail, selectedMember],
  );

  const openCreateTour = useCallback(() => {
    if (!selectedMember) return;

    setEditModalData({
      memberExternalId: selectedMember.member_external_id,
      memberName:
        selectedMember.nickname || selectedMember.full_name,
      title: "",
      km: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setEditModalOpen(true);
  }, [selectedMember]);

  const openEditTour = useCallback(
    (item: TouringItem) => {
      if (!selectedMember || item.source !== "ride_log") return;

      setEditModalData({
        id: item.id.replace(/^ride-/, ""),
        memberExternalId: selectedMember.member_external_id,
        memberName:
          selectedMember.nickname || selectedMember.full_name,
        title: item.title,
        km: item.km || 0,
        date:
          item.date ||
          new Date().toISOString().slice(0, 10),
      });
      setEditModalOpen(true);
    },
    [selectedMember],
  );

  const removeTour = useCallback(
    async (item: TouringItem) => {
      if (!selectedMember || item.source !== "ride_log") return;

      const confirmed = await confirmAction({
        title: "Hapus riwayat touring?",
        description:
          'Catatan "' + item.title + '" akan dihapus permanen.',
        confirmLabel: "Hapus Riwayat",
        cancelLabel: "Batal",
        destructive: true,
      });

      if (!confirmed) return;

      setTouringError("");

      try {
        const result = await deleteRideLog(
          item.id.replace(/^ride-/, ""),
          selectedMember.member_external_id,
        );
        handleTourUpdated(result.totalKm);
      } catch (caught) {
        setTouringError(
          caught instanceof Error
            ? caught.message
            : "Gagal menghapus riwayat.",
        );
      }
    },
    [confirmAction, handleTourUpdated, selectedMember],
  );

  const refreshMembers = useCallback(() => {
    invalidateCache("member_profiles_list");
    void loadMembers(true);
  }, [invalidateCache, loadMembers]);

  return {
    user,
    authLoading,
    members,
    query,
    loading,
    error,
    selectedMember,
    sheetOpen,
    touringRecords,
    loadingTouring,
    touringError,
    editModalOpen,
    editModalData,
    filtered,
    totalKmCombined: totals.totalKm,
    totalVerifiedActivities: totals.totalActivities,
    canEditTouring,
    setQuery,
    setEditModalOpen,
    refreshMembers,
    openDetail,
    closeDetail,
    openCreateTour,
    openEditTour,
    removeTour,
    handleTourUpdated,
  };
}
