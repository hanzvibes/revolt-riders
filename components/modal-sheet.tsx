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
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closing) {
          setClosing(true);
          window.setTimeout(() => {
            setClosing(false);
            dragOffsetRef.current = 0;
            setDragOffset(0);
            setIsDragging(false);
            onClose();
          }, 220);
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closing, onClose, open]);

  if (!open) return null;

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setIsDragging(false);
      onClose();
    }, 220);
  };

  const finishDrag = () => {
    const finalOffset = dragOffsetRef.current;
    setIsDragging(false);
    dragStart.current = null;

    if (finalOffset > 60) {
      requestClose();
      return;
    }

    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  const getSheetStyle = () => {
    if (closing) {
      return {
        transform: "translate3d(0, calc(100% + 24px), 0)",
        transition: "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease-in",
        opacity: 0,
      };
    }
    if (isDragging) {
      return {
        transform: `translate3d(0, ${dragOffset}px, 0)`,
        transition: "none",
      };
    }
    return {
      transform: "translate3d(0, 0, 0)",
      transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    };
  };

  return (
    <div
      className="native-sheet-backdrop"
      data-state={closing ? "closed" : "open"}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        className="native-sheet"
        data-state={closing ? "closed" : "open"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
        style={getSheetStyle()}
      >
        <button
          className="native-sheet-handle"
          type="button"
          aria-label="Geser ke bawah untuk menutup"
          onPointerDown={(event) => {
            if (closing || (event.pointerType === "mouse" && event.button !== 0)) return;
            dragStart.current = event.clientY;
            dragOffsetRef.current = dragOffset;
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDragging(true);
          }}
          onPointerMove={(event) => {
            if (dragStart.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) {
              return;
            }
            const delta = Math.max(0, event.clientY - dragStart.current);
            dragOffsetRef.current = delta;
            setDragOffset(delta);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            finishDrag();
          }}
          onPointerCancel={finishDrag}
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

