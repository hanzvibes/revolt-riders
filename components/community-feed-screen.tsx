"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { SOCIAL_FEED_STAFF_ROLES } from "@/components/community-feed-utils";
import { ModalSheet } from "@/components/modal-sheet";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Pin,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  manageFeedPost,
  saveFeedPost,
  toggleFeedLike,
} from "./community-feed-actions";
import {
  fetchFeedComposerOptions,
  fetchFeedPage,
} from "./community-feed-data";
import {
  FEED_MAX_MEDIA,
  FEED_PAGE_SIZE,
  feedErrorMessage,
  validateFeedFiles,
  type FeedEvent,
  type FeedManageAction,
  type FeedMedia,
  type FeedPost,
  type RealtimeChangePayload,
} from "./community-feed-model";
import {
  ComposerPostPreview,
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

  const setComposerOpen = useCallback(
    (open: boolean) => {
      if (controlledComposerOpen === undefined) {
        setInternalComposerOpen(open);
      }
      onComposerOpenChange?.(open);
    },
    [controlledComposerOpen, onComposerOpenChange],
  );

  const [availableEvents, setAvailableEvents] = useState<FeedEvent[]>([]);
  const [postEventId, setPostEventId] = useState("");
  const [postSaving, setPostSaving] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [postLink, setPostLink] = useState("");
  const [postFiles, setPostFiles] = useState<File[]>([]);
  const [pinPost, setPinPost] = useState(false);
  const [lockComments, setLockComments] = useState(false);
  const [composerMode, setComposerMode] = useState<"edit" | "preview">("edit");
  const [previewAuthorName, setPreviewAuthorName] = useState(
    "Pengurus Revolt Riders",
  );
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [existingMedia, setExistingMedia] = useState<FeedMedia[]>([]);
  const [previewMedia, setPreviewMedia] = useState<FeedMedia[]>([]);

  useEffect(() => {
    const local = postFiles.map((file, index) => ({
      id: `preview-${index}-${file.name}`,
      object_path: "",
      alt_text: `Preview foto ${existingMedia.length + index + 1}`,
      sort_order: existingMedia.length + index,
      signedUrl: URL.createObjectURL(file),
    }));

    setPreviewMedia([
      ...existingMedia.map((item, index) => ({
        ...item,
        sort_order: index,
      })),
      ...local,
    ]);

    return () => {
      for (const item of local) {
        if (item.signedUrl) URL.revokeObjectURL(item.signedUrl);
      }
    };
  }, [existingMedia, postFiles]);

  const selectedPreviewEvent = useMemo(
    () => availableEvents.find((event) => event.id === postEventId) ?? null,
    [availableEvents, postEventId],
  );

  const activeMember = account?.status === "active";
  const isStaff =
    account?.status === "active" &&
    SOCIAL_FEED_STAFF_ROLES.includes(account.role);

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
        const page = await fetchFeedPage({
          userId: user.id,
          from,
          pageSize,
        });

        if (append) {
          const incomingIds = new Set(page.posts.map((post) => post.id));
          setPosts((current) => [
            ...current.filter((post) => !incomingIds.has(post.id)),
            ...page.posts,
          ]);
          loadedCountRef.current = from + page.rowCount;
        } else {
          setPosts(page.posts);
          loadedCountRef.current = page.rowCount;
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
    [activeMember, user],
  );

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
      try {
        const result = await fetchFeedComposerOptions({
          memberExternalId: account?.member_external_id,
          editingEvent: editingPost?.attached_event,
        });

        if (!active) return;
        if (result.authorName) setPreviewAuthorName(result.authorName);
        setAvailableEvents(result.events);
      } catch (cause) {
        if (!active) return;
        console.error("Agenda/Voyager untuk composer gagal dimuat.", cause);
      }
    };

    void loadEvents();
    return () => {
      active = false;
    };
  }, [
    account?.member_external_id,
    composerOpen,
    editingPost?.attached_event,
    isStaff,
  ]);

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
              record.author_id !== user?.id
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
      await toggleFeedLike({ post, userId: user.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Suka belum dapat diperbarui.");
      void loadFeed({
        pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current),
        quiet: true,
      });
    }
  };

  const openEditPost = (post: FeedPost) => {
    setEditingPost(post);
    setPostBody(post.body);
    setPostLink(post.link_url ?? "");
    setPostEventId(post.event_id ?? "");
    setPinPost(post.is_pinned);
    setLockComments(post.comments_locked);
    setExistingMedia(post.media);
    setPostFiles([]);
    setPreviewAuthorName(post.author_name);
    setComposerMode("edit");
    setError("");
    setComposerOpen(true);
  };

  const managePost = async (post: FeedPost, action: FeedManageAction) => {
    try {
      await manageFeedPost({ post, posts, action });
      void loadFeed({
        pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current),
        quiet: true,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Post belum dapat diperbarui.");
    }
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const availableSlots = Math.max(0, FEED_MAX_MEDIA - existingMedia.length);
    const combined = [...postFiles, ...files].slice(0, availableSlots);
    const validationError = validateFeedFiles(combined);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPostFiles(combined);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setPostBody("");
    setPostLink("");
    setPostFiles([]);
    setPostEventId("");
    setPinPost(false);
    setLockComments(false);
    setComposerMode("edit");
    setEditingPost(null);
    setExistingMedia([]);
  };

  const submitPost = async (event: FormEvent, publish: boolean) => {
    event.preventDefault();
    if (!postBody.trim()) return;

    setPostSaving(true);
    setError("");

    try {
      await saveFeedPost({
        editingPost,
        body: postBody,
        linkUrl: postLink,
        eventId: postEventId,
        pinned: pinPost,
        commentsLocked: lockComments,
        existingMedia,
        files: postFiles,
        publish,
      });

      closeComposer();
      invalidateCache("dashboard_");
      await loadFeed({
        pageSize: Math.max(FEED_PAGE_SIZE, loadedCountRef.current),
        quiet: true,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : editingPost
            ? "Perubahan post belum dapat disimpan."
            : "Post belum dapat disimpan.",
      );
    } finally {
      setPostSaving(false);
    }
  };

  const emptyCopy = isStaff
    ? "Belum ada post. Bagikan kabar pertama untuk member Revolt Riders."
    : "Belum ada kabar dari pengurus. Post terbaru akan muncul di sini.";
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
        <section className="community-feed-gate">
          <LockKeyhole aria-hidden="true" />
          <h3>Feed khusus member aktif</h3>
          <p>
            Masuk dan aktifkan akun member untuk mengikuti kabar komunitas Revolt Riders.
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
                  onOpenDiscussion={(item) => router.push(`/post/${item.id}`)}
                  onEdit={openEditPost}
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
                  onOpenDiscussion={(item) => router.push(`/post/${item.id}`)}
                  onEdit={openEditPost}
                  onManage={managePost}
                />
              ))}
              {posts.length === 0 ? (
                <section className="community-feed-empty">
                  <MessageCircle aria-hidden="true" />
                  <h3>Belum ada kabar</h3>
                  <p>{emptyCopy}</p>
                  {isStaff ? (
                    <button type="button" onClick={() => setComposerOpen(true)}>
                      <Plus aria-hidden="true" /> Buat post pertama
                    </button>
                  ) : null}
                </section>
              ) : null}
              {posts.length > 0 && hasMore ? (
                <div
                  ref={loadMoreRef}
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
                <p className="community-feed-end">Semua kabar sudah dilihat.</p>
              ) : null}
            </div>
          )}
        </>
      )}

      <ModalSheet
        open={Boolean(isStaff && composerOpen)}
        onClose={closeComposer}
        title={editingPost ? "Edit post" : "Buat post"}
        eyebrow=""
      >
        <form
          className="community-composer"
          onSubmit={(event) => void submitPost(event, true)}
        >
          <div
            className="community-composer-mode"
            role="tablist"
            aria-label="Mode composer"
          >
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

              {existingMedia.length > 0 ? (
                <div className="community-existing-media">
                  <span>
                    Foto terpasang
                    <small>
                      {existingMedia.length} foto · hapus dari sini bila tidak ingin dipertahankan
                    </small>
                  </span>
                  <div>
                    {existingMedia.map((item, index) => (
                      <span key={item.id}>
                        <b>Foto {index + 1}</b>
                        <button
                          type="button"
                          aria-label={`Hapus foto ${index + 1}`}
                          onClick={() =>
                            setExistingMedia((media) =>
                              media.filter((entry) => entry.id !== item.id),
                            )
                          }
                        >
                          <X aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="community-upload-control">
                <span>
                  Foto dokumentasi
                  <small>Maks. 4 foto total · JPG, PNG, atau WEBP</small>
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
              authorRole={editingPost?.author_role ?? account?.role ?? "member"}
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
            ) : editingPost ? (
              <button
                type="button"
                className="outline-action"
                onClick={closeComposer}
              >
                Batal
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
                  {editingPost ? "Simpan perubahan" : "Terbitkan"}
                </>
              )}
            </button>
          </div>
        </form>
      </ModalSheet>
    </section>
  );
}
