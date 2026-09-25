"use client";

import { AppShell } from "@/components/app-shell";
import {
  CommunityEventAttachment,
  CommunityMediaGallery,
  OfficialFeedAvatar,
  type CommunityFeedEvent,
  type CommunityFeedMedia,
} from "@/components/community-feed-primitives";
import {
  getSocialUrlDetails,
  socialInitials,
  socialRelativeDate,
  socialRoleLabel,
  SOCIAL_FEED_STAFF_ROLES,
} from "@/components/community-feed-utils";
import { PageSkeleton } from "@/components/skeleton";
import { useDataCache, type AppRole } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  Link2,
  LockKeyhole,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type RealtimeChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

type ThreadMedia = CommunityFeedMedia;

type ThreadEvent = CommunityFeedEvent;

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
  like_count: number;
  comment_count: number;
  feed_post_media?: ThreadMedia[];
};

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
    account?.status === "active" && SOCIAL_FEED_STAFF_ROLES.includes(account.role);

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
          "id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at),comments_locked,author_id,author_name,author_role,published_at,created_at,like_count,comment_count,feed_post_media(id,object_path,alt_text,sort_order)",
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

      const voyagerEventId =
        row.attached_event?.type === "voyager"
          ? row.attached_event.id
          : null;

      const [likeResult, commentResult, participantsResult, photosResult] =
        await Promise.all([
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
          voyagerEventId
            ? supabase
                .from("event_participants")
                .select("event_id")
                .eq("event_id", voyagerEventId)
            : Promise.resolve({ data: [], error: null }),
          voyagerEventId
            ? supabase
                .from("club_gallery")
                .select("event_id")
                .eq("event_id", voyagerEventId)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (likeResult.error) throw likeResult.error;
      if (commentResult.error) throw commentResult.error;
      if (participantsResult.error) throw participantsResult.error;
      if (photosResult.error) throw photosResult.error;

      setPost({
        ...row,
        attached_event: row.attached_event
          ? {
              ...row.attached_event,
              participantCount:
                row.attached_event.type === "voyager"
                  ? (participantsResult.data ?? []).length
                  : undefined,
              photoCount:
                row.attached_event.type === "voyager"
                  ? (photosResult.data ?? []).length
                  : undefined,
            }
          : null,
        media: media.map((item) => ({
          ...item,
          signedUrl: mediaUrlByPath.get(item.object_path),
        })),
        likeCount: row.like_count ?? 0,
        commentCount: row.comment_count ?? 0,
        likedByMe: Boolean(likeResult.data),
      });
      setComments((commentResult.data ?? []) as ThreadComment[]);
    } catch (cause) {
      console.error("Thread gagal dimuat.", cause);
      setError(
        cause instanceof Error ? cause.message : "Post belum dapat dimuat.",
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
        },
        (payload: unknown) => {
          const change = payload as RealtimeChangePayload;
          if (change.eventType === "DELETE") {
            const id = change.old?.id;
            if (typeof id !== "string") return;
            setComments((current) =>
              current.filter((comment) => comment.id !== id),
            );
            return;
          }

          const record = change.new;
          if (!record || record.post_id !== postId) return;

          if (change.eventType === "INSERT") {
            setComments((current) => {
              if (current.some((comment) => comment.id === record.id)) {
                return current;
              }

              return [...current, record as ThreadComment].sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime(),
              );
            });
            return;
          }

          if (change.eventType === "UPDATE") {
            setComments((current) =>
              current.map((comment) =>
                comment.id === record.id
                  ? (record as ThreadComment)
                  : comment,
              ),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feed_posts",
          filter: `id=eq.${postId}`,
        },
        (payload: unknown) => {
          const change = payload as RealtimeChangePayload;
          const record = change.new;
          if (!record || record.id !== postId) return;

          if (
            typeof record.status === "string" &&
            record.status !== "published"
          ) {
            setPost(null);
            setError("Post ini sudah tidak tersedia.");
            return;
          }

          setPost((current) =>
            current
              ? {
                  ...current,
                  likeCount:
                    typeof record.like_count === "number"
                      ? record.like_count
                      : current.likeCount,
                  commentCount:
                    typeof record.comment_count === "number"
                      ? record.comment_count
                      : current.commentCount,
                  comments_locked:
                    typeof record.comments_locked === "boolean"
                      ? record.comments_locked
                      : current.comments_locked,
                }
              : current,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeMember, postId]);

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
    setError("");

    const { data: createdComment, error: insertError } =
      await getSupabaseBrowserClient()
        .from("feed_post_comments")
        .insert({
          post_id: post.id,
          parent_comment_id: replyTarget?.id ?? null,
          body: commentBody.trim(),
        })
        .select(
          "id,post_id,parent_comment_id,body,author_id,author_name,author_role,created_at",
        )
        .single();

    setCommentSaving(false);
    if (insertError || !createdComment) {
      setError(insertError?.message ?? "Komentar belum dapat dikirim.");
      return;
    }

    const nextComment = createdComment as ThreadComment;
    setComments((current) => {
      if (current.some((comment) => comment.id === nextComment.id)) {
        return current;
      }

      return [...current, nextComment].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      );
    });
    setPost((current) =>
      current
        ? {
            ...current,
            commentCount: current.commentCount + 1,
          }
        : current,
    );
    setCommentBody("");
    setReplyTarget(null);
  };

  const deleteComment = async (comment: ThreadComment) => {
    const removedIds = new Set<string>([comment.id]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const item of comments) {
        if (
          item.parent_comment_id &&
          removedIds.has(item.parent_comment_id) &&
          !removedIds.has(item.id)
        ) {
          removedIds.add(item.id);
          changed = true;
        }
      }
    }

    const removedCount = Math.max(1, removedIds.size);
    setComments((current) =>
      current.filter((item) => !removedIds.has(item.id)),
    );
    setPost((current) =>
      current
        ? {
            ...current,
            commentCount: Math.max(
              0,
              current.commentCount - removedCount,
            ),
          }
        : current,
    );
    setError("");

    const { error: deleteError } = await getSupabaseBrowserClient()
      .from("feed_post_comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message);
      void loadThread({ quiet: true });
    }
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
      <AppShell active="Home" title="Post" eyebrow={null} socialHeader>
        <PageSkeleton title="Memuat Post..." />
      </AppShell>
    );
  }

  if (!activeMember) {
    return (
      <AppShell active="Home" title="Post" eyebrow={null} socialHeader>
        <div className="community-thread-page">
          <section className="community-feed-gate">
            <LockKeyhole aria-hidden="true" />
            <h3>Post khusus member aktif</h3>
            <p>Aktifkan akun member untuk membaca dan ikut berdiskusi.</p>
          </section>
        </div>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell active="Home" title="Post" eyebrow={null} socialHeader>
        <div className="community-thread-page">
          <Link className="community-thread-back" href="/dashboard">
            <ArrowLeft aria-hidden="true" />
            Kembali
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
    <AppShell active="Home" title="Post" eyebrow={null} socialHeader>
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
            <OfficialFeedAvatar />
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
          </header>

          <div className="community-post-copy">
            <p>{post.body}</p>
          </div>

          {post.attached_event ? (
            <CommunityEventAttachment event={post.attached_event} />
          ) : null}

          {post.link_url && getSocialUrlDetails(post.link_url) ? (
            <a
              className="community-link-preview"
              href={getSocialUrlDetails(post.link_url)!.url}
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Link2 aria-hidden="true" />
                <small>{getSocialUrlDetails(post.link_url)!.hostname}</small>
              </span>
              <b>Buka tautan</b>
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}

          <CommunityMediaGallery media={post.media} />

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
            <h2 id="thread-discussion-title">Komentar</h2>
            <span>{comments.length}</span>
          </header>

          {rootComments.length === 0 ? (
            <p className="community-no-comments">
              Belum ada komentar. Jadi yang pertama membuka percakapan.
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
                        {socialInitials(comment.author_name)}
                      </span>
                      <div className="thread-comment-content">
                        <header>
                          <strong>{comment.author_name}</strong>
                          <span>{socialRoleLabel[comment.author_role]}</span>
                          <time dateTime={comment.created_at}>
                            {socialRelativeDate(comment.created_at)}
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
                                {socialInitials(reply.author_name)}
                              </span>
                              <div className="thread-comment-content">
                                <header>
                                  <strong>{reply.author_name}</strong>
                                  <span>{socialRoleLabel[reply.author_role]}</span>
                                  <time dateTime={reply.created_at}>
                                    {socialRelativeDate(reply.created_at)}
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
