"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageState } from "@/components/page-state";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { useMemberAccess } from "@/hooks/use-member-access";
import { fetchVoyagerSnapshot } from "./voyager-data";
import { deriveVoyagerState, type VoyagerView } from "./voyager-derived";
import { VoyagerDetailSheet } from "./voyager-detail-sheet";
import { VoyagerHub } from "./voyager-hub";
import { VoyagerManageSheet } from "./voyager-manage-sheet";
import {
  isAdminRole,
  type GalleryPhoto,
  type Member,
  type Participant,
  type VoyagerEvent,
  type VoyagerSnapshot,
} from "./voyager-model";
import { ShieldAlert } from "lucide-react";

const EMPTY_IDS: readonly string[] = [];
const EMPTY_MEMBERS: Member[] = [];
const EMPTY_PHOTOS: GalleryPhoto[] = [];

export default function VoyagerPage() {
  const { account, loading: accessLoading } = useMemberAccess();
  const { fetchWithCache } = useDataCache();
  const [events, setEvents] = useState<VoyagerEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [mandatoryKm, setMandatoryKm] = useState(0);
  const [view, setView] = useState<VoyagerView>("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [detailEvent, setDetailEvent] = useState<VoyagerEvent | null>(null);
  const [manageEvent, setManageEvent] = useState<VoyagerEvent | null>(null);

  const activeAccount = account?.status === "active" ? account : null;
  const canManage = Boolean(activeAccount && isAdminRole(activeAccount.role));

  const load = useCallback(async (forceRefresh = false) => {
    if (!activeAccount) {
      setLoading(false);
      return;
    }

    setError("");
    try {
      const year = new Date().getFullYear();
      const cacheKey = `voyager:${activeAccount.member_external_id}:${year}`;
      const snapshot = await fetchWithCache<VoyagerSnapshot>(
        cacheKey,
        () => fetchVoyagerSnapshot(activeAccount.member_external_id, year),
        { ttlMs: 90_000, forceRefresh },
      );

      setEvents(snapshot.events);
      setMembers(snapshot.members);
      setParticipants(snapshot.participants);
      setPhotos(snapshot.photos);
      setMandatoryKm(snapshot.mandatoryKm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data Voyager belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [activeAccount, fetchWithCache]);

  useEffect(() => {
    if (!accessLoading) void load();
  }, [accessLoading, load]);

  useEffect(() => {
    if (events.length === 0 || typeof window === "undefined") return;

    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!slug) return;

    const target = events.find((event) => event.slug === slug);
    if (!target) return;

    setView(target.status === "completed" ? "history" : "active");
    setDetailEvent(target);
  }, [events]);

  const derived = useMemo(
    () =>
      deriveVoyagerState({
        events,
        members,
        participants,
        photos,
        currentMemberId: activeAccount?.member_external_id,
        view,
      }),
    [activeAccount?.member_external_id, events, members, participants, photos, view],
  );

  const closeDetail = () => {
    setDetailEvent(null);
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  };

  const openManage = (event: VoyagerEvent) => {
    setManageEvent(event);
    setError("");
    setMessage("");
  };

  const refresh = useCallback(() => load(true), [load]);
  const detailParticipants = detailEvent
    ? (derived.participantsByEvent.get(detailEvent.id) ?? EMPTY_MEMBERS)
    : EMPTY_MEMBERS;
  const detailPhotos = detailEvent
    ? (derived.photosByEvent.get(detailEvent.id) ?? EMPTY_PHOTOS)
    : EMPTY_PHOTOS;
  const manageParticipantIds = manageEvent
    ? (derived.participantIdsByEvent.get(manageEvent.id) ?? EMPTY_IDS)
    : EMPTY_IDS;
  const managePhotos = manageEvent
    ? (derived.photosByEvent.get(manageEvent.id) ?? EMPTY_PHOTOS)
    : EMPTY_PHOTOS;

  if (accessLoading || loading) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <PageSkeleton title="Memuat Voyager..." />
      </AppShell>
    );
  }

  if (!activeAccount) {
    return (
      <AppShell active="Voyager" title="Voyager">
        <div className="page-wrap">
          <PageState
            tone="restricted"
            icon={<ShieldAlert />}
            title="Akun member aktif diperlukan"
            description="Voyager hanya tersedia untuk member Revolt Riders yang aktif."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Voyager" title="Voyager">
      <VoyagerHub
        state={derived}
        view={view}
        mandatoryKm={mandatoryKm}
        currentMemberId={activeAccount.member_external_id}
        canManage={canManage}
        message={message}
        error={error}
        photoCount={photos.length}
        onViewChange={setView}
        onOpenDetail={setDetailEvent}
        onOpenManage={openManage}
      />

      <VoyagerDetailSheet
        event={detailEvent}
        participants={detailParticipants}
        photos={detailPhotos}
        canManage={canManage}
        onClose={closeDetail}
        onManage={openManage}
      />

      <VoyagerManageSheet
        key={manageEvent?.id ?? "closed"}
        event={manageEvent}
        members={members}
        participantIds={manageParticipantIds}
        photos={managePhotos}
        canManage={canManage}
        error={error}
        message={message}
        onError={setError}
        onMessage={setMessage}
        onClose={() => setManageEvent(null)}
        onRefresh={refresh}
      />
    </AppShell>
  );
}
