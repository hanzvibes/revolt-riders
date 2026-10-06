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

type JoinRequestsMobileCardsProps = {
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

export function JoinRequestsMobileCards({
  requests,
  search,
  tab,
  actionLoading,
  onAccept,
  onActivate,
  onReject,
  onDetail,
  onCopyConfirmation,
}: JoinRequestsMobileCardsProps) {
  return (
    <div className="admin-join-cards-mobile">
      {requests.length === 0 ? (
        <section className="empty-state card">
          <UserPlus size={40} style={{ color: "var(--red)", margin: "0 auto 10px" }} />
          <h3>Tidak Ada Data Pendaftaran</h3>
          <p>
            {search
              ? "Tidak ada calon member yang cocok dengan kata kunci pencarian Anda."
              : tab === "pending"
                ? "Bagus! Saat ini tidak ada pendaftaran baru yang menunggu verifikasi."
                : "Belum ada data pendaftar pada kategori status ini."}
          </p>
        </section>
      ) : (
        requests.map((item) => (
          <article key={item.id} className="admin-join-card">
            <div className="admin-join-card-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div className="member-avatar" style={{ width: 38, height: 38, fontSize: "0.72rem", flexShrink: 0 }}>
                  {getInitials(item.full_name)}
                </div>
                <div className="admin-join-card-name-group">
                  <span className="admin-join-card-name">{item.full_name}</span>
                  <span className="admin-join-card-sub">
                    Daftar: {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.created_at))}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {getStatusBadge(item.status)}
                {item.assigned_member_id && (
                  <span className="member-id-tag" style={{ background: "rgba(229, 29, 42, 0.08)", color: "var(--red)", border: "1px solid rgba(229, 29, 42, 0.22)", padding: "1px 6px", borderRadius: 4, fontSize: "0.66rem", fontWeight: 800 }}>
                    {item.assigned_member_id}
                  </span>
                )}
              </div>
            </div>

            <div className="admin-join-card-body">
              <div className="admin-join-card-info-row">
                <MapPin size={13} style={{ color: "var(--red)", flexShrink: 0 }} />
                <span>
                  Domisili: <b>{item.city}</b> (TTL: {item.birth_place},{" "}
                  {item.birth_date
                    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(new Date(item.birth_date))
                    : "-"}
                  )
                </span>
              </div>

              <div className="admin-join-card-info-row" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Phone size={13} style={{ color: "#16a34a", flexShrink: 0 }} />
                  <b>{item.whatsapp}</b>
                </span>
                <a
                  href={`https://instagram.com/${item.instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#e1306c", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  <InstagramIcon size={12} />
                  <span>@{item.instagram.replace(/^@/, "")}</span>
                </a>
              </div>

              {item.status === "accepted" && item.confirmation_token && (
                <div style={{ paddingTop: 4, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Tautan Konfirmasi:</span>
                  <button
                    type="button"
                    onClick={() => onCopyConfirmation(item)}
                    className="join-action-copy"
                  >
                    <Copy size={11} />
                    <span>Salin Link</span>
                  </button>
                </div>
              )}

              {item.status === "confirmed" && (
                <div style={{ fontSize: "0.68rem", color: "#166534", fontWeight: 800 }}>
                  ✓ Calon telah konfirmasi kesiapan bergabung
                </div>
              )}

              {item.status === "rejected" && item.rejection_reason && (
                <div style={{ fontSize: "0.68rem", color: "#dc2626" }}>
                  Alasan: {item.rejection_reason}
                </div>
              )}
            </div>

            <div className="admin-join-card-actions">
              <a
                href={getWhatsAppLink(item)}
                target="_blank"
                rel="noreferrer"
                className="join-action-btn join-action-wa"
                style={{ flex: 1 }}
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </a>

              {item.status === "pending" && (
                <button
                  type="button"
                  onClick={() => void onAccept(item)}
                  disabled={actionLoading}
                  className="join-action-btn join-action-accept"
                  style={{ flex: 1.2 }}
                >
                  <Check size={14} />
                  <span>Setujui</span>
                </button>
              )}

              {(item.status === "confirmed" || item.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => onActivate(item)}
                  disabled={actionLoading}
                  className="join-action-btn join-action-activate"
                  style={{ flex: 1.2 }}
                >
                  <Sparkles size={14} />
                  <span>Aktivasi</span>
                </button>
              )}

              {(item.status === "pending" || item.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => onReject(item)}
                  disabled={actionLoading}
                  className="join-action-btn join-action-reject"
                >
                  Tolak
                </button>
              )}

              <button
                type="button"
                onClick={() => onDetail(item)}
                className="join-action-btn join-action-detail"
                aria-label="Lihat detail lengkap"
              >
                <Eye size={15} />
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
