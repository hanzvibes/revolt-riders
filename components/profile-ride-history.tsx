"use client";

import { useActionDialog } from "@/components/action-dialog-provider";
import {
  RideLogEditModal,
  type RideLogEditData,
} from "@/components/ride-log-edit-modal";
import type { MemberAccess } from "@/context/data-cache-context";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { Pencil, Plus, Route, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ProfileActivityEvent,
  ProfileRide,
} from "./profile-data";

export function ProfileRideHistory({
  account,
  displayName,
  rides,
  activityEvents,
  onRideUpdated,
}: {
  account: MemberAccess;
  displayName: string;
  rides: ProfileRide[];
  activityEvents: ProfileActivityEvent[];
  onRideUpdated: () => Promise<void>;
}) {
  const { confirmAction } = useActionDialog();
  const [rideActionError, setRideActionError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] =
    useState<RideLogEditData | null>(null);

  const eventTitleById = useMemo(
    () =>
      new Map(
        activityEvents.map((event) => [event.id, event.title]),
      ),
    [activityEvents],
  );

  const openCreateRide = () => {
    setRideActionError("");
    setEditModalData({
      memberExternalId: account.member_external_id,
      memberName: displayName,
      title: "",
      km: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setEditModalOpen(true);
  };

  const openEditRide = (
    ride: ProfileRide,
    displayTitle: string,
  ) => {
    setRideActionError("");
    setEditModalData({
      id: ride.id,
      memberExternalId: account.member_external_id,
      memberName: displayName,
      title: displayTitle,
      km: Number(ride.distance_km || 0),
      date: ride.created_at
        ? ride.created_at.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setEditModalOpen(true);
  };

  const removeRide = async (
    ride: ProfileRide,
    displayTitle: string,
  ) => {
    const confirmed = await confirmAction({
      title: "Hapus catatan riding?",
      description:
        'Catatan "' + displayTitle + '" akan dihapus permanen.',
      confirmLabel: "Hapus Catatan",
      cancelLabel: "Batal",
      destructive: true,
    });

    if (!confirmed) return;

    setRideActionError("");

    try {
      await deleteRideLog(
        ride.id,
        account.member_external_id,
      );
      await onRideUpdated();
    } catch (caught) {
      setRideActionError(
        caught instanceof Error
          ? caught.message
          : "Gagal menghapus catatan riding.",
      );
    }
  };

  return (
    <>
      <section
        id="profile-activity"
        className="card profile-social-feed"
      >
        <div
          className="section-title"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span>
            <em>Riding & sowan</em>
            <h3>
              Riwayat Touring / Sowan ({rides.length})
            </h3>
          </span>
          <button
            type="button"
            className="primary-action"
            onClick={openCreateRide}
            style={{ paddingInline: "14px" }}
          >
            <Plus size={14} /> Catat Riwayat
          </button>
        </div>

        {rideActionError ? (
          <p className="error-message" role="alert">
            {rideActionError}
          </p>
        ) : null}

        {rides.length === 0 ? (
          <p className="system-message">
            Belum ada riwayat sowan / ride log yang dicatat.
          </p>
        ) : (
          <div
            className="activity-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {rides.map((ride) => {
              const eventTitle = ride.event_id
                ? eventTitleById.get(ride.event_id)
                : null;
              const displayTitle =
                ride.title || eventTitle || "Ride Mandiri";
              const isApproved = ride.status === "approved";
              const isPending = ride.status === "pending";

              return (
                <article
                  key={ride.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 12px",
                    borderTop: "1px solid var(--line)",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <i
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
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
                      <Route size={16} />
                    </i>

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.82rem",
                        }}
                      >
                        {displayTitle}
                      </b>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          alignItems: "center",
                          marginTop: "2px",
                        }}
                      >
                        <small
                          style={{
                            color: "var(--muted)",
                            fontSize: "0.68rem",
                          }}
                        >
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                          }).format(new Date(ride.created_at))}
                          {" · "}
                          {new Intl.NumberFormat("id-ID", {
                            maximumFractionDigits: 1,
                          }).format(
                            Number(ride.distance_km || 0),
                          )}{" "}
                          KM
                        </small>

                        {ride.odometer_start !== null &&
                        ride.odometer_end !== null ? (
                          <small
                            style={{
                              color: "#6c757d",
                              fontSize:
                                "var(--rr-type-caption)",
                              background: "#f1f3f5",
                              padding: "1px 5px",
                              border: "1px solid #e9ecef",
                              borderRadius: "4px",
                            }}
                          >
                            Odo {ride.odometer_start} →{" "}
                            {ride.odometer_end}
                          </small>
                        ) : null}

                        {eventTitle ? (
                          <small
                            style={{
                              color: "var(--red)",
                              fontSize:
                                "var(--rr-type-caption)",
                              background: "#fff5f5",
                              padding: "1px 5px",
                              border: "1px solid #ffe3e3",
                              borderRadius: "4px",
                              fontWeight: 700,
                            }}
                          >
                            {eventTitle}
                          </small>
                        ) : null}
                      </div>

                      {ride.status === "rejected" &&
                      ride.rejection_reason ? (
                        <small
                          style={{
                            color: "#dc1b2a",
                            display: "block",
                            marginTop: "4px",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                          }}
                        >
                          ⚠️ Alasan ditolak:{" "}
                          {ride.rejection_reason}
                        </small>
                      ) : null}
                    </span>
                  </div>

                  <div className="profile-ride-controls">
                    {!isApproved ? (
                      <span
                        className={
                          "profile-ride-status " +
                          (isPending
                            ? "pending"
                            : "rejected")
                        }
                      >
                        {isPending ? "Pending" : "Ditolak"}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      className="profile-ride-action"
                      title="Edit catatan ini"
                      aria-label={
                        "Edit catatan " + displayTitle
                      }
                      onClick={() =>
                        openEditRide(ride, displayTitle)
                      }
                    >
                      <Pencil aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="profile-ride-action delete"
                      title="Hapus catatan ini"
                      aria-label={
                        "Hapus catatan " + displayTitle
                      }
                      onClick={() =>
                        void removeRide(ride, displayTitle)
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editModalData}
        onSaved={() => void onRideUpdated()}
        onDeleted={() => void onRideUpdated()}
      />
    </>
  );
}
