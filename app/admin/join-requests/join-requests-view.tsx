import type { ReactNode } from "react";
import type { JoinRequest, JoinRequestStatus } from "./join-requests-model";

export const getStatusBadge = (status: JoinRequestStatus): ReactNode => {
  switch (status) {
    case "pending":
      return <span className="join-badge join-badge-pending">Pending</span>;
    case "accepted":
      return <span className="join-badge join-badge-accepted">Accepted</span>;
    case "confirmed":
      return <span className="join-badge join-badge-confirmed">Confirmed</span>;
    case "active":
      return <span className="join-badge join-badge-active">Active</span>;
    case "rejected":
      return <span className="join-badge join-badge-rejected">Rejected</span>;
    case "expired":
      return <span className="join-badge join-badge-expired">Expired</span>;
  }
};

export const getConfirmationLink = (item: JoinRequest, origin: string) =>
  item.confirmation_token ? `${origin}/join/confirm/${item.confirmation_token}` : null;

export const getWhatsAppLink = (item: JoinRequest, customMsg?: string) => {
  let cleanWa = item.whatsapp.replace(/[^0-9]/g, "");
  if (cleanWa.startsWith("08")) cleanWa = "628" + cleanWa.slice(2);

  let defaultMsg = `Halo ${item.full_name}, kami dari Pengurus Revolt Riders Situbondo.`;

  if (item.status === "accepted" && item.confirmation_token) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://revolt-riders.com";
    const confirmUrl = getConfirmationLink(item, origin);
    defaultMsg = `Halo ${item.full_name}! Pendaftaran Anda di Revolt Riders telah DISETUJUI oleh pengurus. Silakan lakukan konfirmasi komitmen bergabung Anda dalam 7 hari melalui tautan resmi berikut:\n\n${confirmUrl}\n\nSalam Satu Aspal!`;
  } else if (item.status === "active" && item.assigned_member_id) {
    defaultMsg = `Selamat bergabung ${item.full_name}! Pendaftaran Anda telah DIRESMIKAN. Nomor Anggota (ID RR) resmi Anda adalah: ${item.assigned_member_id}. Silakan masuk ke Portal Member untuk melengkapi profil motor Anda. Salam Satu Aspal!`;
  }

  return `https://wa.me/${cleanWa}?text=${encodeURIComponent(customMsg || defaultMsg)}`;
};
