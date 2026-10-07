"use client";

import { CountUpNumber } from "@/components/count-up-number";
import { ModalSheet } from "@/components/modal-sheet";
import {
  RideLogEditModal,
  type RideLogEditData,
} from "@/components/ride-log-edit-modal";
import {
  Compass,
  Gauge,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  MemberDisplay,
  TouringItem,
} from "./member-data";
import {
  getMemberInitials,
  getMemberRoleClass,
} from "./member-model";

export function MemberDetailSheet({
  selectedMember,
  sheetOpen,
  touringRecords,
  loadingTouring,
  touringError,
  canEditTouring,
  editModalOpen,
  editModalData,
  onClose,
  onEditModalOpenChange,
  onCreateTour,
  onEditTour,
  onRemoveTour,
  onTourUpdated,
}: {
  selectedMember: MemberDisplay | null;
  sheetOpen: boolean;
  touringRecords: TouringItem[];
  loadingTouring: boolean;
  touringError: string;
  canEditTouring: boolean;
  editModalOpen: boolean;
  editModalData: RideLogEditData | null;
  onClose: () => void;
  onEditModalOpenChange: (open: boolean) => void;
  onCreateTour: () => void;
  onEditTour: (item: TouringItem) => void;
  onRemoveTour: (item: TouringItem) => Promise<void>;
  onTourUpdated: (newTotalKm?: number) => void;
}) {
  return (
    <>
      <ModalSheet
        open={sheetOpen}
        onClose={onClose}
        eyebrow="REVOLT RIDERS · PROFIL"
        title={
          selectedMember
            ? (selectedMember.nickname || selectedMember.full_name) +
              " (" +
              selectedMember.member_external_id +
              ")"
            : "Detail Member"
        }
      >
        {selectedMember ? (
          <div className="member-detail-sheet-content">
            <div className="member-detail-hero">
              <div className="member-detail-avatar">
                {getMemberInitials(
                  selectedMember.full_name,
                  selectedMember.nickname,
                )}
              </div>
              <div className="member-detail-hero-info">
                <div className="member-detail-title-row">
                  <h3 className="member-detail-name">
                    {selectedMember.full_name}
                  </h3>
                  <span
                    className={
                      "member-role-badge " +
                      getMemberRoleClass(selectedMember.club_role)
                    }
                  >
                    {selectedMember.club_role || "Member"}
                  </span>
                </div>
                <span className="member-detail-sub">
                  <span className="member-id-tag">
                    {selectedMember.member_external_id}
                  </span>
                  {selectedMember.nickname ? (
                    <span>
                      &bull; Panggilan:{" "}
                      <b>{selectedMember.nickname}</b>
                    </span>
                  ) : null}
                  {selectedMember.city ? (
                    <span>&bull; {selectedMember.city}</span>
                  ) : null}
                  {selectedMember.motorcycle ? (
                    <span>&bull; {selectedMember.motorcycle}</span>
                  ) : null}
                </span>
              </div>
            </div>

            <div className="member-detail-stats-grid">
              <div className="member-detail-stat-box">
                <Gauge />
                <span>
                  <small>Total Kilometer</small>
                  <b>
                    <CountUpNumber
                      value={selectedMember.total_km}
                      maximumFractionDigits={1}
                      suffix=" KM"
                    />
                  </b>
                </span>
              </div>
              <div className="member-detail-stat-box">
                <Compass />
                <span>
                  <small>Riwayat Sowan / Agenda</small>
                  <b>
                    <CountUpNumber
                      value={touringRecords.length}
                      suffix=" Agenda"
                    />
                  </b>
                </span>
              </div>
            </div>

            <div className="member-detail-bio-card">
              <dl className="member-detail-bio-list">
                <div className="member-detail-bio-item">
                  <dt>Domisili / Kota</dt>
                  <dd>{selectedMember.city || "Situbondo"}</dd>
                </div>
                <div className="member-detail-bio-item">
                  <dt>Kendaraan / Motor</dt>
                  <dd>
                    {selectedMember.motorcycle || "Belum dicatat"}
                  </dd>
                </div>
                <div className="member-detail-bio-item">
                  <dt>Bergabung Sejak</dt>
                  <dd>
                    {selectedMember.join_date_label || "Anggota Resmi"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="member-touring-section">
              <div className="member-touring-header">
                <h4>Riwayat Touring & Sowan Terverifikasi</h4>
                <div className="member-touring-header-actions">
                  <span className="member-touring-count-badge">
                    {touringRecords.length} Kegiatan
                  </span>
                  {canEditTouring ? (
                    <button
                      type="button"
                      className="member-add-tour-btn"
                      onClick={onCreateTour}
                    >
                      <Plus /> Tambah
                    </button>
                  ) : null}
                </div>
              </div>

              {touringError ? (
                <p className="error-message" role="alert">
                  {touringError}
                </p>
              ) : loadingTouring ? (
                <p className="system-message" role="status">
                  Memuat riwayat kegiatan…
                </p>
              ) : touringRecords.length === 0 ? (
                <p className="system-message">
                  Belum ada catatan touring resmi atau check-in yang terdata di Supabase untuk member ini.
                </p>
              ) : (
                <div className="member-touring-table-wrap">
                  <table className="member-touring-table">
                    <thead>
                      <tr>
                        <th style={{ width: "38px" }}>No</th>
                        <th>Kegiatan / Destinasi</th>
                        <th style={{ textAlign: "right" }}>Jarak</th>
                        {canEditTouring ? (
                          <th style={{ width: "68px", textAlign: "right" }}>
                            Aksi
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {touringRecords.map((item) => (
                        <tr key={item.id}>
                          <td style={{ color: "var(--muted)", fontWeight: 700 }}>
                            {item.no}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "6px",
                                alignItems: "center",
                                marginTop: "2px",
                              }}
                            >
                              {item.date ? (
                                <small
                                  style={{
                                    color: "var(--muted)",
                                    fontSize: "var(--rr-type-caption)",
                                  }}
                                >
                                  {new Intl.DateTimeFormat("id-ID", {
                                    dateStyle: "medium",
                                  }).format(new Date(item.date))}
                                </small>
                              ) : null}
                              {item.odometer_start !== null &&
                              item.odometer_end !== null &&
                              item.odometer_start !== undefined &&
                              item.odometer_end !== undefined ? (
                                <small
                                  style={{
                                    color: "#6c757d",
                                    fontSize: "var(--rr-type-caption)",
                                    background: "#f8f9fa",
                                    padding: "0 4px",
                                    borderRadius: "3px",
                                    border: "1px solid #e9ecef",
                                  }}
                                >
                                  Odo: {item.odometer_start} → {item.odometer_end}
                                </small>
                              ) : null}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {item.km !== null ? (
                              <span className="member-touring-km-tag">
                                {new Intl.NumberFormat("id-ID", {
                                  maximumFractionDigits: 1,
                                }).format(item.km)}{" "}
                                km
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>—</span>
                            )}
                          </td>
                          {canEditTouring ? (
                            <td className="member-tour-action-cell">
                              {item.source === "ride_log" ? (
                                <div className="member-tour-action-group">
                                  <button
                                    type="button"
                                    className="member-tour-action"
                                    title="Edit riwayat touring"
                                    onClick={() => onEditTour(item)}
                                  >
                                    <Pencil />
                                  </button>
                                  <button
                                    type="button"
                                    className="member-tour-action delete"
                                    title="Hapus riwayat touring"
                                    onClick={() => void onRemoveTour(item)}
                                  >
                                    <Trash2 />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  title="Berasal dari check-in agenda"
                                  style={{
                                    fontSize: "var(--rr-type-caption)",
                                    color: "var(--muted)",
                                  }}
                                >
                                  Check-in
                                </span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </ModalSheet>

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => onEditModalOpenChange(false)}
        data={editModalData}
        onSaved={onTourUpdated}
        onDeleted={onTourUpdated}
      />
    </>
  );
}
