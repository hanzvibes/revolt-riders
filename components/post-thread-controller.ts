"use client";

import {
  SOCIAL_FEED_STAFF_ROLES,
} from "@/components/community-feed-utils";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  createThreadComment,
  removeThreadComment,
  setThreadLike,
} from "./post-thread-actions";
import {
  fetchThreadSnapshot,
  type ThreadComment,
  type ThreadPost,
} from "./post-thread-data";
import {
  getThreadCommentTree,
  getThreadRemovedCommentIds,
  upsertThreadComment,
} from "./post-thread-model";

type RealtimeChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

export function usePostThreadController(postId?: string) {
  const {
    user,
    account,
    loading: accessLoading,
  } = useDataCache();

  const [post, setPost] =
    useState<ThreadPost | null>(null);
  const [comments, setComments] = useState<
    ThreadComment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [replyTarget, setReplyTarget] =
    useState<ThreadComment | null>(null);
  const [commentSaving, setCommentSaving] =
    useState(false);

  const userId = user?.id ?? null;
  const activeMember = account?.status === "active";
  const isStaff =
    account?.status === "active" &&
    SOCIAL_FEED_STAFF_ROLES.includes(account.role);

  const loadThread = useCallback(
    async (
      { quiet = false }: { quiet?: boolean } = {},
    ) => {
      if (!postId || !userId || !activeMember) {
        setPost(null);
        setComments([]);
        setLoading(false);
        return;
      }

      if (!quiet) setLoading(true);
      setError("");

      try {
        const snapshot = await fetchThreadSnapshot({
          postId,
          userId,
        });

        setPost(snapshot.post);
        setComments(snapshot.comments);

        if (!snapshot.post) {
          setError("Post ini tidak tersedia.");
        }
      } catch (cause) {
        console.error("Thread gagal dimuat.", cause);
        setError(
          cause instanceof Error
            ? cause.message
            : "Post belum dapat dimuat.",
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [activeMember, postId, userId],
  );

  useEffect(() => {
    if (accessLoading) return;

    const timer = window.setTimeout(() => {
      void loadThread();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [accessLoading, loadThread]);

  useEffect(() => {
    if (!activeMember || !postId) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("feed-thread-" + postId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feed_post_comments",
        },
        (payload: unknown) => {
          const change =
            payload as RealtimeChangePayload;

          if (change.eventType === "DELETE") {
            const id = change.old?.id;
            if (typeof id !== "string") return;

            setComments((current) =>
              current.filter(
                (comment) => comment.id !== id,
              ),
            );
            return;
          }

          const record = change.new;
          if (!record || record.post_id !== postId) {
            return;
          }

          if (
            change.eventType === "INSERT" ||
            change.eventType === "UPDATE"
          ) {
            setComments((current) =>
              upsertThreadComment(
                current,
                record as ThreadComment,
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
          filter: "id=eq." + postId,
        },
        (payload: unknown) => {
          const change =
            payload as RealtimeChangePayload;
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
                    typeof record.comments_locked ===
                    "boolean"
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

  const toggleLike = useCallback(async () => {
    if (!post || !userId || !activeMember) return;

    const wasLiked = post.likedByMe;
    setPost({
      ...post,
      likedByMe: !wasLiked,
      likeCount: Math.max(
        0,
        post.likeCount + (wasLiked ? -1 : 1),
      ),
    });

    try {
      await setThreadLike({
        postId: post.id,
        userId,
        liked: wasLiked,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Status suka belum dapat diperbarui.",
      );
      void loadThread({ quiet: true });
    }
  }, [activeMember, loadThread, post, userId]);

  const submitComment = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (
        !post ||
        !commentBody.trim() ||
        post.comments_locked
      ) {
        return;
      }

      setCommentSaving(true);
      setError("");

      try {
        const nextComment =
          await createThreadComment({
            postId: post.id,
            parentCommentId: replyTarget?.id ?? null,
            body: commentBody,
          });

        setComments((current) =>
          upsertThreadComment(current, nextComment),
        );
        setPost((current) =>
          current
            ? {
                ...current,
                commentCount:
                  current.commentCount + 1,
              }
            : current,
        );
        setCommentBody("");
        setReplyTarget(null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Komentar belum dapat dikirim.",
        );
      } finally {
        setCommentSaving(false);
      }
    },
    [commentBody, post, replyTarget],
  );

  const deleteComment = useCallback(
    async (comment: ThreadComment) => {
      const removedIds =
        getThreadRemovedCommentIds(
          comments,
          comment.id,
        );
      const removedCount = Math.max(
        1,
        removedIds.size,
      );

      setComments((current) =>
        current.filter(
          (item) => !removedIds.has(item.id),
        ),
      );
      setPost((current) =>
        current
          ? {
              ...current,
              commentCount: Math.max(
                0,
                current.commentCount -
                  removedCount,
              ),
            }
          : current,
      );
      setError("");

      try {
        await removeThreadComment(comment.id);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Komentar belum dapat dihapus.",
        );
        void loadThread({ quiet: true });
      }
    },
    [comments, loadThread],
  );

  const startReply = useCallback(
    (comment: ThreadComment) => {
      setReplyTarget(comment);
      setCommentBody("");
      window.requestAnimationFrame(() =>
        document
          .getElementById("thread-comment-box")
          ?.focus(),
      );
    },
    [],
  );

  const commentTree = useMemo(
    () => getThreadCommentTree(comments),
    [comments],
  );

  return {
    userId,
    accessLoading,
    activeMember,
    isStaff,
    post,
    comments,
    loading,
    error,
    commentBody,
    replyTarget,
    commentSaving,
    rootComments: commentTree.rootComments,
    repliesByParent: commentTree.repliesByParent,
    setCommentBody,
    setReplyTarget,
    toggleLike,
    submitComment,
    deleteComment,
    startReply,
  };
}
