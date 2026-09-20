/* eslint-disable @next/next/no-img-element */
"use client";

import { Copy, Download, Expand, QrCode, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useId, useRef, useState } from "react";

type CheckinQrProps = {
  code: string;
  eventTitle: string;
  activeUntil: string;
  qrUrl?: string;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function CheckinQr({ code, eventTitle, activeUntil, qrUrl }: CheckinQrProps) {
  const [image, setImage] = useState("");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  const payload = qrUrl || code;

  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(payload, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#141517", light: "#ffffff" },
    }).then((dataUrl) => {
      if (live) setImage(dataUrl);
    });
    return () => {
      live = false;
    };
  }, [payload]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => openerRef.current?.focus());
    };
  }, [open]);

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

  const expiry = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(activeUntil));

  const qrImage = image ? (
    <img src={image} alt={`QR check-in ${eventTitle}`} />
  ) : (
    <QrCode className="qr-loading" aria-label="Membuat QR check-in" />
  );

  return (
    <section className="checkin-qr" aria-label="QR check-in aktif">
      <div className="checkin-qr-preview">{qrImage}</div>
      <div className="checkin-qr-content">
        <em>QR CHECK-IN AKTIF</em>
        <h3>{eventTitle}</h3>
        <code>{code}</code>
        <p>Berlaku sampai {expiry} WIB</p>
        <div className="checkin-qr-actions">
          <button
            ref={openerRef}
            type="button"
            onClick={() => setOpen(true)}
            disabled={!image}
          >
            <Expand aria-hidden="true" />
            Fullscreen
          </button>
          <button type="button" onClick={() => void copyCode()}>
            <Copy aria-hidden="true" />
            {copied ? "Tersalin" : "Salin"}
          </button>
          <button type="button" onClick={download} disabled={!image}>
            <Download aria-hidden="true" />
            Unduh
          </button>
          <button type="button" onClick={() => void share()}>
            <Share2 aria-hidden="true" />
            Bagikan
          </button>
        </div>
      </div>

      {open && (
        <div
          ref={dialogRef}
          className="checkin-qr-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <button
            type="button"
            className="qr-close"
            onClick={() => setOpen(false)}
            aria-label="Tutup QR fullscreen"
          >
            <X aria-hidden="true" />
          </button>
          <div>
            <p>SCAN UNTUK CHECK-IN</p>
            {qrImage}
            <b id={titleId}>{eventTitle}</b>
            <code>{code}</code>
            <small>Berlaku sampai {expiry} WIB</small>
          </div>
        </div>
      )}
    </section>
  );
}
