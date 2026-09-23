"use client";

import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Route,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  end_at?: string | null;
  status: "published" | "completed";
  counts_as_mandatory?: boolean;
  official_distance_km?: number | string | null;
  official_support?: string | null;
  activity_summary?: string | null;
  completed_at?: string | null;
  participantCount?: number;
  photoCount?: number;
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

export function CommunityVoyagerAttachment({
  event,
}: {
  event: CommunityFeedEvent;
}) {
  const formatPeriodDate = (value: string) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value));

  const period = event.end_at
    ? `${formatPeriodDate(event.start_at)} – ${formatPeriodDate(event.end_at)}`
    : formatPeriodDate(event.start_at);

  const participantCount = event.participantCount ?? 0;
  const photoCount = event.photoCount ?? 0;
  const statusLabel =
    event.status === "completed"
      ? "Selesai"
      : photoCount > 0
        ? "Bukti masuk"
        : participantCount > 0
          ? "Peserta tercatat"
          : "Aktif";

  return (
    <Link
      className="community-voyager-attachment"
      href={`/voyager#${event.slug}`}
    >
      <span className="community-voyager-head">
        <span className="community-voyager-icon" aria-hidden="true">
          <Route />
        </span>
        <span>
          <small>VOYAGER</small>
          <strong>{event.title}</strong>
        </span>
        <b>{statusLabel}</b>
      </span>

      <span className="community-voyager-meta">
        <span>
          <CalendarDays aria-hidden="true" />
          {period}
        </span>
        <span>
          <MapPin aria-hidden="true" />
          {event.location_name || "Lokasi menyusul"}
        </span>
      </span>

      <span className="community-voyager-progress">
        <span>
          <UsersRound aria-hidden="true" />
          <b>{participantCount}</b>
          <small>peserta</small>
        </span>
        <span>
          <Camera aria-hidden="true" />
          <b>{photoCount}</b>
          <small>bukti foto</small>
        </span>
        {event.official_distance_km ? (
          <span>
            <Route aria-hidden="true" />
            <b>{Number(event.official_distance_km).toLocaleString("id-ID", {
              maximumFractionDigits: 1,
            })}</b>
            <small>KM resmi</small>
          </span>
        ) : null}
      </span>

      <span className="community-voyager-cta">
        Lihat aktivitas Voyager
        <ChevronRight aria-hidden="true" />
      </span>
    </Link>
  );
}

export function CommunityEventAttachment({
  event,
}: {
  event: CommunityFeedEvent;
}) {
  return event.type === "voyager" ? (
    <CommunityVoyagerAttachment event={event} />
  ) : (
    <CommunityAgendaAttachment event={event} />
  );
}


export function CommunityMediaGallery({
  media,
}: {
  media: CommunityFeedMedia[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeStartRef = useRef<{
    x: number;
    y: number;
    startedAt: number;
    pointerId: number;
  } | null>(null);
  const visible = media.slice(0, 4);
  const activeMedia = activeIndex === null ? null : media[activeIndex];

  const closeViewer = useCallback(() => {
    swipeStartRef.current = null;
    setSwipeOffset(0);
    setSwiping(false);
    setActiveIndex(null);
  }, []);
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

  const resetSwipe = useCallback(() => {
    swipeStartRef.current = null;
    setSwipeOffset(0);
    setSwiping(false);
  }, []);

  const finishSwipe = useCallback(
    (clientX: number) => {
      const start = swipeStartRef.current;
      if (!start) return;

      const distance = clientX - start.x;
      const elapsed = Math.max(1, performance.now() - start.startedAt);
      const velocity = Math.abs(distance) / elapsed;
      const shouldNavigate =
        media.length > 1 &&
        (Math.abs(distance) >= 52 ||
          (Math.abs(distance) >= 28 && velocity >= 0.45));

      if (shouldNavigate) {
        if (distance < 0) showNext();
        else showPrevious();
      }

      resetSwipe();
    },
    [media.length, resetSwipe, showNext, showPrevious],
  );

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
                  unoptimized={item.signedUrl.startsWith("blob:")}
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
            {media.length > 1 ? (
              <span className="sr-only">Geser kiri atau kanan untuk pindah foto.</span>
            ) : null}
            <button
              type="button"
              onClick={closeViewer}
              aria-label="Tutup foto"
              autoFocus
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div
            className={`community-media-viewer-stage${swiping ? " is-swiping" : ""}`}
            onPointerDown={(event) => {
              if (media.length <= 1) return;
              const target = event.target;
              if (
                target instanceof Element &&
                target.closest("button")
              ) {
                return;
              }

              swipeStartRef.current = {
                x: event.clientX,
                y: event.clientY,
                startedAt: performance.now(),
                pointerId: event.pointerId,
              };
              setSwiping(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = swipeStartRef.current;
              if (!start || start.pointerId !== event.pointerId) return;

              const deltaX = event.clientX - start.x;
              const deltaY = event.clientY - start.y;

              if (Math.abs(deltaY) > Math.abs(deltaX) + 18) {
                resetSwipe();
                return;
              }

              if (Math.abs(deltaX) < 4) return;
              setSwipeOffset(Math.max(-110, Math.min(110, deltaX)));
            }}
            onPointerUp={(event) => {
              const start = swipeStartRef.current;
              if (!start || start.pointerId !== event.pointerId) return;
              finishSwipe(event.clientX);
            }}
            onPointerCancel={resetSwipe}
          >
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

            <figure
              className={swiping ? "is-swiping" : ""}
              style={{
                transform: `translate3d(${swipeOffset}px, 0, 0)`,
                opacity: 1 - Math.min(Math.abs(swipeOffset) / 520, 0.16),
              }}
            >
              <Image
                src={activeMedia.signedUrl}
                alt={activeMedia.alt_text}
                fill
                sizes="100vw"
                priority
                unoptimized={activeMedia.signedUrl.startsWith("blob:")}
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
