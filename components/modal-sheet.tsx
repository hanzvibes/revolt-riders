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

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closing) {
          setClosing(true);
          window.setTimeout(() => {
            setClosing(false);
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
      setDragOffset(0);
      setIsDragging(false);
      onClose();
    }, 220);
  };

  const finishDrag = () => {
    setIsDragging(false);
    dragStart.current = null;
    if (dragOffset > 60) {
      requestClose();
    } else {
      setDragOffset(0);
    }
  };

  const getSheetStyle = () => {
    if (closing) {
      return {
        transform: "translateY(100%)",
        transition: "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease-in",
        opacity: 0,
      };
    }
    if (isDragging) {
      return {
        transform: `translateY(${dragOffset}px)`,
        transition: "none",
      };
    }
    if (dragOffset === 0) {
      return {
        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      };
    }
    return undefined;
  };

  return (
    <div
      className="native-sheet-backdrop"
      data-state={closing ? "closed" : "open"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <section
        className="native-sheet"
        data-state={closing ? "closed" : "open"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        style={getSheetStyle()}
      >
        <button
          className="native-sheet-handle"
          type="button"
          aria-label="Geser ke bawah untuk menutup"
          onTouchStart={(event) => {
            dragStart.current = event.touches[0]?.clientY ?? null;
            setIsDragging(true);
          }}
          onTouchMove={(event) => {
            if (dragStart.current !== null) {
              const delta = Math.max(0, event.touches[0].clientY - dragStart.current);
              setDragOffset(delta);
            }
          }}
          onTouchEnd={finishDrag}
          onTouchCancel={finishDrag}
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

