from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content.strip() + "\n")


write(
    "app/riding/riding-model.ts",
    r'''
export type RideEvent = {
  id: string;
  title: string;
  type: "riding" | "touring";
  start_at: string;
};

export type UserRide = {
  id: string;
  title: string | null;
  event_id: string | null;
  odometer_start: number;
  odometer_end: number;
  distance_km: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  source_type: "member_submission" | "official_agenda";
  counts_as_mandatory: boolean;
};

export type MemberProfile = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  total_km: number;
};

export type RidingSnapshot = {
  events: RideEvent[];
  profile: MemberProfile | null;
  rides: UserRide[];
};

export const eventDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
''',
)

write(
    "app/riding/riding-data.ts",
    r'''
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  MemberProfile,
  RideEvent,
  RidingSnapshot,
  UserRide,
} from "./riding-model";

export async function fetchRidingSnapshot(
  memberExternalId: string,
): Promise<RidingSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const [eventsRes, profileRes, ridesRes] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,type,start_at")
      .in("status", ["published", "completed"])
      .in("type", ["riding", "touring"])
      .order("start_at", { ascending: false })
      .limit(50),
    supabase
      .from("member_profiles")
      .select("member_external_id,full_name,nickname,total_km")
      .eq("member_external_id", memberExternalId)
      .maybeSingle(),
    supabase
      .from("ride_logs")
      .select(
        "id,title,event_id,odometer_start,odometer_end,distance_km,status,created_at,rejection_reason,source_type,counts_as_mandatory",
      )
      .eq("member_external_id", memberExternalId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (profileRes.error) throw profileRes.error;
  if (ridesRes.error) throw ridesRes.error;

  const profile = profileRes.data
    ? {
        ...(profileRes.data as Omit<MemberProfile, "total_km"> & {
          total_km: number | string;
        }),
        total_km: Number(profileRes.data.total_km) || 0,
      }
    : null;

  const rides = ((ridesRes.data ?? []) as { [key: string]: unknown }[]).map(
    (ride): UserRide => ({
      id: String(ride.id),
      title: (ride.title as string) || null,
      event_id: (ride.event_id as string) || null,
      odometer_start: Number(ride.odometer_start) || 0,
      odometer_end: Number(ride.odometer_end) || 0,
      distance_km:
        ride.distance_km !== null && ride.distance_km !== undefined
          ? Number(ride.distance_km)
          : null,
      status: ride.status as UserRide["status"],
      created_at: String(ride.created_at),
      rejection_reason: (ride.rejection_reason as string) || null,
      source_type:
        (ride.source_type as UserRide["source_type"]) || "member_submission",
      counts_as_mandatory: Boolean(ride.counts_as_mandatory),
    }),
  );

  return {
    events: (eventsRes.data ?? []) as RideEvent[],
    profile,
    rides,
  };
}
''',
)

write(
    "app/riding/riding-derived.ts",
    r'''
import type { MemberProfile, UserRide } from "./riding-model";

export type RidingDerivedState = {
  pendingRides: UserRide[];
  approvedRides: UserRide[];
  totalVerifiedKm: number;
  displayName: string;
  recapYear: number;
  yearApprovedRides: UserRide[];
  yearKm: number;
  longestRideKm: number;
  activeRideMonths: number;
};

export function deriveRidingState({
  rides,
  profile,
  memberExternalId,
  now = new Date(),
}: {
  rides: UserRide[];
  profile: MemberProfile | null;
  memberExternalId?: string | null;
  now?: Date;
}): RidingDerivedState {
  const pendingRides = rides.filter((ride) => ride.status === "pending");
  const approvedRides = rides.filter((ride) => ride.status === "approved");
  const totalVerifiedKm =
    profile?.total_km ??
    approvedRides.reduce((sum, ride) => sum + (ride.distance_km ?? 0), 0);
  const displayName =
    profile?.nickname || profile?.full_name || memberExternalId || "Rider";
  const recapYear = now.getFullYear();
  const yearApprovedRides = approvedRides.filter((ride) => {
    const date = new Date(ride.created_at);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === recapYear;
  });
  const yearKm = yearApprovedRides.reduce(
    (sum, ride) => sum + (ride.distance_km ?? 0),
    0,
  );
  const longestRideKm = yearApprovedRides.reduce(
    (max, ride) => Math.max(max, ride.distance_km ?? 0),
    0,
  );
  const activeRideMonths = new Set(
    yearApprovedRides.map((ride) => {
      const date = new Date(ride.created_at);
      return `${date.getFullYear()}-${date.getMonth() + 1}`;
    }),
  ).size;

  return {
    pendingRides,
    approvedRides,
    totalVerifiedKm,
    displayName,
    recapYear,
    yearApprovedRides,
    yearKm,
    longestRideKm,
    activeRideMonths,
  };
}

export function buildRideRecapText(state: RidingDerivedState) {
  return [
    `REVOLT RIDERS · RIDE RECAP ${state.recapYear}`,
    state.displayName,
    `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(state.yearKm)} KM terverifikasi`,
    `${state.yearApprovedRides.length} ride disetujui`,
    `Longest ride ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(state.longestRideKm)} KM`,
    `${state.activeRideMonths} bulan aktif riding`,
  ].join("\n");
}
''',
)

write(
    "app/riding/riding-summary.tsx",
    r'''
"use client";

import dynamic from "next/dynamic";
import { Clock, Plus, Share2, X } from "lucide-react";
import { CountUpNumber } from "@/components/count-up-number";
import {
  buildRideRecapText,
  type RidingDerivedState,
} from "./riding-derived";
import type { UserRide } from "./riding-model";

const RidingStatChart = dynamic(
  () =>
    import("@/components/riding-stat-chart").then(
      (module) => module.RidingStatChart,
    ),
  {
    ssr: false,
    loading: () => (
      <section
        className="riding-stat-chart riding-stat-chart-loading"
        aria-label="Memuat statistik riding"
      >
        <div className="skeleton-shimmer" aria-hidden="true" />
      </section>
    ),
  },
);

export function RidingSummary({
  rides,
  memberExternalId,
  derived,
  showForm,
  onToggleForm,
  onMessage,
  onError,
}: {
  rides: UserRide[];
  memberExternalId: string | null;
  derived: RidingDerivedState;
  showForm: boolean;
  onToggleForm: () => void;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const shareRideRecap = async () => {
    const recapText = buildRideRecapText(derived);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Revolt Riders Ride Recap ${derived.recapYear}`,
          text: recapText,
        });
        return;
      }
      await navigator.clipboard.writeText(recapText);
      onMessage("Ride Recap berhasil disalin. Tinggal paste ke WhatsApp atau Instagram.");
    } catch (cause) {
      if ((cause as { name?: string })?.name !== "AbortError") {
        onError("Ride Recap belum dapat dibagikan dari browser ini.");
      }
    }
  };

  return (
    <section
      className="card riding-summary-hero"
      style={{
        background:
          "radial-gradient(circle at 85% 30%, #2a2d30, transparent 40%), linear-gradient(135deg, #141618, #222528)",
        color: "#fff",
        borderRadius: "18px",
        padding: "26px 28px",
        boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
        marginBottom: "22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <em
            style={{
              fontStyle: "normal",
              fontSize: "var(--rr-type-caption)",
              color: "var(--red)",
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            RIDING LOG · REVOLT RIDERS
          </em>
          <h2
            style={{
              fontSize: "1.75rem",
              margin: "4px 0 6px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            {derived.displayName}
          </h2>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.78rem" }}>
            {memberExternalId ?? "Belum masuk akun"} · Catatan jarak & odometer resmi
          </p>
        </div>

        <button
          type="button"
          className="primary-action"
          onClick={onToggleForm}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "TUTUP FORM" : "+ CATAT RIDING"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "14px",
          marginTop: "22px",
          paddingTop: "18px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div>
          <small
            style={{
              color: "#8b949e",
              fontSize: "var(--rr-type-caption)",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Total KM Terverifikasi
          </small>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#fff",
              marginTop: "2px",
            }}
          >
            <CountUpNumber
              value={derived.totalVerifiedKm}
              maximumFractionDigits={1}
            />{" "}
            <span style={{ fontSize: "0.85rem", color: "var(--red)" }}>KM</span>
          </div>
        </div>

        <div>
          <small
            style={{
              color: "#8b949e",
              fontSize: "var(--rr-type-caption)",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Ride Disetujui
          </small>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#fff",
              marginTop: "2px",
            }}
          >
            <CountUpNumber value={derived.approvedRides.length} />{" "}
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>log</span>
          </div>
        </div>

        <div>
          <small
            style={{
              color: "#8b949e",
              fontSize: "var(--rr-type-caption)",
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Menunggu Validasi
          </small>
          <div
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: derived.pendingRides.length > 0 ? "#fbbf24" : "#9ca3af",
              marginTop: "2px",
            }}
          >
            <CountUpNumber value={derived.pendingRides.length} />{" "}
            <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>log</span>
          </div>
        </div>
      </div>

      <RidingStatChart rides={rides} />

      {memberExternalId && (
        <section
          className="riding-recap-strip"
          aria-label={`Ride Recap ${derived.recapYear}`}
        >
          <div className="riding-recap-head">
            <span>
              <small>RIDE RECAP {derived.recapYear}</small>
              <strong>Jejak jalan tahun ini</strong>
            </span>
            <button type="button" onClick={() => void shareRideRecap()}>
              <Share2 aria-hidden="true" />
              Share
            </button>
          </div>
          <div className="riding-recap-grid">
            <span>
              <small>KM</small>
              <b>
                {new Intl.NumberFormat("id-ID", {
                  maximumFractionDigits: 1,
                }).format(derived.yearKm)}
              </b>
            </span>
            <span>
              <small>Ride</small>
              <b>{derived.yearApprovedRides.length}</b>
            </span>
            <span>
              <small>Longest</small>
              <b>
                {new Intl.NumberFormat("id-ID", {
                  maximumFractionDigits: 1,
                }).format(derived.longestRideKm)} KM
              </b>
            </span>
            <span>
              <small>Bulan aktif</small>
              <b>{derived.activeRideMonths}</b>
            </span>
          </div>
        </section>
      )}

      {derived.pendingRides.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.72rem",
            color: "#fef3c7",
          }}
        >
          <Clock size={15} color="#fbbf24" />
          <span>
            Ada <b><CountUpNumber value={derived.pendingRides.length} /> catatan riding</b>{" "}
            yang sedang menunggu validasi Road Captain / Pengurus sebelum masuk ke Total KM & Leaderboard.
          </span>
        </div>
      )}
    </section>
  );
}
''',
)

write(
    "app/riding/riding-form.tsx",
    r'''
"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Bike, CalendarDays, Gauge } from "lucide-react";
import { saveRideLog } from "@/lib/services/ride-log-service";
import { eventDate, type RideEvent } from "./riding-model";

export function RidingForm({
  visible,
  events,
  memberExternalId,
  accountExists,
  isStaff,
  onClose,
  onSaved,
  onMessage,
  onError,
}: {
  visible: boolean;
  events: RideEvent[];
  memberExternalId: string | null;
  accountExists: boolean;
  isStaff: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [eventId, setEventId] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((item) => item.id === eventId),
    [eventId, events],
  );
  const distance = Math.max(0, Number(end || 0) - Number(start || 0));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!memberExternalId) return;

    const cleanTitle = title.trim() || (selectedEvent ? selectedEvent.title : "");
    if (!cleanTitle && !selectedEvent) {
      onError("Harap isi nama kegiatan, agenda, atau destinasi riding.");
      return;
    }

    if (distance <= 0) {
      onError(
        "Jarak harus lebih besar dari 0 KM (Odometer akhir harus lebih besar dari awal).",
      );
      return;
    }

    setSaving(true);
    onError("");
    onMessage("");

    try {
      const finalTitle = cleanTitle || "Ride Mandiri";
      const result = await saveRideLog({
        memberExternalId,
        title: finalTitle,
        km: distance,
        eventId: eventId || null,
        odometerStart: Number(start),
        odometerEnd: Number(end),
      });

      if (result.status === "approved" || isStaff) {
        onMessage(
          `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil disimpan dan langsung disetujui (Approved).`,
        );
      } else {
        onMessage(
          `${distance.toLocaleString("id-ID")} KM ("${finalTitle}") berhasil dikirim! Menunggu validasi Road Captain / Pengurus.`,
        );
      }

      setEventId("");
      setTitle("");
      setStart("");
      setEnd("");
      onClose();
      await onSaved();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Ride log belum dapat dikirim.");
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <section className="form-card card" style={{ marginBottom: "24px" }}>
      <div className="form-heading">
        <Bike />
        <span>
          <em>Catat riding</em>
          <h2>Catat Riding Baru</h2>
          <p>
            Pilih agenda club atau catat touring mandiri. Odometer awal dan akhir akan menghitung jarak kilometer secara otomatis.
          </p>
        </span>
      </div>

      {!memberExternalId ? (
        <div className="notice" style={{ marginTop: "14px" }}>
          Akun member harus aktif untuk mencatat riding.{" "}
          <a href={accountExists ? "/profil" : "/login"}>
            {accountExists ? "Lihat status akun" : "Masuk sekarang"}
          </a>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label>
            Pilih Agenda Resmi (Opsional)
            <select
              value={eventId}
              onChange={(changeEvent) => {
                setEventId(changeEvent.target.value);
                const nextEvent = events.find(
                  (item) => item.id === changeEvent.target.value,
                );
                setTitle(nextEvent?.title ?? "");
              }}
            >
              <option value="">Touring / Ride Mandiri (Tanpa Agenda)</option>
              {events.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.title} · {eventDate(item.start_at)}
                </option>
              ))}
            </select>
          </label>

          {selectedEvent && (
            <p className="system-message" style={{ margin: "4px 0 10px" }}>
              <CalendarDays size={15} /> Terhubung ke agenda {selectedEvent.type}:{" "}
              <b>{selectedEvent.title}</b>
            </p>
          )}

          <label>
            Nama Kegiatan / Destinasi {selectedEvent ? "(Otomatis dari agenda)" : "*"}
            <input
              type="text"
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              placeholder={
                selectedEvent
                  ? selectedEvent.title
                  : "Contoh: Sowan ke RR Banyuwangi, Sunmori Pasir Putih, dsb."
              }
              required={!selectedEvent}
            />
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
          >
            <label>
              Odometer Awal (KM)
              <input
                type="number"
                min="0"
                step="0.1"
                value={start}
                onChange={(changeEvent) => setStart(changeEvent.target.value)}
                placeholder="Contoh: 12450"
                required
              />
            </label>

            <label>
              Odometer Akhir (KM)
              <input
                type="number"
                min={start || "0"}
                step="0.1"
                value={end}
                onChange={(changeEvent) => setEnd(changeEvent.target.value)}
                placeholder="Contoh: 12580"
                required
              />
            </label>
          </div>

          <div className="distance-preview">
            <Gauge />
            <span>
              <small>JARAK TERHITUNG OTOMATIS</small>
              <b>{distance.toLocaleString("id-ID")} KM</b>
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              className="primary-action"
              disabled={saving || distance <= 0}
              style={{ flex: 1 }}
            >
              {saving
                ? "Mengirim Catatan…"
                : isStaff
                  ? "SIMPAN & VERIFIKASI SEBAGAI PENGURUS"
                  : "KIRIM CATATAN RIDING"}
            </button>
            <button
              type="button"
              className="outline-action"
              onClick={onClose}
              style={{ padding: "0 18px" }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
''',
)

write(
    "app/riding/riding-history.tsx",
    r'''
"use client";

import { Bike, Pencil, Route, Trash2 } from "lucide-react";
import { useActionDialog } from "@/components/action-dialog-provider";
import type { RideLogEditData } from "@/components/ride-log-edit-modal";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import type { UserRide } from "./riding-model";

export function RidingHistory({
  rides,
  memberExternalId,
  displayName,
  onOpenForm,
  onEdit,
  onError,
  onChanged,
}: {
  rides: UserRide[];
  memberExternalId: string | null;
  displayName: string;
  onOpenForm: () => void;
  onEdit: (data: RideLogEditData) => void;
  onError: (message: string) => void;
  onChanged: () => Promise<void>;
}) {
  const { confirmAction } = useActionDialog();

  const removeRide = async (ride: UserRide) => {
    if (!memberExternalId || ride.source_type === "official_agenda") return;

    const confirmed = await confirmAction({
      title: "Hapus catatan riding?",
      description: `Catatan "${ride.title || "Riding"}" akan dihapus permanen.`,
      confirmLabel: "Hapus Catatan",
      cancelLabel: "Batal",
      destructive: true,
    });
    if (!confirmed) return;

    onError("");
    try {
      await deleteRideLog(ride.id, memberExternalId);
      await onChanged();
    } catch (cause) {
      onError(
        cause instanceof Error ? cause.message : "Gagal menghapus catatan riding.",
      );
    }
  };

  return (
    <section className="card">
      <div className="section-title">
        <span>
          <em>Riwayat riding</em>
          <h3>Riwayat Riding Saya</h3>
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--muted)",
            fontWeight: 700,
          }}
        >
          {rides.length} catatan tersimpan
        </span>
      </div>

      {!memberExternalId ? (
        <p className="system-message">
          Silakan masuk dengan akun member aktif untuk melihat riwayat riding.
        </p>
      ) : rides.length === 0 ? (
        <div style={{ textAlign: "center", padding: "35px 20px" }}>
          <Bike
            size={38}
            color="var(--muted)"
            style={{ margin: "0 auto 10px", opacity: 0.6 }}
          />
          <p
            style={{
              margin: "0 0 12px",
              color: "var(--muted)",
              fontSize: "0.85rem",
            }}
          >
            Belum ada catatan riding yang tersimpan.
          </p>
          <button type="button" className="primary-action" onClick={onOpenForm}>
            + Catat Riding Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {rides.map((ride) => {
            const distance =
              ride.distance_km ??
              Math.max(0, ride.odometer_end - ride.odometer_start);
            const isApproved = ride.status === "approved";
            const isPending = ride.status === "pending";

            return (
              <article
                key={ride.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderTop: "1px solid var(--line)",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "9px",
                      background: isApproved
                        ? "#edf8f1"
                        : isPending
                          ? "#fef3c7"
                          : "#fff0f1",
                      color: isApproved
                        ? "#158050"
                        : isPending
                          ? "#b45309"
                          : "#dc2626",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Route size={18} />
                  </div>

                  <div
                    style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
                  >
                    <b
                      style={{
                        fontSize: "0.84rem",
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ride.title || "Touring Mandiri"}
                    </b>
                    <small
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.68rem",
                        marginTop: "2px",
                      }}
                    >
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
                        new Date(ride.created_at),
                      )}{" "}
                      · Odometer {ride.odometer_start} → {ride.odometer_end}
                    </small>
                    {ride.source_type === "official_agenda" && (
                      <small className="riding-official-source">
                        Official Agenda Distance
                        {ride.counts_as_mandatory ? " · Mandatory Ride" : ""}
                      </small>
                    )}
                    {ride.status === "rejected" && ride.rejection_reason && (
                      <small
                        style={{
                          color: "var(--red)",
                          fontSize: "0.65rem",
                          marginTop: "2px",
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ Alasan: {ride.rejection_reason}
                      </small>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "0.92rem",
                        color: "var(--ink)",
                      }}
                    >
                      {new Intl.NumberFormat("id-ID", {
                        maximumFractionDigits: 1,
                      }).format(distance)} KM
                    </strong>
                    <span
                      style={{
                        fontSize: "var(--rr-type-caption)",
                        fontWeight: 800,
                        borderRadius: "12px",
                        padding: "2px 7px",
                        display: "inline-block",
                        background: isApproved
                          ? "#eaf8f1"
                          : isPending
                            ? "#fef3c7"
                            : "#fff0f1",
                        color: isApproved
                          ? "#137748"
                          : isPending
                            ? "#b45309"
                            : "#b31221",
                        textTransform: "capitalize",
                      }}
                    >
                      {isApproved
                        ? "Disetujui"
                        : isPending
                          ? "Menunggu Validasi"
                          : "Ditolak"}
                    </span>
                  </div>

                  {ride.source_type !== "official_agenda" && (
                    <div className="ride-row-actions">
                      <button
                        type="button"
                        className="ride-row-action"
                        title="Edit catatan ini"
                        aria-label="Edit catatan riding"
                        onClick={() =>
                          onEdit({
                            id: ride.id,
                            memberExternalId,
                            memberName: displayName,
                            title: ride.title || "Touring Mandiri",
                            km: distance,
                            date: ride.created_at
                              ? ride.created_at.slice(0, 10)
                              : new Date().toISOString().slice(0, 10),
                          })
                        }
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className="ride-row-action danger"
                        title="Hapus catatan ini"
                        aria-label="Hapus catatan riding"
                        onClick={() => void removeRide(ride)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
''',
)

write(
    "app/riding/page.tsx",
    r'''
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
''',
)

write(
    "tests/riding-refactor.test.mjs",
    r'''
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const files = {
  page: "app/riding/page.tsx",
  model: "app/riding/riding-model.ts",
  data: "app/riding/riding-data.ts",
  derived: "app/riding/riding-derived.ts",
  summary: "app/riding/riding-summary.tsx",
  form: "app/riding/riding-form.tsx",
  history: "app/riding/riding-history.tsx",
};

test("Riding route stays a thin orchestration layer", async () => {
  const page = await read(files.page);
  const model = await read(files.model);
  const derived = await read(files.derived);

  assert.match(page, /RidingSummary/);
  assert.match(page, /RidingForm/);
  assert.match(page, /RidingHistory/);
  assert.match(page, /fetchRidingSnapshot/);
  assert.match(page, /deriveRidingState/);
  assert.doesNotMatch(page, /type UserRide = \{/);
  assert.doesNotMatch(page, /from\("ride_logs"\)/);
  assert.doesNotMatch(page, /await saveRideLog\(/);
  assert.ok(page.split("\n").length <= 220, "Riding page should remain a thin orchestrator");

  assert.match(model, /export type UserRide = \{/);
  assert.match(model, /export type RidingSnapshot = \{/);
  assert.match(model, /export const eventDate/);
  assert.match(derived, /export function deriveRidingState/);
  assert.match(derived, /export function buildRideRecapText/);
});

test("Riding read and mutation boundaries remain explicit", async () => {
  const data = await read(files.data);
  const form = await read(files.form);
  const history = await read(files.history);
  const service = await read("lib/services/ride-log-service.ts");

  assert.match(data, /from\("events"\)/);
  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("ride_logs"\)/);
  assert.match(form, /await saveRideLog\(/);
  assert.match(history, /await deleteRideLog\(/);
  assert.match(service, /rpc\(\s*"manage_ride_log"/);
  assert.doesNotMatch(form, /from\("ride_logs"\)\.insert/);
  assert.doesNotMatch(history, /from\("ride_logs"\)\.delete/);
});

test("Riding keeps official rides immutable in member history", async () => {
  const history = await read(files.history);

  assert.match(history, /Official Agenda Distance/);
  assert.match(history, /ride\.source_type !== "official_agenda"/);
  assert.match(history, /confirmLabel: "Hapus Catatan"/);
  assert.match(history, /destructive: true/);
});

test("Riding preserves cache, recap, chart, and form contracts", async () => {
  const page = await read(files.page);
  const summary = await read(files.summary);
  const form = await read(files.form);

  assert.match(page, /fetchWithCache<RidingSnapshot>/);
  assert.match(page, /ttlMs: 60_000/);
  assert.match(page, /PageSkeleton title="Memuat Data Catatan Riding\.\.\."/);
  assert.match(summary, /dynamic\(/);
  assert.match(summary, /components\/riding-stat-chart/);
  assert.match(summary, /Ride Recap berhasil disalin/);
  assert.match(form, /JARAK TERHITUNG OTOMATIS/);
  assert.match(form, /SIMPAN & VERIFIKASI SEBAGAI PENGURUS/);
});
''',
)

contract_path = ROOT / "tests/production-contract.test.mjs"
contract = contract_path.read_text()


def set_test_block(name: str, new_block: str) -> None:
    global contract
    marker = f'test("{name}"'
    start = contract.index(marker)
    next_test = contract.find('\n\ntest("', start + len(marker))
    if next_test == -1:
        next_test = len(contract)
    contract = contract[:start] + new_block.strip() + "\n\n" + contract[next_test:].lstrip("\n")


set_test_block(
    "Riding create and review mutations are routed through authorized RPCs",
    r'''
test("Riding create and review mutations are routed through authorized RPCs", async () => {
  const service = await read("lib/services/ride-log-service.ts");
  const ridingPage = await read("app/riding/page.tsx");
  const ridingForm = await read("app/riding/riding-form.tsx");
  const ridingHistory = await read("app/riding/riding-history.tsx");
  const ridingWorkspace = [ridingPage, ridingForm, ridingHistory].join("\n");
  const approval = await read("app/riding/approval/page.tsx");
  const migration = await read(
    "supabase/migrations/20260920153036_extend_ride_log_rpc_flow.sql",
  );

  assert.match(service, /"manage_ride_log"/);
  assert.match(service, /p_event_id:/);
  assert.match(service, /p_odometer_start:/);
  assert.match(service, /p_odometer_end:/);
  assert.match(service, /"review_ride_log"/);

  assert.match(ridingForm, /await saveRideLog\(/);
  assert.doesNotMatch(ridingWorkspace, /from\("ride_logs"\)\.insert/);

  assert.match(approval, /await reviewRideLog\(/);
  assert.doesNotMatch(approval, /from\("ride_logs"\)\.update/);

  assert.match(migration, /target_record\.source_type = 'official_agenda'/);
  assert.match(migration, /Official Agenda Distance hanya dapat diubah melalui sinkronisasi agenda/);
  assert.match(migration, /revoke all on function public\.review_ride_log.*from anon/);
  assert.match(migration, /grant execute on function public\.review_ride_log.*to authenticated/);
});
''',
)

set_test_block(
    "Voyager, Riding, and Garage reuse the shared data cache",
    r'''
test("Voyager, Riding, and Garage reuse the shared data cache", async () => {
  const voyager = await read("app/voyager/page.tsx");
  const riding = await read("app/riding/page.tsx");
  const ridingSummary = await read("app/riding/riding-summary.tsx");
  const garage = await read("app/garage/page.tsx");

  for (const source of [voyager, riding, garage]) {
    assert.match(source, /useDataCache/);
    assert.match(source, /fetchWithCache/);
    assert.match(source, /forceRefresh/);
  }

  assert.match(voyager, /ttlMs: 90_000/);
  assert.match(riding, /ttlMs: 60_000/);
  assert.match(garage, /ttlMs: 90_000/);
  assert.match(ridingSummary, /dynamic\(/);
  assert.match(ridingSummary, /components\/riding-stat-chart/);
});
''',
)

set_test_block(
    "Voyager activity keeps participants, official KM, and media server-authorized",
    r'''
test("Voyager activity keeps participants, official KM, and media server-authorized", async () => {
  const migration = await read("supabase/migrations/20260920121211_add_voyager_activity_system.sql");
  const rideGuard = await read("supabase/migrations/20260920121743_allow_voyager_official_ride_logs.sql");
  const page = await read("app/voyager/page.tsx");
  const data = await read("app/voyager/voyager-data.ts");
  const actions = await read("app/voyager/voyager-actions.ts");
  const manage = await read("app/voyager/voyager-manage-sheet.tsx");
  const voyagerWorkspace = [page, data, actions, manage].join("\n");
  const nav = await read("components/app-shell.tsx");
  const ridingHistory = await read("app/riding/riding-history.tsx");

  assert.match(migration, /create table if not exists public\.event_participants/);
  assert.match(migration, /ride_logs_official_event_member_unique/);
  assert.match(migration, /source_type = 'official_agenda'/);
  assert.match(migration, /create or replace function public\.save_event_activity/);
  assert.match(migration, /create or replace function public\.sync_event_official_rides/);
  assert.match(migration, /'club-activity'/);
  assert.match(migration, /revoke all.*save_event_activity.*anon/);
  assert.match(migration, /revoke all.*sync_event_official_rides.*anon/);

  assert.match(rideGuard, /'voyager'::public\.event_type/);
  assert.match(actions, /rpc\(\s*"save_event_activity"/);
  assert.match(actions, /rpc\(\s*"sync_event_official_rides"/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(actions, /from\("club-activity"\)/);
  assert.match(manage, /Tidak ada minimum KM/);
  assert.ok(!voyagerWorkspace.includes('.from("event_attendance")'));
  assert.ok(!voyagerWorkspace.includes('.from("event_checkin_codes")'));

  assert.match(nav, /\["Voyager", "\/voyager", Route\]/);
  assert.match(ridingHistory, /Official Agenda Distance/);
  assert.match(ridingHistory, /source_type !== "official_agenda"/);
});
''',
)

# Keep destructive-dialog coverage following the Riding delete control after extraction.
marker = '    "app/voyager/voyager-manage-sheet.tsx",\n  ];\n\n  const sources = await Promise.all(files.map(read));\n  const combined = sources.join("\\n");\n\n  assert.doesNotMatch(combined, /window\\.(?:confirm|prompt|alert)\\(/);\n  assert.match(combined, /destructive:\\s*true/);'
replacement = '    "app/voyager/voyager-manage-sheet.tsx",\n    "app/riding/riding-history.tsx",\n  ];\n\n  const sources = await Promise.all(files.map(read));\n  const combined = sources.join("\\n");\n\n  assert.doesNotMatch(combined, /window\\.(?:confirm|prompt|alert)\\(/);\n  assert.match(combined, /destructive:\\s*true/);'
if marker in contract:
    contract = contract.replace(marker, replacement, 1)

contract_path.write_text(contract)

for relative in [
    "scripts/tmp-riding-complete.py",
    ".github/workflows/tmp-riding-complete.yml",
]:
    target = ROOT / relative
    if target.exists():
        target.unlink()
