import { InstagramIcon } from "@/components/icons/instagram";
import {
  Check,
  Copy,
  Eye,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { JoinRequest, JoinRequestTab } from "./join-requests-model";
import { getInitials } from "./join-requests-model";
import { getStatusBadge, getWhatsAppLink } from "./join-requests-view";

type JoinRequestsDesktopTableProps = {
  requests: JoinRequest[];
  search: string;
  tab: JoinRequestTab;
  actionLoading: boolean;
  onAccept: (item: JoinRequest) => void | Promise<void>;
  onActivate: (item: JoinRequest) => void;
  onReject: (item: JoinRequest) => void;
  onDetail: (item: JoinRequest) => void;
  onCopyConfirmation: (item: JoinRequest) => void;
};

export function JoinRequestsDesktopTable({
  requests,
  search,
  tab,
  actionLoading,
  onAccept,
  onActivate,
  onReject,
  onDetail,
  onCopyConfirmation,
}: JoinRequestsDesktopTableProps) {
  return (
    <div className="admin-member-table-card">
      <div className="admin-member-table-wrap">
        <table className="admin-member-table">
          <thead>
            <tr>
              <th>Calon Member</th>
              <th>Domisili & Instagram</th>
              <th>WhatsApp & Pendaftaran</th>
              <th>Status Verifikasi</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "40px 16px" }}>
                  <UserPlus size={40} style={{ color: "var(--red)", margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--ink)" }}>
                    Tidak Ada Data Pendaftaran
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>
                    {search
                      ? "Tidak ada calon member yang cocok dengan kata kunci pencarian Anda."
                      : tab === "pending"
                        ? "Bagus! Saat ini tidak ada pendaftaran baru yang menunggu verifikasi."
                        : "Belum ada data pendaftar pada kategori status ini."}
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="admin-table-rider-cell">
                      <div className="member-avatar" style={{ width: 34, height: 34, fontSize: "0.68rem" }}>
                        {getInitials(item.full_name)}
                      </div>
                      <div className="admin-table-rider-names">
                        <span className="admin-table-rider-name" title={item.full_name}>
                          {item.full_name}
                        </span>
                        <span className="admin-table-rider-sub">
                          TTL: {item.birth_place},{" "}
                          {item.birth_date
                            ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.birth_date))
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.72rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, color: "#1e293b" }}>
                        <MapPin size={13} style={{ color: "var(--red)", flexShrink: 0 }} />
                        {item.city}
                      </span>
                      <a
                        href={`https://instagram.com/${item.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: "#e1306c",
                          fontWeight: 700,
                          textDecoration: "none",
                        }}
                      >
                        <InstagramIcon size={12} />
                        <span>@{item.instagram.replace(/^@/, "")}</span>
                      </a>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.72rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, color: "#334155" }}>
                        <Phone size={12} style={{ color: "#16a34a", flexShrink: 0 }} />
                        {item.whatsapp}
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: "0.68rem" }}>
                        Daftar: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.created_at))}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {getStatusBadge(item.status)}
                        {item.assigned_member_id && (
                          <span className="member-id-tag" style={{ background: "rgba(229, 29, 42, 0.08)", color: "var(--red)", border: "1px solid rgba(229, 29, 42, 0.22)", padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 800 }}>
                            {item.assigned_member_id}
                          </span>
                        )}
                      </div>

                      {item.status === "accepted" && item.confirmation_token && (
                        <button
                          type="button"
                          onClick={() => onCopyConfirmation(item)}
                          className="join-action-copy"
                          title="Salin tautan konfirmasi pendaftar"
                        >
                          <Copy size={11} />
                          <span>Salin Link</span>
                        </button>
                      )}

                      {item.status === "confirmed" && (
                        <span style={{ fontSize: "0.66rem", color: "#166534", fontWeight: 800 }}>
                          ✓ Komitmen Terkonfirmasi
                        </span>
                      )}

                      {item.status === "rejected" && item.rejection_reason && (
                        <span style={{ fontSize: "0.65rem", color: "#dc2626", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.rejection_reason}>
                          Alasan: {item.rejection_reason}
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      <a
                        href={getWhatsAppLink(item)}
                        target="_blank"
                        rel="noreferrer"
                        className="join-action-btn join-action-wa"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageCircle size={13} />
                        <span>WA</span>
                      </a>

                      {item.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => void onAccept(item)}
                          disabled={actionLoading}
                          className="join-action-btn join-action-accept"
                          title="Setujui pendaftaran calon member"
                        >
                          <Check size={13} />
                          <span>Setujui</span>
                        </button>
                      )}

                      {(item.status === "confirmed" || item.status === "accepted") && (
                        <button
                          type="button"
                          onClick={() => onActivate(item)}
                          disabled={actionLoading}
                          className="join-action-btn join-action-activate"
                          title="Terbitkan nomor ID RR resmi"
                        >
                          <Sparkles size={13} />
                          <span>Aktivasi</span>
                        </button>
                      )}

                      {(item.status === "pending" || item.status === "accepted") && (
                        <button
                          type="button"
                          onClick={() => onReject(item)}
                          disabled={actionLoading}
                          className="join-action-btn join-action-reject"
                          title="Tolak permohonan pendaftaran"
                        >
                          Tolak
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDetail(item)}
                        className="join-action-btn join-action-detail"
                        title="Lihat detail lengkap calon member"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
