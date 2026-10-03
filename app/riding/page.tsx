"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  RideLogEditModal,
  type RideLogEditData,
} from "@/components/ride-log-edit-modal";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { fetchRidingSnapshot } from "./riding-data";
import { deriveRidingState } from "./riding-derived";
import { RidingForm } from "./riding-form";
import { RidingHistory } from "./riding-history";
import type {
  MemberProfile,
  RideEvent,
  RidingSnapshot,
  UserRide,
} from "./riding-model";
import { RidingSummary } from "./riding-summary";

export default function RidingPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache, invalidateCache } = useDataCache();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [rides, setRides] = useState<UserRide[]>([]);
  const [events, setEvents] = useState<RideEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<RideLogEditData | null>(null);

  const activeAccount = account?.status === "active" ? account : null;
  const isStaff = Boolean(
    activeAccount &&
      ["admin", "superadmin", "road_captain"].includes(activeAccount.role),
  );

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!activeAccount) {
        setLoadingData(false);
        return;
      }

      try {
        const snapshot = await fetchWithCache<RidingSnapshot>(
          `riding:${activeAccount.member_external_id}`,
          () => fetchRidingSnapshot(activeAccount.member_external_id),
          { ttlMs: 60_000, forceRefresh },
        );

        setEvents(snapshot.events);
        setProfile(snapshot.profile);
        setRides(snapshot.rides);
        setError("");
      } catch {
        setError("Gagal memuat data riding. Coba segarkan halaman.");
      } finally {
        setLoadingData(false);
      }
    },
    [activeAccount, fetchWithCache],
  );

  useEffect(() => {
    if (!accessLoading) void loadData();
  }, [accessLoading, loadData]);

  const invalidateRideDerivedCaches = useCallback(() => {
    invalidateCache("riding:");
    invalidateCache("profile:");
    invalidateCache("dashboard_member_profile_");
    invalidateCache("dashboard_club_stats");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("member_profiles_list");
    invalidateCache("member_touring:");
    invalidateCache("admin_dashboard_overview");
  }, [invalidateCache]);

  const refreshRideData = useCallback(async () => {
    invalidateRideDerivedCaches();
    await loadData(true);
  }, [invalidateRideDerivedCaches, loadData]);

  const derived = useMemo(
    () =>
      deriveRidingState({
        rides,
        profile,
        memberExternalId: activeAccount?.member_external_id,
      }),
    [activeAccount?.member_external_id, profile, rides],
  );

  const toggleForm = () => {
    setShowForm((current) => !current);
    setError("");
    setMessage("");
  };

  if (accessLoading || (activeAccount && loadingData)) {
    return (
      <AppShell active="Riding" title="Catat Riding">
        <PageSkeleton title="Memuat Data Catatan Riding..." />
      </AppShell>
    );
  }

  return (
    <AppShell active="Riding" title="Catat Riding">
      <div className="page-wrap">
        <RidingSummary
          rides={rides}
          memberExternalId={activeAccount?.member_external_id ?? null}
          derived={derived}
          showForm={showForm}
          onToggleForm={toggleForm}
          onMessage={setMessage}
          onError={setError}
        />

        {error && (
          <p className="error-message riding-page-feedback" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success-message" style={{ marginBottom: "16px" }}>
            <CheckCircle2 size={18} />
            {message}
          </p>
        )}

        <RidingForm
          visible={showForm}
          events={events}
          memberExternalId={activeAccount?.member_external_id ?? null}
          accountExists={Boolean(account)}
          isStaff={isStaff}
          onClose={() => setShowForm(false)}
          onSaved={refreshRideData}
          onMessage={setMessage}
          onError={setError}
        />

        <RidingHistory
          rides={rides}
          memberExternalId={activeAccount?.member_external_id ?? null}
          displayName={derived.displayName}
          onOpenForm={() => setShowForm(true)}
          onEdit={(data) => {
            setEditModalData(data);
            setEditModalOpen(true);
          }}
          onError={setError}
          onChanged={refreshRideData}
        />
      </div>

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editModalData}
        onSaved={() => void refreshRideData()}
        onDeleted={() => void refreshRideData()}
      />
    </AppShell>
  );
}
