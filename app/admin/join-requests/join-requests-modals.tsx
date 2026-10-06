import { ModalSheet } from "@/components/modal-sheet";
import { Check, Clock, MessageCircle, Sparkles, UsersRound } from "lucide-react";
import type { JoinRequest } from "./join-requests-model";
import { getInitials } from "./join-requests-model";
import { getStatusBadge, getWhatsAppLink } from "./join-requests-view";

type JoinRequestsModalsProps = {
  detailItem: JoinRequest | null;
  rejectItem: JoinRequest | null;
  rejectReason: string;
  activateItem: JoinRequest | null;
  suggestedMemberId: string;
  customMemberId: string;
  actionLoading: boolean;
  onCloseDetail: () => void;
  onAcceptDetail: (item: JoinRequest) => Promise<void>;
  onRejectFromDetail: (item: JoinRequest) => void;
  onActivateFromDetail: (item: JoinRequest) => void;
  onCloseReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onReject: () => void | Promise<void>;
  onCloseActivate: () => void;
  onCustomMemberIdChange: (value: string) => void;
  onActivate: () => void | Promise<void>;
};

export function JoinRequestsModals({
  detailItem,
  rejectItem,
  rejectReason,
  activateItem,
  suggestedMemberId,
  customMemberId,
  actionLoading,
  onCloseDetail,
  onAcceptDetail,
  onRejectFromDetail,
  onActivateFromDetail,
  onCloseReject,
  onRejectReasonChange,
  onReject,
  onCloseActivate,
  onCustomMemberIdChange,
  onActivate,
}: JoinRequestsModalsProps) {
  return (
    <>
      {detailItem && (
        <ModalSheet
          open={Boolean(detailItem)}
          onClose={onCloseDetail}
          eyebrow="DETAIL CALON MEMBER"
          title="Informasi Lengkap Pendaftaran"
        >
          <div className="join-detail-container">
            <div className="join-detail-hero">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="member-avatar" style={{ width: 44, height: 44, fontSize: "0.85rem" }}>
                  {getInitials(detailItem.full_name)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>{detailItem.full_name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    {getStatusBadge(detailItem.status)}
                    {detailItem.assigned_member_id && (
                      <span className="member-id-tag" style={{ background: "rgba(229, 29, 42, 0.08)", color: "var(--red)", border: "1px solid rgba(229, 29, 42, 0.22)", padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 800 }}>
                        {detailItem.assigned_member_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="join-detail-sections">
              <div className="join-detail-box">
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--ink)", paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 5 }}>
                  <UsersRound size={13} style={{ color: "var(--red)" }} />
                  <span>IDENTITAS PRIBADI</span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Tempat, Tanggal Lahir</span>
                  <span className="join-detail-val">
                    {detailItem.birth_place},{" "}
                    {detailItem.birth_date
                      ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(detailItem.birth_date))
                      : "—"}
                  </span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Domisili / Kota</span>
                  <span className="join-detail-val">{detailItem.city}</span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Nomor WhatsApp</span>
                  <span className="join-detail-val" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {detailItem.whatsapp}
                    <a
                      href={getWhatsAppLink(detailItem)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#16a34a", fontWeight: 800, fontSize: "0.72rem", textDecoration: "none" }}
                    >
                      Chat WA ↗
                    </a>
                  </span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Akun Instagram</span>
                  <span className="join-detail-val">
                    <a
                      href={`https://instagram.com/${detailItem.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#e1306c", fontWeight: 800, textDecoration: "none" }}
                    >
                      @{detailItem.instagram.replace(/^@/, "")} ↗
                    </a>
                  </span>
                </div>
              </div>

              <div className="join-detail-box">
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--ink)", paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={13} style={{ color: "var(--red)" }} />
                  <span>RIWAYAT STATUS SELEKSI</span>
                </div>

                <div className="join-detail-row">
                  <span className="join-detail-label">Waktu Registrasi Masuk</span>
                  <span className="join-detail-val" style={{ color: "#475569" }}>
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.created_at))} WIB
                  </span>
                </div>

                {detailItem.accepted_at && (
                  <div className="join-detail-row">
                    <span className="join-detail-label">Disetujui Pengurus Pada</span>
                    <span className="join-detail-val" style={{ color: "#1e40af" }}>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.accepted_at))} WIB
                    </span>
                  </div>
                )}

                {detailItem.confirmed_at && (
                  <div className="join-detail-row">
                    <span className="join-detail-label">Konfirmasi Komitmen Calon</span>
                    <span className="join-detail-val" style={{ color: "#166534" }}>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.confirmed_at))} WIB
                    </span>
                  </div>
                )}

                {detailItem.activated_at && (
                  <div className="join-detail-row">
                    <span className="join-detail-label">Diresmikan Sebagai Member</span>
                    <span className="join-detail-val" style={{ color: "#86198f" }}>
                      {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(detailItem.activated_at))} WIB
                    </span>
                  </div>
                )}

                {detailItem.rejection_reason && (
                  <div className="join-detail-row">
                    <span className="join-detail-label" style={{ color: "#dc2626" }}>Alasan Penolakan</span>
                    <span className="join-detail-val" style={{ color: "#b91c1c" }}>
                      {detailItem.rejection_reason}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="join-detail-modal-footer">
              <button
                type="button"
                onClick={onCloseDetail}
                className="join-action-btn join-action-detail"
              >
                Tutup
              </button>

              <a
                href={getWhatsAppLink(detailItem)}
                target="_blank"
                rel="noreferrer"
                className="join-action-btn join-action-wa"
              >
                <MessageCircle size={14} />
                <span>Chat WhatsApp</span>
              </a>

              {(detailItem.status === "pending" || detailItem.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => onRejectFromDetail(detailItem)}
                  disabled={actionLoading}
                  className="join-action-btn join-action-reject"
                >
                  Tolak
                </button>
              )}

              {detailItem.status === "pending" && (
                <button
                  type="button"
                  onClick={() => void onAcceptDetail(detailItem)}
                  disabled={actionLoading}
                  className="join-action-btn join-action-accept"
                >
                  <Check size={14} />
                  <span>Setujui Pendaftaran</span>
                </button>
              )}

              {(detailItem.status === "confirmed" || detailItem.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => onActivateFromDetail(detailItem)}
                  disabled={actionLoading}
                  className="join-action-btn join-action-activate"
                >
                  <Sparkles size={14} />
                  <span>Aktivasi Member Resmi</span>
                </button>
              )}
            </div>
          </div>
        </ModalSheet>
      )}

      {rejectItem && (
        <ModalSheet
          open={Boolean(rejectItem)}
          onClose={onCloseReject}
          eyebrow="TOLAK PENDAFTARAN"
          title="Konfirmasi Penolakan"
        >
          <div style={{ fontSize: "0.82rem" }}>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "0 0 14px" }}>
              Apakah Anda yakin ingin menolak permohonan dari <b>{rejectItem.full_name}</b>? Pendaftar yang ditolak dapat
              mengajukan pendaftaran ulang di kemudian hari.
            </p>

            <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, marginBottom: 6 }}>
              Alasan Penolakan (Opsional):
            </label>
            <textarea
              value={rejectReason}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              placeholder="Contoh: Nomor WhatsApp tidak dapat dihubungi atau data belum lengkap."
              style={{
                width: "100%",
                minHeight: 80,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "10px",
                marginBottom: 20,
              }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onCloseReject}
                style={{
                  background: "#f1f5f9",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void onReject()}
                disabled={actionLoading}
                style={{
                  background: "#dc2626",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {actionLoading ? "Memproses…" : "Ya, Tolak Permohonan"}
              </button>
            </div>
          </div>
        </ModalSheet>
      )}

      {activateItem && (
        <ModalSheet
          open={Boolean(activateItem)}
          onClose={onCloseActivate}
          eyebrow="AKTIVASI ANGGOTA RESMI"
          title="Penerbitan ID RR"
        >
          <div style={{ fontSize: "0.82rem" }}>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "0 0 14px" }}>
              Calon anggota <b>{activateItem.full_name}</b> akan resmi didaftarkan ke basis data keanggotaan Revolt Riders.
              Data akan otomatis tampil di Statistik Club, Direktori Member, dan Klasemen Leaderboard.
            </p>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, marginBottom: 6, color: "#334155" }}>
                Nomor Anggota (ID RR Resmi):
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={customMemberId}
                  onChange={(event) => onCustomMemberIdChange(event.target.value.toUpperCase())}
                  placeholder="RR-028"
                  style={{
                    flex: 1,
                    border: "1.5px solid var(--red)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                />
              </div>
              <small style={{ color: "#64748b", marginTop: 5, display: "block" }}>
                Saran sistem nomor urut berikutnya: <b>{suggestedMemberId}</b>. Anda dapat mengubah nomor jika diperlukan.
              </small>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onCloseActivate}
                style={{
                  background: "#f1f5f9",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void onActivate()}
                disabled={actionLoading}
                style={{
                  background: "var(--red)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 8,
                  padding: "9px 20px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} />
                <span>{actionLoading ? "Mengaktivasi…" : "AKTIFKAN RESMI"}</span>
              </button>
            </div>
          </div>
        </ModalSheet>
      )}
    </>
  );
}
