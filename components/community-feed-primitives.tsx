"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type CommunityFeedMedia = {
  id: string;
  object_path: string;
  alt_text: string;
  sort_order: number;
  signedUrl?: string;
};

export type CommunityFeedEvent = {
  id: string;
  title: string;
  slug: string;
  type: string;
  location_name: string | null;
  start_at: string;
  status: "published" | "completed";
};

export function OfficialFeedAvatar({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`community-avatar community-avatar-logo${small ? " small" : ""}`}
      aria-hidden="true"
    >
      <Image
        src="/revolt-riders-logo.jpg"
        alt=""
        fill
        sizes={small ? "30px" : "42px"}
      />
    </span>
  );
}

export function CommunityAgendaAttachment({
  event,
}: {
  event: CommunityFeedEvent;
}) {
  const date = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(event.start_at));

  return (
    <Link className="community-agenda-attachment" href={`/agenda#${event.slug}`}>
      <span className="community-agenda-icon" aria-hidden="true">
        <CalendarDays />
      </span>
      <span className="community-agenda-copy">
        <small>{event.type}</small>
        <strong>{event.title}</strong>
        <span>
          <time dateTime={event.start_at}>{date} WIB</time>
          <em aria-hidden="true">·</em>
          <span>
            <MapPin aria-hidden="true" />
            {event.location_name || "Lokasi menyusul"}
          </span>
        </span>
      </span>
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}

export function CommunityMediaGallery({
  media,
}: {
  media: CommunityFeedMedia[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visible = media.slice(0, 4);
  const activeMedia = activeIndex === null ? null : media[activeIndex];

  const closeViewer = useCallback(() => setActiveIndex(null), []);
  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return current === 0 ? media.length - 1 : current - 1;
    });
  }, [media.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return current === media.length - 1 ? 0 : current + 1;
    });
  }, [media.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
      if (event.key === "ArrowLeft" && media.length > 1) showPrevious();
      if (event.key === "ArrowRight" && media.length > 1) showNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activeIndex,
    closeViewer,
    media.length,
    showNext,
    showPrevious,
  ]);

  if (media.length === 0) return null;

  return (
    <>
      <div
        className={`community-feed-media count-${visible.length}`}
        aria-label={`${media.length} foto dokumentasi`}
      >
        {visible.map((item, index) => (
          <figure key={item.id} className={index === 0 ? "feature" : ""}>
            <button
              type="button"
              className="community-media-open"
              onClick={() => setActiveIndex(index)}
              aria-label={`Buka foto ${index + 1} dari ${media.length}`}
            >
              {item.signedUrl ? (
                <Image
                  src={item.signedUrl}
                  alt={item.alt_text}
                  fill
                  sizes="(max-width: 720px) 100vw, 660px"
                />
              ) : (
                <span
                  className="community-feed-media-placeholder"
                  aria-hidden="true"
                />
              )}
              {index === 3 && media.length > 4 ? (
                <b>+{media.length - 4}</b>
              ) : null}
            </button>
          </figure>
        ))}
      </div>

      {activeMedia?.signedUrl ? (
        <div
          className="community-media-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${activeIndex! + 1} dari ${media.length}`}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeViewer();
          }}
        >
          <header>
            <span>{activeIndex! + 1} / {media.length}</span>
            <button
              type="button"
              onClick={closeViewer}
              aria-label="Tutup foto"
              autoFocus
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="community-media-viewer-stage">
            {media.length > 1 ? (
              <button
                type="button"
                className="community-media-viewer-nav previous"
                onClick={showPrevious}
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            ) : null}

            <figure>
              <Image
                src={activeMedia.signedUrl}
                alt={activeMedia.alt_text}
                fill
                sizes="100vw"
                priority
              />
            </figure>

            {media.length > 1 ? (
              <button
                type="button"
                className="community-media-viewer-nav next"
                onClick={showNext}
                aria-label="Foto berikutnya"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
