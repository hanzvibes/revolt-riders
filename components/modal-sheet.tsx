"use client";

import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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
  const sheetRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const titleId = useId();

  const finishClose = useCallback(() => {
    setClosing(false);
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    onClose();

    window.requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    });
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimerRef.current = window.setTimeout(finishClose, reduceMotion ? 0 : 220);
  }, [closing, finishClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";

    const focusSheet = window.requestAnimationFrame(() => {
      sheetRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.offsetParent !== null,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        sheetRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === sheetRef.current)) {
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
      window.cancelAnimationFrame(focusSheet);
      window.removeEventListener("keydown", onKeyDown);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, requestClose]);

  if (!open) return null;

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
        transition:
          "transform var(--rr-motion-close) var(--rr-ease-in), opacity var(--rr-motion-close) ease-in",
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
      transition: "transform var(--rr-motion-open) var(--rr-ease-out)",
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
        ref={sheetRef}
        className="native-sheet"
        data-state={closing ? "closed" : "open"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
        style={getSheetStyle()}
      >
        <div
          className="native-sheet-handle"
          aria-hidden="true"
          onPointerDown={(event) => {
            if (closing || (event.pointerType === "mouse" && event.button !== 0)) return;
            dragStart.current = event.clientY;
            dragOffsetRef.current = dragOffset;
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDragging(true);
          }}
          onPointerMove={(event) => {
            if (
              dragStart.current === null ||
              !event.currentTarget.hasPointerCapture(event.pointerId)
            ) {
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
            <h2 id={titleId}>{title}</h2>
          </span>
          <button type="button" onClick={requestClose} aria-label="Tutup">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="native-sheet-body">{children}</div>
      </section>
    </div>
  );
}
