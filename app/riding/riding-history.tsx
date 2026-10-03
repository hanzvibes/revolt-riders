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
