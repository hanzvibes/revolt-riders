/* eslint-disable @next/next/no-img-element */
"use client";

import { Copy, Download, Expand, QrCode, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

type CheckinQrProps = {
  code: string;
  eventTitle: string;
  activeUntil: string;
  qrUrl?: string;
};

export function CheckinQr({ code, eventTitle, activeUntil, qrUrl }: CheckinQrProps) {
  const [image, setImage] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const payload = qrUrl || code;

  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(payload, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#141517", light: "#ffffff" },
    }).then((dataUrl) => { if (live) setImage(dataUrl); });
    return () => { live = false; };
  }, [payload]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = `qr-checkin-${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "revolt"}.png`;
    link.click();
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check-in ${eventTitle}`,
          text: `Scan atau buka tautan untuk check-in ${eventTitle} (Kode: ${code})`,
          url: qrUrl || undefined,
        });
      } catch {
        await copyCode();
      }
    } else {
      await copyCode();
    }
  };

  const expiry = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(activeUntil));
  const qrImage = image ? <img src={image} alt={`QR check-in ${eventTitle}`} /> : <QrCode className="qr-loading" aria-label="Membuat QR check-in" />;

  return <section className="checkin-qr" aria-label="QR check-in aktif">
    <div className="checkin-qr-preview">{qrImage}</div>
    <div className="checkin-qr-content"><em>QR CHECK-IN AKTIF</em><h3>{eventTitle}</h3><code>{code}</code><p>Berlaku sampai {expiry} WIB</p><div className="checkin-qr-actions"><button onClick={() => setOpen(true)} disabled={!image}><Expand/>Fullscreen</button><button onClick={() => void copyCode()}><Copy/>{copied ? "Tersalin" : "Salin"}</button><button onClick={download} disabled={!image}><Download/>Unduh</button><button onClick={() => void share()}><Share2/>Bagikan</button></div></div>
    {open && <div className="checkin-qr-modal" role="dialog" aria-modal="true" aria-label="QR check-in fullscreen"><button className="qr-close" onClick={() => setOpen(false)} aria-label="Tutup QR fullscreen"><X/></button><div><p>SCAN UNTUK CHECK-IN</p>{qrImage}<b>{eventTitle}</b><code>{code}</code><small>Berlaku sampai {expiry} WIB</small></div></div>}
  </section>;
}
