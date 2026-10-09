"use client";

import { SOCIAL_FEED_STAFF_ROLES } from "@/components/community-feed-utils";
import { useDataCache } from "@/context/data-cache-context";
import {
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CommunityFeedComposer,
  useCommunityFeedComposer,
} from "./community-feed-composer";
import { useCommunityFeedPosts } from "./community-feed-posts";
import {
  FeedPostCard,
  FeedSkeleton,
} from "./community-feed-presentation";

export function CommunityFeed({
  composerOpen: controlledComposerOpen,
  onComposerOpenChange,
}: {
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const {
    user,
    account,
    loading: accessLoading,
    invalidateCache,
  } = useDataCache();

  const activeMember = account?.status === "active";
  const isStaff =
    activeMember && SOCIAL_FEED_STAFF_ROLES.includes(account.role);

  const {
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
  } = useCommunityFeedPosts({
    activeMember,
    accessLoading,
    userId: user?.id,
  });

  const composer = useCommunityFeedComposer({
    controlledComposerOpen,
    onComposerOpenChange,
    isStaff,
    memberExternalId: account?.member_external_id,
    invalidateCache,
    refreshFeed: refreshLoadedFeed,
    setFeedError: setError,
  });

  const emptyCopy = isStaff
    ? "Belum ada post. Bagikan kabar pertama untuk member Revolt Riders."
    : "Belum ada kabar dari pengurus. Post terbaru akan muncul di sini.";

  return (
    <section
      className="community-feed-page"
      aria-labelledby="community-feed-title"
    >
      <header className="community-feed-heading">
        <h2 id="community-feed-title">Feed</h2>
      </header>

      {!activeMember && !accessLoading ? (
        <section className="community-feed-gate">
          <LockKeyhole aria-hidden="true" />
          <h3>Feed khusus member aktif</h3>
          <p>
            Masuk dan aktifkan akun member untuk mengikuti kabar komunitas
            Revolt Riders.
          </p>
        </section>
      ) : (
        <>
          {newPostsAvailable ? (
            <button
              className="community-new-posts"
              type="button"
              onClick={refreshFromBanner}
            >
              <Sparkles aria-hidden="true" /> Post baru tersedia
            </button>
          ) : null}

          {error ? (
            <p className="community-feed-error" role="alert">
              {error}
            </p>
          ) : null}

          {loading ? (
            <FeedSkeleton />
          ) : (
            <div className="community-feed-list">
              {pinnedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  isStaff={isStaff}
                  currentRole={account?.role}
                  currentUserId={user?.id}
                  onToggleLike={toggleLike}
                  onOpenDiscussion={(item) =>
                    router.push("/post/" + item.id)
                  }
                  onEdit={composer.openEditPost}
                  onManage={managePost}
                />
              ))}

              {visiblePosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  isStaff={isStaff}
                  currentRole={account?.role}
                  currentUserId={user?.id}
                  onToggleLike={toggleLike}
                  onOpenDiscussion={(item) =>
                    router.push("/post/" + item.id)
                  }
                  onEdit={composer.openEditPost}
                  onManage={managePost}
                />
              ))}

              {posts.length === 0 ? (
                <section className="community-feed-empty">
                  <MessageCircle aria-hidden="true" />
                  <h3>Belum ada kabar</h3>
                  <p>{emptyCopy}</p>
                  {isStaff ? (
                    <button
                      type="button"
                      onClick={() => composer.setComposerOpen(true)}
                    >
                      <Plus aria-hidden="true" /> Buat post pertama
                    </button>
                  ) : null}
                </section>
              ) : null}

              {posts.length > 0 && hasMore ? (
                <div
                  ref={setLoadMoreNode}
                  className="community-feed-sentinel"
                  aria-live="polite"
                >
                  {loadingMore ? (
                    <>
                      <LoaderCircle className="spin" aria-hidden="true" />
                      Memuat kabar lainnya…
                    </>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </div>
              ) : null}

              {posts.length > 0 && !hasMore ? (
                <p className="community-feed-end">
                  Semua kabar sudah dilihat.
                </p>
              ) : null}
            </div>
          )}
        </>
      )}

      <CommunityFeedComposer
        isStaff={isStaff}
        accountRole={account?.role}
        controller={composer}
      />
    </section>
  );
}
