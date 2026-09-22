"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ModalSheet } from "@/components/modal-sheet";
import { useDataCache, type AppRole } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Archive,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  ImagePlus,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Sparkles,
  UnlockKeyhole,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type FeedMedia = {
  id: string;
  object_path: string;
  alt_text: string;
  sort_order: number;
  signedUrl?: string;
};

type FeedComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  created_at: string;
};

type FeedEvent = {
  id: string;
  title: string;
  slug: string;
  type: string;
  location_name: string | null;
  start_at: string;
  status: "published" | "completed";
};

type FeedPost = {
  id: string;
  body: string;
  link_url: string | null;
  event_id: string | null;
  attached_event: FeedEvent | null;
  is_pinned: boolean;
  comments_locked: boolean;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  published_at: string | null;
  created_at: string;
  media: FeedMedia[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: FeedComment[];
};

type FeedPostRow = Omit<FeedPost, "media" | "likeCount" | "commentCount" | "likedByMe" | "comments"> & {
  feed_post_media?: FeedMedia[];
  feed_post_likes?: { count: number }[];
  feed_post_comments?: { count: number }[];
};

const STAFF_ROLES: AppRole[] = ["road_captain", "admin", "superadmin"];
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const FEED_PAGE_SIZE = 12;

const roleLabel: Record<AppRole, string> = {
  member: "Member",
  road_captain: "Road Captain",
  treasurer: "Bendahara",
  admin: "Admin",
  superadmin: "Superadmin",
};

function feedErrorMessage(cause: unknown) {
  const message = typeof cause === "object" && cause !== null && "message" in cause
    ? String(cause.message)
    : "";

  if (/permission denied|row-level security|not authorized/i.test(message)) {
    return "Akses feed belum tersedia untuk akun ini. Muat ulang halaman atau hubungi pengurus bila masalah berlanjut.";
  }

  return "Kabar Revolt belum dapat dimuat. Coba muat ulang halaman.";
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) || "RR").toUpperCase();
}

function OfficialFeedAvatar({ small = false }: { small?: boolean }) {
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

function relativeDate(value: string | null) {
  if (!value) return "Baru saja";
  const difference = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function getUrlDetails(value: string) {
  try {
    const url = new URL(value);
    return { hostname: url.hostname.replace(/^www\./, ""), url: url.toString() };
  } catch {
    return null;
  }
}

function PostMediaGrid({ media }: { media: FeedMedia[] }) {
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
  }, [activeIndex, closeViewer, media.length, showNext, showPrevious]);

  if (media.length === 0) return null;

  return (
    <>
      <div className={`community-feed-media count-${visible.length}`} aria-label={`${media.length} foto dokumentasi`}>
        {visible.map((item, index) => (
          <figure key={item.id} className={index === 0 ? "feature" : ""}>
            <button
              type="button"
              className="community-media-open"
              onClick={() => setActiveIndex(index)}
              aria-label={`Buka foto ${index + 1} dari ${media.length}`}
            >
              {item.signedUrl ? (
                <Image src={item.signedUrl} alt={item.alt_text} fill sizes="(max-width: 720px) 100vw, 660px" />
              ) : (
                <span className="community-feed-media-placeholder" aria-hidden="true" />
              )}
              {index === 3 && media.length > 4 && <b>+{media.length - 4}</b>}
            </button>
          </figure>
        ))}
      </div>

      {activeMedia?.signedUrl && (
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
            <button type="button" onClick={closeViewer} aria-label="Tutup foto" autoFocus>
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="community-media-viewer-stage">
            {media.length > 1 && (
              <button type="button" className="community-media-viewer-nav previous" onClick={showPrevious} aria-label="Foto sebelumnya">
                <ChevronLeft aria-hidden="true" />
              </button>
            )}

            <figure>
              <Image
                src={activeMedia.signedUrl}
                alt={activeMedia.alt_text}
                fill
                sizes="100vw"
                priority
              />
            </figure>

            {media.length > 1 && (
              <button type="button" className="community-media-viewer-nav next" onClick={showNext} aria-label="Foto berikutnya">
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="community-feed-skeleton" aria-label="Memuat Feed" aria-live="polite">
      {[0, 1, 2].map((item) => (
        <article className="community-post-skeleton" key={item} aria-hidden="true">
          <header>
            <span className="community-skeleton-avatar" />
            <span>
              <i />
              <i />
            </span>
          </header>
          <div className="community-skeleton-copy">
            <i />
            <i />
            <i />
          </div>
          {item !== 1 ? <div className="community-skeleton-media" /> : null}
          <footer>
            <i />
            <i />
          </footer>
        </article>
      ))}
      <span className="sr-only">Memuat kabar terbaru…</span>
    </div>
  );
}

function FeedAgendaAttachment({ event }: { event: FeedEvent }) {
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
          <span><MapPin aria-hidden="true" />{event.location_name || "Lokasi menyusul"}</span>
        </span>
      </span>
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}

function CommentLine({ comment, canModerate, currentUserId, onDelete }: {
  comment: FeedComment;
  canModerate: boolean;
  currentUserId?: string;
  onDelete: (comment: FeedComment) => void;
}) {
  const canDelete = canModerate || comment.author_id === currentUserId;
  return (
    <article className="community-comment">
      <span className="community-avatar small" aria-hidden="true">{initials(comment.author_name)}</span>
      <div>
        <header>
          <strong>{comment.author_name}</strong>
          <span>{roleLabel[comment.author_role]}</span>
          <time dateTime={comment.created_at}>{relativeDate(comment.created_at)}</time>
        </header>
        <p>{comment.body}</p>
      </div>
      {canDelete && (
        <button className="community-comment-delete" type="button" onClick={() => onDelete(comment)} aria-label={`Hapus komentar ${comment.author_name}`}>
          <X aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

function FeedPostCard({ post, isStaff, currentRole, currentUserId, onToggleLike, onOpenDiscussion, onManage, onDeleteComment }: {
  post: FeedPost;
  isStaff: boolean;
  currentRole?: AppRole;
  currentUserId?: string;
  onToggleLike: (post: FeedPost) => void;
  onOpenDiscussion: (post: FeedPost) => void;
  onManage: (post: FeedPost, action: "pin" | "comments" | "archive") => void;
  onDeleteComment: (comment: FeedComment) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const longPost = post.body.length > 420;
  const link = post.link_url ? getUrlDetails(post.link_url) : null;
  const canManage = isStaff && (post.author_id === currentUserId || currentRole === "admin" || currentRole === "superadmin");
  const comments = post.comments.filter((comment) => !comment.parent_comment_id).slice(0, 2);

  return (
    <article className={`community-post ${post.is_pinned ? "is-pinned" : ""}`}>
      {post.is_pinned && <div className="community-pin-label"><Pin aria-hidden="true" /> Disematkan</div>}
      <header className="community-post-header">
        <OfficialFeedAvatar />
        <span className="community-post-author">
          <strong>{post.author_name}</strong>
          <small><b>{roleLabel[post.author_role]}</b><span aria-hidden="true">·</span><time dateTime={post.published_at ?? post.created_at}>{relativeDate(post.published_at ?? post.created_at)}</time></small>
        </span>
        {canManage && (
          <details className="community-post-menu">
            <summary aria-label={`Kelola post ${post.author_name}`}><MoreHorizontal aria-hidden="true" /></summary>
            <div>
              <button type="button" onClick={() => onManage(post, "pin")}><Pin aria-hidden="true" />{post.is_pinned ? "Lepas sematan" : "Sematkan"}</button>
              <button type="button" onClick={() => onManage(post, "comments")}>
                {post.comments_locked ? <UnlockKeyhole aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                {post.comments_locked ? "Buka komentar" : "Tutup komentar"}
              </button>
              <button type="button" className="danger" onClick={() => onManage(post, "archive")}><Archive aria-hidden="true" />Arsipkan post</button>
            </div>
          </details>
        )}
      </header>

      <div className="community-post-copy">
        <p className={longPost && !expanded ? "is-clamped" : ""}>{post.body}</p>
        {longPost && <button type="button" className="community-expand" onClick={() => setExpanded((value) => !value)}>{expanded ? "Tampilkan lebih sedikit" : "Lihat selengkapnya"}<ChevronDown aria-hidden="true" /></button>}
      </div>

      {post.attached_event && <FeedAgendaAttachment event={post.attached_event} />}
      {link && (
        <a className="community-link-preview" href={link.url} target="_blank" rel="noreferrer">
          <span><Link2 aria-hidden="true" /><small>{link.hostname}</small></span>
          <b>Buka tautan</b><ExternalLink aria-hidden="true" />
        </a>
      )}
      <PostMediaGrid media={post.media} />

      <footer className="community-post-footer">
        <div className="community-post-counts"><span>{post.likeCount} suka</span><button type="button" onClick={() => onOpenDiscussion(post)}>{post.commentCount} komentar</button></div>
        <div className="community-post-actions">
          <button type="button" className={post.likedByMe ? "is-liked" : ""} onClick={() => onToggleLike(post)} aria-pressed={post.likedByMe}>
            <Heart aria-hidden="true" fill={post.likedByMe ? "currentColor" : "none"} /> {post.likedByMe ? "Disukai" : "Suka"}
          </button>
          <button type="button" onClick={() => onOpenDiscussion(post)}><MessageCircle aria-hidden="true" /> Komentar</button>
        </div>
      </footer>

      {comments.length > 0 && (
        <div className="community-comment-preview">
          {comments.map((comment) => <CommentLine key={comment.id} comment={comment} canModerate={isStaff} currentUserId={currentUserId} onDelete={onDeleteComment} />)}
          {post.commentCount > comments.length && <button type="button" className="community-all-comments" onClick={() => onOpenDiscussion(post)}>Lihat semua komentar</button>}
        </div>
      )}
      {post.comments_locked && <p className="community-comments-locked"><LockKeyhole aria-hidden="true" /> Diskusi untuk post ini ditutup oleh pengurus.</p>}
    </article>
  );
}

export function CommunityFeed({
  composerOpen: controlledComposerOpen,
  onComposerOpenChange,
}: {
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const { user, account, loading: accessLoading, invalidateCache } = useDataCache();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadedCountRef = useRef(FEED_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [internalComposerOpen, setInternalComposerOpen] = useState(false);
  const composerOpen = controlledComposerOpen ?? internalComposerOpen;

  const setComposerOpen = useCallback((open: boolean) => {
    if (controlledComposerOpen === undefined) {
      setInternalComposerOpen(open);
    }
    onComposerOpenChange?.(open);
  }, [controlledComposerOpen, onComposerOpenChange]);
  const [availableEvents, setAvailableEvents] = useState<FeedEvent[]>([]);
  const [postEventId, setPostEventId] = useState("");
  const [postSaving, setPostSaving] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postLink, setPostLink] = useState("");
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [pinPost, setPinPost] = useState(false);
  const [lockComments, setLockComments] = useState(false);

  const activeMember = account?.status === "active";
  const isStaff = account?.status === "active" && STAFF_ROLES.includes(account.role);

  const loadFeed = useCallback(async ({
    from = 0,
    append = false,
    pageSize = FEED_PAGE_SIZE,
  }: {
    from?: number;
    append?: boolean;
    pageSize?: number;
  } = {}) => {
    if (!activeMember || !user) {
      setPosts([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: rawPosts, error: postError } = await supabase
        .from("feed_posts")
        .select("id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,status),is_pinned,comments_locked,author_id,author_name,author_role,published_at,created_at,feed_post_media(id,object_path,alt_text,sort_order),feed_post_likes(count),feed_post_comments(count)")
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (postError) throw postError;

      const rows = (rawPosts ?? []) as FeedPostRow[];
      const postIds = rows.map((post) => post.id);
      const media = rows.flatMap((post) => post.feed_post_media ?? []);
      const mediaUrlByPath = new Map<string, string>();

      if (media.length > 0) {
        const { data: signedMedia, error: mediaError } = await supabase.storage
          .from("community-feed")
          .createSignedUrls(media.map((item) => item.object_path), 60 * 60);
        if (mediaError) throw mediaError;
        for (const item of signedMedia ?? []) {
          if (item.path && item.signedUrl) {
            mediaUrlByPath.set(item.path, item.signedUrl);
          }
        }
      }

      const [likesResult, commentsResult] = postIds.length > 0
        ? await Promise.all([
            supabase
              .from("feed_post_likes")
              .select("post_id")
              .in("post_id", postIds)
              .eq("user_id", user.id),
            supabase
              .from("feed_post_comments")
              .select("id,post_id,parent_comment_id,body,author_id,author_name,author_role,created_at")
              .in("post_id", postIds)
              .order("created_at", { ascending: false })
              .limit(Math.max(120, postIds.length * 10)),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];

      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;

      const likedIds = new Set(
        ((likesResult.data ?? []) as { post_id: string }[]).map((like) => like.post_id),
      );
      const commentsByPost = new Map<string, FeedComment[]>();
      for (const comment of (commentsResult.data ?? []) as FeedComment[]) {
        const current = commentsByPost.get(comment.post_id) ?? [];
        current.push(comment);
        commentsByPost.set(comment.post_id, current);
      }

      const hydrated = rows.map((post) => ({
        ...post,
        media: (post.feed_post_media ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            ...item,
            signedUrl: mediaUrlByPath.get(item.object_path),
          })),
        likeCount: post.feed_post_likes?.[0]?.count ?? 0,
        commentCount: post.feed_post_comments?.[0]?.count ?? 0,
        likedByMe: likedIds.has(post.id),
        comments: commentsByPost.get(post.id) ?? [],
      }));

      if (append) {
        const incomingIds = new Set(hydrated.map((post) => post.id));
        setPosts((current) => [
          ...current.filter((post) => !incomingIds.has(post.id)),
          ...hydrated,
        ]);
        loadedCountRef.current = from + rows.length;
      } else {
        setPosts(hydrated);
        loadedCountRef.current = rows.length;
      }

      setHasMore(rows.length === pageSize);
    } catch (cause) {
      console.error("Gagal memuat Kabar Revolt.", cause);
      setError(feedErrorMessage(cause));
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [activeMember, user]);

  useEffect(() => {
    if (!accessLoading) void loadFeed();
  }, [accessLoading, loadFeed]);

  useEffect(() => {
    if (!isStaff) {
      setAvailableEvents([]);
      return;
    }

    let active = true;
    const loadEvents = async () => {
      const { data, error: eventError } = await getSupabaseBrowserClient()
        .from("events")
        .select("id,title,slug,type,location_name,start_at,status")
        .eq("status", "published")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (!active) return;
      if (eventError) {
        console.error("Agenda untuk composer gagal dimuat.", eventError);
        return;
      }

      setAvailableEvents((data ?? []) as FeedEvent[]);
    };

    void loadEvents();
    return () => {
      active = false;
    };
  }, [isStaff]);

  useEffect(() => {
    if (!activeMember) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel("community-feed-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, () => setNewPostsAvailable(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_post_comments" }, () => void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current) }))
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_post_likes" }, () => void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current) }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeMember, loadFeed]);

  useEffect(() => {
    if (!activeMember || loading || loadingMore || !hasMore) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        void loadFeed({ from: posts.length, append: true });
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeMember, hasMore, loadFeed, loading, loadingMore, posts.length]);


  const refreshFromBanner = () => {
    setNewPostsAvailable(false);
    void loadFeed();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleLike = async (post: FeedPost) => {
    if (!user || !activeMember) return;
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likedByMe: !item.likedByMe, likeCount: Math.max(0, item.likeCount + (item.likedByMe ? -1 : 1)) } : item));
    const supabase = getSupabaseBrowserClient();
    const result = post.likedByMe
      ? await supabase.from("feed_post_likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("feed_post_likes").insert({ post_id: post.id, user_id: user.id });
    if (result.error) {
      setError(result.error.message);
      void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current) });
    }
  };

  const deleteComment = async (comment: FeedComment) => {
    const { error: deleteError } = await getSupabaseBrowserClient().from("feed_post_comments").delete().eq("id", comment.id);
    if (deleteError) setError(deleteError.message);
    else void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current) });
  };

  const managePost = async (post: FeedPost, action: "pin" | "comments" | "archive") => {
    const supabase = getSupabaseBrowserClient();

    if (action === "pin" && !post.is_pinned) {
      const otherPinned = posts
        .filter((item) => item.is_pinned && item.id !== post.id)
        .sort(
          (a, b) =>
            new Date(b.published_at ?? b.created_at).getTime() -
            new Date(a.published_at ?? a.created_at).getTime(),
        );

      if (otherPinned.length >= 2) {
        const oldestPinned = otherPinned[otherPinned.length - 1];
        const { error: unpinError } = await supabase
          .from("feed_posts")
          .update({ is_pinned: false })
          .eq("id", oldestPinned.id);

        if (unpinError) {
          setError(unpinError.message);
          return;
        }
      }
    }

    const payload =
      action === "pin"
        ? { is_pinned: !post.is_pinned }
        : action === "comments"
          ? { comments_locked: !post.comments_locked }
          : { status: "archived" };

    const { error: updateError } = await supabase
      .from("feed_posts")
      .update(payload)
      .eq("id", post.id);

    if (updateError) setError(updateError.message);
    else void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current) });
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const combined = [...postFiles, ...files].slice(0, 4);
    const invalid = combined.find((file) => !allowedImageTypes.has(file.type) || file.size > 8 * 1024 * 1024);
    if (invalid) { setError("Gunakan JPG, PNG, atau WEBP dengan ukuran maksimal 8 MB per foto."); return; }
    setPostFiles(combined);
  };

  const closeComposer = () => {
    setComposerOpen(false); setPostBody(""); setPostLink(""); setPostFiles([]); setPostEventId(""); setPinPost(false); setLockComments(false);
  };

  const submitPost = async (event: FormEvent, publish: boolean) => {
    event.preventDefault();
    if (!postBody.trim()) return;
    setPostSaving(true); setError("");
    const supabase = getSupabaseBrowserClient();
    try {
      const { data: post, error: createError } = await supabase.from("feed_posts").insert({
        body: postBody.trim(), link_url: postLink.trim() || null, event_id: postEventId || null, status: publish ? "published" : "draft", is_pinned: pinPost, comments_locked: lockComments,
      }).select("id").single();
      if (createError || !post) throw createError ?? new Error("Post tidak dapat dibuat.");
      for (const [index, file] of postFiles.entries()) {
        const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const objectPath = `${post.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("community-feed").upload(objectPath, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { error: mediaError } = await supabase.from("feed_post_media").insert({ post_id: post.id, object_path: objectPath, sort_order: index, alt_text: `Dokumentasi post Revolt Riders ${index + 1}` });
        if (mediaError) throw mediaError;
      }
      closeComposer(); invalidateCache("dashboard_"); await loadFeed();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Post belum dapat disimpan.");
    } finally { setPostSaving(false); }
  };

  const emptyCopy = isStaff ? "Belum ada post. Bagikan kabar pertama untuk member Revolt Riders." : "Belum ada kabar dari pengurus. Post terbaru akan muncul di sini.";
  const pinnedPosts = useMemo(
    () => posts.filter((post) => post.is_pinned).slice(0, 2),
    [posts],
  );
  const visiblePosts = useMemo(() => {
    const pinnedIds = new Set(pinnedPosts.map((post) => post.id));
    return posts.filter((post) => !pinnedIds.has(post.id));
  }, [pinnedPosts, posts]);

  return (
    <section className="community-feed-page" aria-labelledby="community-feed-title">
      <header className="community-feed-heading">
        <h2 id="community-feed-title">Feed</h2>
      </header>

      {!activeMember && !accessLoading ? (
        <section className="community-feed-gate"><LockKeyhole aria-hidden="true" /><h3>Feed khusus member aktif</h3><p>Masuk dan aktifkan akun member untuk mengikuti kabar komunitas Revolt Riders.</p></section>
      ) : (
        <>
          {newPostsAvailable && <button className="community-new-posts" type="button" onClick={refreshFromBanner}><Sparkles aria-hidden="true" /> Post baru tersedia</button>}
          {error && <p className="community-feed-error" role="alert">{error}</p>}
          {loading ? <FeedSkeleton /> : (
            <div className="community-feed-list">
              {pinnedPosts.map((post) => <FeedPostCard key={post.id} post={post} isStaff={isStaff} currentRole={account?.role} currentUserId={user?.id} onToggleLike={toggleLike} onOpenDiscussion={(item) => router.push(`/post/${item.id}`)} onManage={managePost} onDeleteComment={deleteComment} />)}
              {visiblePosts.map((post) => <FeedPostCard key={post.id} post={post} isStaff={isStaff} currentRole={account?.role} currentUserId={user?.id} onToggleLike={toggleLike} onOpenDiscussion={(item) => router.push(`/post/${item.id}`)} onManage={managePost} onDeleteComment={deleteComment} />)}
              {posts.length === 0 && <section className="community-feed-empty"><MessageCircle aria-hidden="true" /><h3>Belum ada kabar</h3><p>{emptyCopy}</p>{isStaff && <button type="button" onClick={() => setComposerOpen(true)}><Plus aria-hidden="true" /> Buat post pertama</button>}</section>}
              {posts.length > 0 && hasMore ? (
                <div ref={loadMoreRef} className="community-feed-sentinel" aria-live="polite">
                  {loadingMore ? <><LoaderCircle className="spin" aria-hidden="true" /> Memuat kabar lainnya…</> : <span aria-hidden="true" />}
                </div>
              ) : null}
              {posts.length > 0 && !hasMore ? <p className="community-feed-end">Semua kabar sudah dilihat.</p> : null}
            </div>
          )}
        </>
      )}

      <ModalSheet open={Boolean(isStaff && composerOpen)} onClose={closeComposer} title="Buat post" eyebrow="">
        <form className="community-composer" onSubmit={(event) => void submitPost(event, true)}>
          <label>Isi post<textarea value={postBody} onChange={(event) => setPostBody(event.target.value)} maxLength={4000} rows={7} placeholder="Bagikan kabar, agenda, atau dokumentasi perjalanan…" required /></label>
          <label>Tautan opsional<input type="url" value={postLink} onChange={(event) => setPostLink(event.target.value)} placeholder="https://…" /></label>
          <label>
            Lampirkan agenda
            <select value={postEventId} onChange={(event) => setPostEventId(event.target.value)}>
              <option value="">Tanpa agenda</option>
              {availableEvents.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
          <div className="community-upload-control"><span>Foto dokumentasi <small>Maks. 4 foto · JPG, PNG, atau WEBP</small></span><label><ImagePlus aria-hidden="true" /> Tambah foto<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} /></label></div>
          {postFiles.length > 0 && <div className="community-file-list">{postFiles.map((file, index) => <span key={`${file.name}-${index}`}>{file.name}<button type="button" aria-label={`Hapus ${file.name}`} onClick={() => setPostFiles((files) => files.filter((_, itemIndex) => itemIndex !== index))}><X aria-hidden="true" /></button></span>)}</div>}
          <div className="community-composer-settings"><label><input type="checkbox" checked={pinPost} onChange={(event) => setPinPost(event.target.checked)} /> <Pin aria-hidden="true" /> Sematkan post</label><label><input type="checkbox" checked={lockComments} onChange={(event) => setLockComments(event.target.checked)} /> <LockKeyhole aria-hidden="true" /> Tutup komentar</label></div>
          <div className="community-composer-actions"><button type="button" className="outline-action" disabled={postSaving} onClick={(event) => void submitPost(event as unknown as FormEvent, false)}>Simpan draft</button><button className="primary-action" disabled={postSaving}>{postSaving ? <><LoaderCircle className="spin" aria-hidden="true" /> Menyimpan…</> : <><Check aria-hidden="true" /> Terbitkan</>}</button></div>
        </form>
      </ModalSheet>
    </section>
  );
}
