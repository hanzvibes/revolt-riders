"use client";

import { AppShell } from "@/components/app-shell";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache, type AppRole } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Link2,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type ThreadMedia = {
  id: string;
  object_path: string;
  alt_text: string;
  sort_order: number;
  signedUrl?: string;
};

type ThreadEvent = {
  id: string;
  title: string;
  slug: string;
  type: string;
  location_name: string | null;
  start_at: string;
  status: "published" | "completed";
};

type ThreadComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  created_at: string;
};

type ThreadPost = {
  id: string;
  body: string;
  link_url: string | null;
  event_id: string | null;
  attached_event: ThreadEvent | null;
  comments_locked: boolean;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  published_at: string | null;
  created_at: string;
  media: ThreadMedia[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type ThreadPostRow = Omit<
  ThreadPost,
  "media" | "likeCount" | "commentCount" | "likedByMe"
> & {
  feed_post_media?: ThreadMedia[];
  feed_post_likes?: { count: number }[];
  feed_post_comments?: { count: number }[];
};

const STAFF_ROLES: AppRole[] = ["road_captain", "admin", "superadmin"];

const roleLabel: Record<AppRole, string> = {
  member: "Member",
  road_captain: "Road Captain",
  treasurer: "Bendahara",
  admin: "Admin",
  superadmin: "Superadmin",
};

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
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getUrlDetails(value: string) {
  try {
    const url = new URL(value);
    return {
      hostname: url.hostname.replace(/^www\./, ""),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? `${words[0][0]}${words[1][0]}`
      : words[0]?.slice(0, 2) || "RR"
  ).toUpperCase();
}

function OfficialAvatar() {
  return (
    <span className="community-avatar community-avatar-logo" aria-hidden="true">
      <Image
        src="/revolt-riders-logo.jpg"
        alt=""
        fill
        sizes="42px"
      />
    </span>
  );
}

function AgendaAttachment({ event }: { event: ThreadEvent }) {
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

function ThreadMediaGallery({ media }: { media: ThreadMedia[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visible = media.slice(0, 4);
  const activeMedia = activeIndex === null ? null : media[activeIndex];

  const closeViewer = useCallback(() => setActiveIndex(null), []);
  const previous = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) return null;
      return current === 0 ? media.length - 1 : current - 1;
    });
  }, [media.length]);
  const next = useCallback(() => {
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
      if (event.key === "ArrowLeft" && media.length > 1) previous();
      if (event.key === "ArrowRight" && media.length > 1) next();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, closeViewer, media.length, next, previous]);

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
              ) : null}
              {index === 3 && media.length > 4 ? (
                <b>+{media.length - 4}</b>
              ) : null}
            </button>
          </figure>
        ))}
      </div>

      {activeMedia?.signedUrl ? (
        <div className="community-media-viewer" role="dialog" aria-modal="true">
          <header>
            <span>{activeIndex! + 1} / {media.length}</span>
            <button type="button" onClick={closeViewer} aria-label="Tutup foto" autoFocus>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="community-media-viewer-stage">
            {media.length > 1 ? (
              <button
                type="button"
                className="community-media-viewer-nav previous"
                onClick={previous}
                aria-label="Foto sebelumnya"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
            ) : null}
            <figure>
              <Image src={activeMedia.signedUrl} alt={activeMedia.alt_text} fill sizes="100vw" priority />
            </figure>
            {media.length > 1 ? (
              <button
                type="button"
                className="community-media-viewer-nav next"
                onClick={next}
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

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, account, loading: accessLoading } = useDataCache();

  const [post, setPost] = useState<ThreadPost | null>(null);
  const [comments, setComments] = useState<ThreadComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<ThreadComment | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);

  const activeMember = account?.status === "active";
  const isStaff =
    account?.status === "active" && STAFF_ROLES.includes(account.role);

  const loadThread = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!postId || !user || !activeMember) {
      setPost(null);
      setComments([]);
      setLoading(false);
      return;
    }

    if (!quiet) setLoading(true);
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: rawPost, error: postError } = await supabase
        .from("feed_posts")
        .select(
          "id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,status),comments_locked,author_id,author_name,author_role,published_at,created_at,feed_post_media(id,object_path,alt_text,sort_order),feed_post_likes(count),feed_post_comments(count)",
        )
        .eq("id", postId)
        .eq("status", "published")
        .maybeSingle();

      if (postError) throw postError;
      if (!rawPost) {
        setPost(null);
        setComments([]);
        setError("Post ini tidak tersedia.");
        return;
      }

      const row = rawPost as ThreadPostRow;
      const media = [...(row.feed_post_media ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const mediaUrlByPath = new Map<string, string>();

      if (media.length > 0) {
        const { data: signedMedia, error: mediaError } = await supabase.storage
          .from("community-feed")
          .createSignedUrls(
            media.map((item) => item.object_path),
            60 * 60,
          );

        if (mediaError) throw mediaError;
        for (const item of signedMedia ?? []) {
          if (item.path && item.signedUrl) {
            mediaUrlByPath.set(item.path, item.signedUrl);
          }
        }
      }

      const [likeResult, commentResult] = await Promise.all([
        supabase
          .from("feed_post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("feed_post_comments")
          .select(
            "id,post_id,parent_comment_id,body,author_id,author_name,author_role,created_at",
          )
          .eq("post_id", postId)
          .order("created_at", { ascending: true }),
      ]);

      if (likeResult.error) throw likeResult.error;
      if (commentResult.error) throw commentResult.error;

      setPost({
        ...row,
        media: media.map((item) => ({
          ...item,
          signedUrl: mediaUrlByPath.get(item.object_path),
        })),
        likeCount: row.feed_post_likes?.[0]?.count ?? 0,
        commentCount: row.feed_post_comments?.[0]?.count ?? 0,
        likedByMe: Boolean(likeResult.data),
      });
      setComments((commentResult.data ?? []) as ThreadComment[]);
    } catch (cause) {
      console.error("Thread gagal dimuat.", cause);
      setError(
        cause instanceof Error ? cause.message : "Thread belum dapat dimuat.",
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [activeMember, postId, user]);

  useEffect(() => {
    if (!accessLoading) void loadThread();
  }, [accessLoading, loadThread]);

  useEffect(() => {
    if (!activeMember || !postId) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`feed-thread-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => void loadThread({ quiet: true }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_post_likes",
          filter: `post_id=eq.${postId}`,
        },
        () => void loadThread({ quiet: true }),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feed_posts",
          filter: `id=eq.${postId}`,
        },
        () => void loadThread({ quiet: true }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeMember, loadThread, postId]);

  const toggleLike = async () => {
    if (!post || !user || !activeMember) return;

    const wasLiked = post.likedByMe;
    setPost({
      ...post,
      likedByMe: !wasLiked,
      likeCount: Math.max(0, post.likeCount + (wasLiked ? -1 : 1)),
    });

    const supabase = getSupabaseBrowserClient();
    const result = wasLiked
      ? await supabase
          .from("feed_post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id)
      : await supabase
          .from("feed_post_likes")
          .insert({ post_id: post.id, user_id: user.id });

    if (result.error) {
      setError(result.error.message);
      void loadThread({ quiet: true });
    }
  };

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!post || !commentBody.trim() || post.comments_locked) return;

    setCommentSaving(true);
    const { error: insertError } = await getSupabaseBrowserClient()
      .from("feed_post_comments")
      .insert({
        post_id: post.id,
        parent_comment_id: replyTarget?.id ?? null,
        body: commentBody.trim(),
      });

    setCommentSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCommentBody("");
    setReplyTarget(null);
    await loadThread({ quiet: true });
  };

  const deleteComment = async (comment: ThreadComment) => {
    const { error: deleteError } = await getSupabaseBrowserClient()
      .from("feed_post_comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadThread({ quiet: true });
  };

  const rootComments = useMemo(
    () => comments.filter((comment) => !comment.parent_comment_id),
    [comments],
  );

  const repliesByParent = useMemo(() => {
    const map = new Map<string, ThreadComment[]>();
    for (const comment of comments) {
      if (!comment.parent_comment_id) continue;
      const current = map.get(comment.parent_comment_id) ?? [];
      current.push(comment);
      map.set(comment.parent_comment_id, current);
    }
    return map;
  }, [comments]);

  if (accessLoading || loading) {
    return (
      <AppShell active="Home" title="Thread" eyebrow={null} socialHeader>
        <PageSkeleton title="Memuat Thread..." />
      </AppShell>
    );
  }

  if (!activeMember) {
    return (
      <AppShell active="Home" title="Thread" eyebrow={null} socialHeader>
        <div className="community-thread-page">
          <section className="community-feed-gate">
            <LockKeyhole aria-hidden="true" />
            <h3>Thread khusus member aktif</h3>
            <p>Aktifkan akun member untuk membaca dan ikut berdiskusi.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell active="Home" title="Thread" eyebrow={null} socialHeader>
        <div className="community-thread-page">
          <Link className="community-thread-back" href="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Feed
          </Link>
          <section className="community-feed-empty">
            <MessageCircle aria-hidden="true" />
            <h3>Post tidak ditemukan</h3>
            <p>{error || "Post ini sudah tidak tersedia."}</p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Home" title="Thread" eyebrow={null} socialHeader>
      <div className="community-thread-page dashboard-social-feed-v1">
        <Link className="community-thread-back" href="/dashboard">
          <ArrowLeft aria-hidden="true" />
          Feed
        </Link>

        {error ? (
          <p className="community-feed-error" role="alert">{error}</p>
        ) : null}

        <article className="community-post community-thread-origin">
          <header className="community-post-header">
            <OfficialAvatar />
            <span className="community-post-author">
              <strong>{post.author_name}</strong>
              <small>
                <b>{roleLabel[post.author_role]}</b>
                <span aria-hidden="true">·</span>
                <time dateTime={post.published_at ?? post.created_at}>
                  {relativeDate(post.published_at ?? post.created_at)}
                </time>
              </small>
            </span>
          </header>

          <div className="community-post-copy">
            <p>{post.body}</p>
          </div>

          {post.attached_event ? (
            <AgendaAttachment event={post.attached_event} />
          ) : null}

          {post.link_url && getUrlDetails(post.link_url) ? (
            <a
              className="community-link-preview"
              href={getUrlDetails(post.link_url)!.url}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Link2 aria-hidden="true" />
                <small>{getUrlDetails(post.link_url)!.hostname}</small>
              </span>
              <b>Buka tautan</b>
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}

          <ThreadMediaGallery media={post.media} />

          <footer className="community-post-footer">
            <div className="community-post-counts">
              <span>{post.likeCount} suka</span>
              <span>{post.commentCount} komentar</span>
            </div>
            <div className="community-post-actions">
              <button
                type="button"
                className={post.likedByMe ? "is-liked" : ""}
                onClick={() => void toggleLike()}
                aria-pressed={post.likedByMe}
              >
                <Heart
                  aria-hidden="true"
                  fill={post.likedByMe ? "currentColor" : "none"}
                />
                {post.likedByMe ? "Disukai" : "Suka"}
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("thread-comment-box")
                    ?.focus()
                }
              >
                <MessageCircle aria-hidden="true" />
                Komentar
              </button>
            </div>
          </footer>
        </article>

        <section className="community-thread-discussion" aria-labelledby="thread-discussion-title">
          <header className="community-thread-discussion-head">
            <h2 id="thread-discussion-title">Diskusi</h2>
            <span>{comments.length}</span>
          </header>

          {rootComments.length === 0 ? (
            <p className="community-no-comments">
              Belum ada komentar. Mulai percakapan dengan tetap saling menghargai.
            </p>
          ) : (
            <div className="community-thread-list">
              {rootComments.map((comment) => {
                const replies = repliesByParent.get(comment.id) ?? [];
                const canDelete =
                  isStaff || comment.author_id === user?.id;

                return (
                  <article className="thread-comment-root" key={comment.id}>
                    <div className="thread-comment-line">
                      <span className="community-avatar small" aria-hidden="true">
                        {initials(comment.author_name)}
                      </span>
                      <div className="thread-comment-content">
                        <header>
                          <strong>{comment.author_name}</strong>
                          <span>{roleLabel[comment.author_role]}</span>
                          <time dateTime={comment.created_at}>
                            {relativeDate(comment.created_at)}
                          </time>
                        </header>
                        <p>{comment.body}</p>
                        <div className="thread-comment-actions">
                          {!post.comments_locked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTarget(comment);
                                setCommentBody("");
                                window.requestAnimationFrame(() =>
                                  document
                                    .getElementById("thread-comment-box")
                                    ?.focus(),
                                );
                              }}
                            >
                              Balas
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              className="danger"
                              onClick={() => void deleteComment(comment)}
                            >
                              <Trash2 aria-hidden="true" />
                              Hapus
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {replies.length > 0 ? (
                      <div className="thread-replies">
                        {replies.map((reply) => {
                          const canDeleteReply =
                            isStaff || reply.author_id === user?.id;

                          return (
                            <div className="thread-comment-line" key={reply.id}>
                              <span className="community-avatar small" aria-hidden="true">
                                {initials(reply.author_name)}
                              </span>
                              <div className="thread-comment-content">
                                <header>
                                  <strong>{reply.author_name}</strong>
                                  <span>{roleLabel[reply.author_role]}</span>
                                  <time dateTime={reply.created_at}>
                                    {relativeDate(reply.created_at)}
                                  </time>
                                </header>
                                <p>{reply.body}</p>
                                {canDeleteReply ? (
                                  <div className="thread-comment-actions">
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => void deleteComment(reply)}
                                    >
                                      <Trash2 aria-hidden="true" />
                                      Hapus
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {post.comments_locked ? (
            <p className="community-comments-locked">
              <LockKeyhole aria-hidden="true" />
              Pengurus telah menutup komentar untuk post ini.
            </p>
          ) : (
            <form className="community-thread-composer" onSubmit={submitComment}>
              {replyTarget ? (
                <div className="community-reply-target">
                  <span>
                    Membalas <b>{replyTarget.author_name}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTarget(null)}
                    aria-label="Batalkan balasan"
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              <div>
                <textarea
                  id="thread-comment-box"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  maxLength={1000}
                  placeholder={replyTarget ? "Tulis balasan…" : "Tulis komentar…"}
                  required
                />
                <button type="submit" disabled={commentSaving || !commentBody.trim()}>
                  <Send aria-hidden="true" />
                  <span className="sr-only">Kirim komentar</span>
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AppShell>
  );
}
