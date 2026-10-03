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
