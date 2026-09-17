"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function ModalSheet({ open, onClose, eyebrow, title, children }: { open: boolean; onClose: () => void; eyebrow: string; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose, open]);

  if (!open) return null;
  return <div className="native-sheet-backdrop" onMouseDown={onClose}>
    <section className="native-sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
      <header><span><em>{eyebrow}</em><h2>{title}</h2></span><button type="button" onClick={onClose} aria-label="Tutup"><X/></button></header>
      <div className="native-sheet-body">{children}</div>
    </section>
  </div>;
}
