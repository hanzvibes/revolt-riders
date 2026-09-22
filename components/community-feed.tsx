"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import {
  CommunityEventAttachment,
  CommunityMediaGallery,
  OfficialFeedAvatar,
  type CommunityFeedEvent,
  type CommunityFeedMedia,
} from "@/components/community-feed-primitives";
import {
  getSocialUrlDetails,
  socialRelativeDate,
  socialRoleLabel,
  SOCIAL_FEED_STAFF_ROLES,
} from "@/components/community-feed-utils";
import { ModalSheet } from "@/components/modal-sheet";
import { useDataCache, type AppRole } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Archive,
  Check,
  ChevronDown,
  ExternalLink,
  Heart,
  ImagePlus,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Sparkles,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type FeedMedia = CommunityFeedMedia;

type FeedEvent = CommunityFeedEvent;

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
};

type FeedPostRow = Omit<FeedPost, "media" | "likeCount" | "commentCount" | "likedByMe"> & {
  like_count: number;
  comment_count: number;
  feed_post_media?: FeedMedia[];
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const FEED_PAGE_SIZE = 12;

function feedErrorMessage(cause: unknown) {
  const message = typeof cause === "object" && cause !== null && "message" in cause
    ? String(cause.message)
    : "";

  if (/permission denied|row-level security|not authorized/i.test(message)) {
    return "Akses feed belum tersedia untuk akun ini. Muat ulang halaman atau hubungi pengurus bila masalah berlanjut.";
  }

  return "Kabar Revolt belum dapat dimuat. Coba muat ulang halaman.";
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

function FeedPostCard({ post, isStaff, currentRole, currentUserId, onToggleLike, onOpenDiscussion, onManage }: {
  post: FeedPost;
  isStaff: boolean;
  currentRole?: AppRole;
  currentUserId?: string;
  onToggleLike: (post: FeedPost) => void;
  onOpenDiscussion: (post: FeedPost) => void;
  onManage: (post: FeedPost, action: "pin" | "comments" | "archive") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const longPost = post.body.length > 420;
  const link = post.link_url ? getSocialUrlDetails(post.link_url) : null;
  const canManage =
    isStaff &&
    (post.author_id === currentUserId ||
      currentRole === "admin" ||
      currentRole === "superadmin");

  return (
    <article
      className={`community-post community-threads-post ${post.is_pinned ? "is-pinned" : ""}`}
    >
      <div className="community-threads-layout">
        <div className="community-threads-rail" aria-hidden="true">
          <OfficialFeedAvatar />
          <span className="community-threads-connector" />
        </div>

        <div className="community-threads-body">
          {post.is_pinned ? (
            <div className="community-pin-label">
              <Pin aria-hidden="true" />
              Disematkan
            </div>
          ) : null}

          <header className="community-post-header">
            <span className="community-post-author">
              <strong>{post.author_name}</strong>
              <small>
                <b>{socialRoleLabel[post.author_role]}</b>
                <span aria-hidden="true">·</span>
                <time dateTime={post.published_at ?? post.created_at}>
                  {socialRelativeDate(post.published_at ?? post.created_at)}
                </time>
              </small>
            </span>

            {canManage ? (
              <details className="community-post-menu">
                <summary aria-label={`Kelola post ${post.author_name}`}>
                  <MoreHorizontal aria-hidden="true" />
                </summary>
                <div>
                  <button type="button" onClick={() => onManage(post, "pin")}>
                    <Pin aria-hidden="true" />
                    {post.is_pinned ? "Lepas sematan" : "Sematkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onManage(post, "comments")}
                  >
                    {post.comments_locked ? (
                      <UnlockKeyhole aria-hidden="true" />
                    ) : (
                      <LockKeyhole aria-hidden="true" />
                    )}
                    {post.comments_locked ? "Buka komentar" : "Tutup komentar"}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onManage(post, "archive")}
                  >
                    <Archive aria-hidden="true" />
                    Arsipkan post
                  </button>
                </div>
              </details>
            ) : null}
          </header>

          <div className="community-post-copy">
            <p className={longPost && !expanded ? "is-clamped" : ""}>
              {post.body}
            </p>
            {longPost ? (
              <button
                type="button"
                className="community-expand"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Tampilkan lebih sedikit" : "Lihat selengkapnya"}
                <ChevronDown aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {post.attached_event ? (
            <CommunityEventAttachment event={post.attached_event} />
          ) : null}

          {link ? (
            <a
              className="community-link-preview"
              href={link.url}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Link2 aria-hidden="true" />
                <small>{link.hostname}</small>
              </span>
              <b>Buka tautan</b>
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}

          <CommunityMediaGallery media={post.media} />

          <footer className="community-post-footer">
            <div className="community-post-actions community-threads-actions">
              <button
                type="button"
                className={post.likedByMe ? "is-liked" : ""}
                onClick={() => onToggleLike(post)}
                aria-pressed={post.likedByMe}
                aria-label={post.likedByMe ? "Batalkan suka" : "Sukai post"}
              >
                <Heart
                  aria-hidden="true"
                  fill={post.likedByMe ? "currentColor" : "none"}
                />
                <span className="sr-only">
                  {post.likedByMe ? "Batalkan suka" : "Suka"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDiscussion(post)}
                aria-label="Buka balasan"
              >
                <MessageCircle aria-hidden="true" />
                <span className="sr-only">Balas</span>
              </button>
            </div>

            <div className="community-post-counts community-threads-counts">
              <button type="button" onClick={() => onOpenDiscussion(post)}>
                {post.commentCount} balasan
              </button>
              <span aria-hidden="true">·</span>
              <span>{post.likeCount} suka</span>
            </div>
          </footer>

          {post.comments_locked ? (
            <p className="community-comments-locked">
              <LockKeyhole aria-hidden="true" />
              Diskusi untuk post ini ditutup oleh pengurus.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ComposerPostPreview({
  body,
  linkUrl,
  event,
  media,
  authorName,
  authorRole,
  pinned,
  commentsLocked,
}: {
  body: string;
  linkUrl: string;
  event: FeedEvent | null;
  media: FeedMedia[];
  authorName: string;
  authorRole: AppRole;
  pinned: boolean;
  commentsLocked: boolean;
}) {
  const link = linkUrl.trim() ? getSocialUrlDetails(linkUrl.trim()) : null;

  return (
    <div className="community-composer-preview">
      <span className="community-composer-preview-label">Preview post</span>
      <article className={`community-post${pinned ? " is-pinned" : ""}`}>
        {pinned ? (
          <div className="community-pin-label">
            <Pin aria-hidden="true" />
            Disematkan
          </div>
        ) : null}

        <header className="community-post-header">
          <OfficialFeedAvatar />
          <span className="community-post-author">
            <strong>{authorName}</strong>
            <small>
              <b>{socialRoleLabel[authorRole]}</b>
              <span aria-hidden="true">·</span>
              <time>Baru saja</time>
            </small>
          </span>
        </header>

        <div className="community-post-copy">
          <p className={!body.trim() ? "is-placeholder" : ""}>
            {body.trim() || "Isi post akan muncul di sini."}
          </p>
        </div>

        {event ? <CommunityEventAttachment event={event} /> : null}

        {link ? (
          <a
            className="community-link-preview"
            href={link.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <Link2 aria-hidden="true" />
              <small>{link.hostname}</small>
            </span>
            <b>Buka tautan</b>
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}

        <CommunityMediaGallery media={media} />

        <footer className="community-post-footer">
          <div className="community-post-counts">
            <span>0 suka</span>
            <span>0 komentar</span>
          </div>
          <div className="community-post-actions" aria-hidden="true">
            <span>
              <Heart aria-hidden="true" />
              Suka
            </span>
            <span>
              <MessageCircle aria-hidden="true" />
              Komentar
            </span>
          </div>
        </footer>

        {commentsLocked ? (
          <p className="community-comments-locked">
            <LockKeyhole aria-hidden="true" />
            Diskusi untuk post ini ditutup oleh pengurus.
          </p>
        ) : null}
      </article>
    </div>
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
  const [composerMode, setComposerMode] = useState<"edit" | "preview">("edit");
  const [previewAuthorName, setPreviewAuthorName] = useState("Pengurus Revolt Riders");
  const [previewMedia, setPreviewMedia] = useState<FeedMedia[]>([]);

  useEffect(() => {
    const next = postFiles.map((file, index) => ({
      id: `preview-${index}-${file.name}`,
      object_path: "",
      alt_text: `Preview foto ${index + 1}`,
      sort_order: index,
      signedUrl: URL.createObjectURL(file),
    }));

    setPreviewMedia(next);

    return () => {
      for (const item of next) {
        if (item.signedUrl) URL.revokeObjectURL(item.signedUrl);
      }
    };
  }, [postFiles]);

  const selectedPreviewEvent = useMemo(
    () => availableEvents.find((event) => event.id === postEventId) ?? null,
    [availableEvents, postEventId],
  );

  const activeMember = account?.status === "active";
  const isStaff = account?.status === "active" && SOCIAL_FEED_STAFF_ROLES.includes(account.role);

  const loadFeed = useCallback(async ({
    from = 0,
    append = false,
    pageSize = FEED_PAGE_SIZE,
    quiet = false,
  }: {
    from?: number;
    append?: boolean;
    pageSize?: number;
    quiet?: boolean;
  } = {}) => {
    if (!activeMember || !user) {
      setPosts([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (append) setLoadingMore(true);
    else if (!quiet) setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: rawPosts, error: postError } = await supabase
        .from("feed_posts")
        .select("id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at),is_pinned,comments_locked,author_id,author_name,author_role,published_at,created_at,like_count,comment_count,feed_post_media(id,object_path,alt_text,sort_order)")
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

      const voyagerEventIds = Array.from(
        new Set(
          rows
            .map((post) => post.attached_event)
            .filter(
              (event): event is FeedEvent =>
                Boolean(event && event.type === "voyager"),
            )
            .map((event) => event.id),
        ),
      );

      const [likesResult, participantsResult, photosResult] = await Promise.all([
        postIds.length > 0
          ? supabase
              .from("feed_post_likes")
              .select("post_id")
              .in("post_id", postIds)
              .eq("user_id", user.id)
          : Promise.resolve({ data: [], error: null }),
        voyagerEventIds.length > 0
          ? supabase
              .from("event_participants")
              .select("event_id")
              .in("event_id", voyagerEventIds)
          : Promise.resolve({ data: [], error: null }),
        voyagerEventIds.length > 0
          ? supabase
              .from("club_gallery")
              .select("event_id")
              .in("event_id", voyagerEventIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (likesResult.error) throw likesResult.error;
      if (participantsResult.error) throw participantsResult.error;
      if (photosResult.error) throw photosResult.error;

      const likedIds = new Set(
        ((likesResult.data ?? []) as { post_id: string }[]).map((like) => like.post_id),
      );
      const participantCountByEvent = new Map<string, number>();
      for (const row of (participantsResult.data ?? []) as { event_id: string }[]) {
        participantCountByEvent.set(
          row.event_id,
          (participantCountByEvent.get(row.event_id) ?? 0) + 1,
        );
      }

      const photoCountByEvent = new Map<string, number>();
      for (const row of (photosResult.data ?? []) as { event_id: string | null }[]) {
        if (!row.event_id) continue;
        photoCountByEvent.set(
          row.event_id,
          (photoCountByEvent.get(row.event_id) ?? 0) + 1,
        );
      }
      const hydrated = rows.map((post) => ({
        ...post,
        attached_event: post.attached_event
          ? {
              ...post.attached_event,
              participantCount:
                post.attached_event.type === "voyager"
                  ? participantCountByEvent.get(post.attached_event.id) ?? 0
                  : undefined,
              photoCount:
                post.attached_event.type === "voyager"
                  ? photoCountByEvent.get(post.attached_event.id) ?? 0
                  : undefined,
            }
          : null,
        media: (post.feed_post_media ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            ...item,
            signedUrl: mediaUrlByPath.get(item.object_path),
          })),
        likeCount: post.like_count ?? 0,
        commentCount: post.comment_count ?? 0,
        likedByMe: likedIds.has(post.id),
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
      else if (!quiet) setLoading(false);
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

    if (!composerOpen) return;

    let active = true;
    const loadEvents = async () => {
      const supabase = getSupabaseBrowserClient();
      const now = new Date().toISOString();

      const [agendaResult, voyagerResult, profileResult] = await Promise.all([
        supabase
          .from("events")
          .select("id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at")
          .eq("status", "published")
          .neq("type", "voyager")
          .gte("start_at", now)
          .order("start_at", { ascending: true })
          .limit(12),
        supabase
          .from("events")
          .select("id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at")
          .eq("status", "published")
          .eq("type", "voyager")
          .order("start_at", { ascending: false })
          .limit(8),
        account?.member_external_id
          ? supabase
              .from("member_profiles")
              .select("full_name,nickname")
              .eq("member_external_id", account.member_external_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;
      if (agendaResult.error || voyagerResult.error) {
        console.error(
          "Agenda/Voyager untuk composer gagal dimuat.",
          agendaResult.error ?? voyagerResult.error,
        );
        return;
      }

      if (!profileResult.error && profileResult.data) {
        const profile = profileResult.data as {
          full_name: string;
          nickname: string | null;
        };
        setPreviewAuthorName(profile.nickname || profile.full_name);
      }

      const agendaRows = (agendaResult.data ?? []) as FeedEvent[];
      const voyagerRows = (voyagerResult.data ?? []) as FeedEvent[];
      const voyagerIds = voyagerRows.map((event) => event.id);

      if (voyagerIds.length === 0) {
        setAvailableEvents([...agendaRows, ...voyagerRows]);
        return;
      }

      const [participantsResult, photosResult] = await Promise.all([
        supabase
          .from("event_participants")
          .select("event_id")
          .in("event_id", voyagerIds),
        supabase
          .from("club_gallery")
          .select("event_id")
          .in("event_id", voyagerIds),
      ]);

      if (!active) return;

      const participantCountByEvent = new Map<string, number>();
      if (!participantsResult.error) {
        for (const row of (participantsResult.data ?? []) as { event_id: string }[]) {
          participantCountByEvent.set(
            row.event_id,
            (participantCountByEvent.get(row.event_id) ?? 0) + 1,
          );
        }
      }

      const photoCountByEvent = new Map<string, number>();
      if (!photosResult.error) {
        for (const row of (photosResult.data ?? []) as { event_id: string | null }[]) {
          if (!row.event_id) continue;
          photoCountByEvent.set(
            row.event_id,
            (photoCountByEvent.get(row.event_id) ?? 0) + 1,
          );
        }
      }

      setAvailableEvents([
        ...agendaRows,
        ...voyagerRows.map((event) => ({
          ...event,
          participantCount: participantCountByEvent.get(event.id) ?? 0,
          photoCount: photoCountByEvent.get(event.id) ?? 0,
        })),
      ]);
    };
    void loadEvents();
    return () => {
      active = false;
    };
  }, [account?.member_external_id, composerOpen, isStaff]);

  useEffect(() => {
    if (!activeMember) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("community-feed-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_posts",
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const record = payload.new ?? {};
            if (
              record.status === "published" &&
              record.author_id !== user?.id
            ) {
              setNewPostsAvailable(true);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            const id = payload.old?.id;
            if (typeof id !== "string") return;
            setPosts((current) =>
              current.filter((post) => post.id !== id),
            );
            return;
          }

          if (payload.eventType !== "UPDATE") return;

          const record = payload.new ?? {};
          const id = record.id;
          if (typeof id !== "string") return;

          if (
            typeof record.status === "string" &&
            record.status !== "published"
          ) {
            setPosts((current) =>
              current.filter((post) => post.id !== id),
            );
            return;
          }

          setPosts((current) =>
            current.map((post) =>
              post.id === id
                ? {
                    ...post,
                    likeCount:
                      typeof record.like_count === "number"
                        ? record.like_count
                        : post.likeCount,
                    commentCount:
                      typeof record.comment_count === "number"
                        ? record.comment_count
                        : post.commentCount,
                  }
                : post,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeMember, user?.id]);

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
      void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current), quiet: true });
    }
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
    else void loadFeed({ pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current), quiet: true });
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
    setComposerOpen(false); setPostBody(""); setPostLink(""); setPostFiles([]); setPostEventId(""); setPinPost(false); setLockComments(false); setComposerMode("edit");
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
              {pinnedPosts.map((post) => <FeedPostCard key={post.id} post={post} isStaff={isStaff} currentRole={account?.role} currentUserId={user?.id} onToggleLike={toggleLike} onOpenDiscussion={(item) => router.push(`/post/${item.id}`)} onManage={managePost} />)}
              {visiblePosts.map((post) => <FeedPostCard key={post.id} post={post} isStaff={isStaff} currentRole={account?.role} currentUserId={user?.id} onToggleLike={toggleLike} onOpenDiscussion={(item) => router.push(`/post/${item.id}`)} onManage={managePost} />)}
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
          <div className="community-composer-mode" role="tablist" aria-label="Mode composer">
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "edit"}
              className={composerMode === "edit" ? "active" : ""}
              onClick={() => setComposerMode("edit")}
            >
              Edit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={composerMode === "preview"}
              className={composerMode === "preview" ? "active" : ""}
              onClick={() => setComposerMode("preview")}
            >
              Preview
            </button>
          </div>

          {composerMode === "edit" ? (
            <div className="community-composer-fields">
              <label>
                Isi post
                <textarea
                  value={postBody}
                  onChange={(event) => setPostBody(event.target.value)}
                  maxLength={4000}
                  rows={7}
                  placeholder="Bagikan kabar, agenda, atau dokumentasi perjalanan…"
                  required
                />
              </label>

              <label>
                Tautan opsional
                <input
                  type="url"
                  value={postLink}
                  onChange={(event) => setPostLink(event.target.value)}
                  placeholder="https://…"
                />
              </label>

              <label>
                Lampirkan Agenda / Voyager
                <select
                  value={postEventId}
                  onChange={(event) => setPostEventId(event.target.value)}
                >
                  <option value="">Tanpa lampiran event</option>
                  {availableEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.type === "voyager" ? "Voyager" : "Agenda"} · {event.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="community-upload-control">
                <span>
                  Foto dokumentasi
                  <small>Maks. 4 foto · JPG, PNG, atau WEBP</small>
                </span>
                <label>
                  <ImagePlus aria-hidden="true" />
                  Tambah foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFiles}
                  />
                </label>
              </div>

              {postFiles.length > 0 ? (
                <div className="community-file-list">
                  {postFiles.map((file, index) => (
                    <span key={`${file.name}-${index}`}>
                      {file.name}
                      <button
                        type="button"
                        aria-label={`Hapus ${file.name}`}
                        onClick={() =>
                          setPostFiles((files) =>
                            files.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <X aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="community-composer-settings">
                <label>
                  <input
                    type="checkbox"
                    checked={pinPost}
                    onChange={(event) => setPinPost(event.target.checked)}
                  />
                  <Pin aria-hidden="true" />
                  Sematkan post
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={lockComments}
                    onChange={(event) => setLockComments(event.target.checked)}
                  />
                  <LockKeyhole aria-hidden="true" />
                  Tutup komentar
                </label>
              </div>
            </div>
          ) : (
            <ComposerPostPreview
              body={postBody}
              linkUrl={postLink}
              event={selectedPreviewEvent}
              media={previewMedia}
              authorName={previewAuthorName}
              authorRole={account?.role ?? "member"}
              pinned={pinPost}
              commentsLocked={lockComments}
            />
          )}

          <div className="community-composer-actions">
            {composerMode === "preview" ? (
              <button
                type="button"
                className="outline-action"
                onClick={() => setComposerMode("edit")}
              >
                Kembali edit
              </button>
            ) : (
              <button
                type="button"
                className="outline-action"
                disabled={postSaving}
                onClick={(event) =>
                  void submitPost(event as unknown as FormEvent, false)
                }
              >
                Simpan draft
              </button>
            )}

            <button
              className="primary-action"
              disabled={postSaving || !postBody.trim()}
            >
              {postSaving ? (
                <>
                  <LoaderCircle className="spin" aria-hidden="true" />
                  Menyimpan…
                </>
              ) : (
                <>
                  <Check aria-hidden="true" />
                  Terbitkan
                </>
              )}
            </button>
          </div>
        </form>
      </ModalSheet>
    </section>
  );
}
