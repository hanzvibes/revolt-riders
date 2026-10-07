"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  manageFeedPost,
  toggleFeedLike,
} from "./community-feed-actions";
import { fetchFeedPage } from "./community-feed-data";
import {
  FEED_PAGE_SIZE,
  feedErrorMessage,
  type FeedManageAction,
  type FeedPost,
  type RealtimeChangePayload,
} from "./community-feed-model";

export function useCommunityFeedPosts({
  activeMember,
  accessLoading,
  userId,
}: {
  activeMember: boolean;
  accessLoading: boolean;
  userId?: string;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [loadedCount, setLoadedCount] = useState(FEED_PAGE_SIZE);
  const [loadMoreNode, setLoadMoreNode] = useState<HTMLDivElement | null>(null);

  const loadFeed = useCallback(
    async ({
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
      if (!activeMember || !userId) {
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
        const page = await fetchFeedPage({
          userId,
          from,
          pageSize,
        });

        if (append) {
          const incomingIds = new Set(page.posts.map((post) => post.id));
          setPosts((current) => [
            ...current.filter((post) => !incomingIds.has(post.id)),
            ...page.posts,
          ]);
          setLoadedCount(from + page.rowCount);
        } else {
          setPosts(page.posts);
          setLoadedCount(page.rowCount);
        }

        setHasMore(page.hasMore);
      } catch (cause) {
        console.error("Gagal memuat Kabar Revolt.", cause);
        setError(feedErrorMessage(cause));
      } finally {
        if (append) setLoadingMore(false);
        else if (!quiet) setLoading(false);
      }
    },
    [activeMember, userId],
  );

  const refreshLoadedFeed = useCallback(
    () =>
      loadFeed({
        pageSize: Math.max(FEED_PAGE_SIZE, loadedCount),
        quiet: true,
      }),
    [loadFeed, loadedCount],
  );

  useEffect(() => {
    if (!accessLoading) void loadFeed();
  }, [accessLoading, loadFeed]);

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
        (payload: unknown) => {
          const change = payload as RealtimeChangePayload;

          if (change.eventType === "INSERT") {
            const record = change.new ?? {};
            if (
              record.status === "published" &&
              record.author_id !== userId
            ) {
              setNewPostsAvailable(true);
            }
            return;
          }

          if (change.eventType === "DELETE") {
            const id = change.old?.id;
            if (typeof id !== "string") return;
            setPosts((current) => current.filter((post) => post.id !== id));
            return;
          }

          if (change.eventType !== "UPDATE") return;

          const record = change.new ?? {};
          const id = record.id;
          if (typeof id !== "string") return;

          if (
            typeof record.status === "string" &&
            record.status !== "published"
          ) {
            setPosts((current) => current.filter((post) => post.id !== id));
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
  }, [activeMember, userId]);

  useEffect(() => {
    if (!activeMember || loading || loadingMore || !hasMore) return;

    if (!loadMoreNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        void loadFeed({ from: posts.length, append: true });
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(loadMoreNode);
    return () => observer.disconnect();
  }, [activeMember, hasMore, loadFeed, loadMoreNode, loading, loadingMore, posts.length]);

  const refreshFromBanner = useCallback(() => {
    setNewPostsAvailable(false);
    void loadFeed();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadFeed]);

  const toggleLike = useCallback(
    async (post: FeedPost) => {
      if (!userId || !activeMember) return;

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                likedByMe: !item.likedByMe,
                likeCount: Math.max(
                  0,
                  item.likeCount + (item.likedByMe ? -1 : 1),
                ),
              }
            : item,
        ),
      );

      try {
        await toggleFeedLike({ post, userId });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Suka belum dapat diperbarui.",
        );
        void refreshLoadedFeed();
      }
    },
    [activeMember, refreshLoadedFeed, userId],
  );

  const managePost = useCallback(
    async (post: FeedPost, action: FeedManageAction) => {
      try {
        await manageFeedPost({ post, posts, action });
        void refreshLoadedFeed();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Post belum dapat diperbarui.",
        );
      }
    },
    [posts, refreshLoadedFeed],
  );

  const pinnedPosts = useMemo(
    () => posts.filter((post) => post.is_pinned).slice(0, 2),
    [posts],
  );

  const visiblePosts = useMemo(() => {
    const pinnedIds = new Set(pinnedPosts.map((post) => post.id));
    return posts.filter((post) => !pinnedIds.has(post.id));
  }, [pinnedPosts, posts]);

  return {
    posts,
    pinnedPosts,
    visiblePosts,
    loading,
    loadingMore,
    hasMore,
    error,
    newPostsAvailable,
    setLoadMoreNode,
    setError,
    refreshFromBanner,
    refreshLoadedFeed,
    toggleLike,
    managePost,
  };
}
