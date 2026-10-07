"use client";

import { ModalSheet } from "@/components/modal-sheet";
import { Check, ImagePlus, LoaderCircle, LockKeyhole, MessageCircle, Pin, Plus, Sparkles, X } from "lucide-react";
import { type FormEvent } from "react";
import { ComposerPostPreview, FeedPostCard, FeedSkeleton } from "./community-feed-presentation";

import { useCommunityFeedController } from "./community-feed-controller";

export function CommunityFeed({
  composerOpen: controlledComposerOpen,
  onComposerOpenChange,
}: {
  composerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
} = {}) {

  const { router, user, account, accessLoading, posts, loading, loadingMore, hasMore, loadMoreRef, error, newPostsAvailable, composerOpen, setComposerOpen, availableEvents, postEventId, setPostEventId, postSaving, postBody, setPostBody, postLink, setPostLink, postFiles, setPostFiles, pinPost, setPinPost, lockComments, setLockComments, composerMode, setComposerMode, previewAuthorName, editingPost, existingMedia, setExistingMedia, previewMedia, selectedPreviewEvent, activeMember, isStaff, refreshFromBanner, toggleLike, openEditPost, managePost, handleFiles, closeComposer, submitPost, emptyCopy, pinnedPosts, visiblePosts } = useCommunityFeedController(controlledComposerOpen, onComposerOpenChange);

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
