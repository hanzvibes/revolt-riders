"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function ModalSheet({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 180);
  };
  const finishDrag = () => {
    if (dragOffset > 84) requestClose();
    setDragOffset(0);
    dragStart.current = null;
  };
  return (
    <div
      className="native-sheet-backdrop"
      data-state={closing ? "closed" : "open"}
      onMouseDown={requestClose}
    >
      <section
        className="native-sheet"
        data-state={closing ? "closed" : "open"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        style={
          dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined
        }
      >
        <button
          className="native-sheet-handle"
          type="button"
          aria-label="Geser ke bawah untuk menutup"
          onTouchStart={(event) => {
            dragStart.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(event) => {
            if (dragStart.current !== null)
              setDragOffset(
                Math.max(0, event.touches[0].clientY - dragStart.current),
              );
          }}
          onTouchEnd={finishDrag}
        />
        <header>
          <span>
            <em>{eyebrow}</em>
            <h2>{title}</h2>
          </span>
          <button type="button" onClick={requestClose} aria-label="Tutup">
            <X />
          </button>
        </header>
        <div className="native-sheet-body">{children}</div>
      </section>
    </div>
  );
}
