"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { ModalSheet } from "@/components/modal-sheet";
import type { AppRole } from "@/context/data-cache-context";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Pin,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { saveFeedPost } from "./community-feed-actions";
import { fetchFeedComposerOptions } from "./community-feed-data";
import {
  FEED_MAX_MEDIA,
  validateFeedFiles,
  type FeedEvent,
  type FeedMedia,
  type FeedPost,
} from "./community-feed-model";
import { ComposerPostPreview } from "./community-feed-presentation";

export function useCommunityFeedComposer({
  controlledComposerOpen,
  onComposerOpenChange,
  isStaff,
  memberExternalId,
  invalidateCache,
  refreshFeed,
  setFeedError,
}: {
  controlledComposerOpen?: boolean;
  onComposerOpenChange?: (open: boolean) => void;
  isStaff: boolean;
  memberExternalId?: string | null;
  invalidateCache: (keyPrefix?: string) => void;
  refreshFeed: () => Promise<void>;
  setFeedError: (message: string) => void;
}) {
  const [internalComposerOpen, setInternalComposerOpen] = useState(false);
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

  useEffect(() => {
    const local = postFiles.map((file, index) => ({
      id: "preview-" + index + "-" + file.name,
      object_path: "",
      alt_text: "Preview foto " + (existingMedia.length + index + 1),
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
          memberExternalId,
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
  }, [composerOpen, editingPost?.attached_event, isStaff, memberExternalId]);

  const openEditPost = useCallback(
    (post: FeedPost) => {
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
      setFeedError("");
      setComposerOpen(true);
    },
    [setComposerOpen, setFeedError],
  );

  const handleFiles = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      const availableSlots = Math.max(
        0,
        FEED_MAX_MEDIA - existingMedia.length,
      );
      const combined = [...postFiles, ...files].slice(0, availableSlots);
      const validationError = validateFeedFiles(combined);

      if (validationError) {
        setFeedError(validationError);
        return;
      }

      setPostFiles(combined);
    },
    [existingMedia.length, postFiles, setFeedError],
  );

  const closeComposer = useCallback(() => {
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
  }, [setComposerOpen]);

  const submitPost = useCallback(
    async (event: FormEvent, publish: boolean) => {
      event.preventDefault();
      if (!postBody.trim()) return;

      setPostSaving(true);
      setFeedError("");

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
        await refreshFeed();
      } catch (cause) {
        setFeedError(
          cause instanceof Error
            ? cause.message
            : editingPost
              ? "Perubahan post belum dapat disimpan."
              : "Post belum dapat disimpan.",
        );
      } finally {
        setPostSaving(false);
      }
    },
    [
      closeComposer,
      editingPost,
      existingMedia,
      invalidateCache,
      lockComments,
      pinPost,
      postBody,
      postEventId,
      postFiles,
      postLink,
      refreshFeed,
      setFeedError,
    ],
  );

  return {
    composerOpen,
    availableEvents,
    postEventId,
    postSaving,
    postBody,
    postLink,
    postFiles,
    pinPost,
    lockComments,
    composerMode,
    previewAuthorName,
    editingPost,
    existingMedia,
    previewMedia,
    selectedPreviewEvent,
    setComposerOpen,
    setPostEventId,
    setPostBody,
    setPostLink,
    setPostFiles,
    setPinPost,
    setLockComments,
    setComposerMode,
    setExistingMedia,
    openEditPost,
    handleFiles,
    closeComposer,
    submitPost,
  };
}

type CommunityFeedComposerController = ReturnType<
  typeof useCommunityFeedComposer
>;

export function CommunityFeedComposer({
  isStaff,
  accountRole,
  controller,
}: {
  isStaff: boolean;
  accountRole?: AppRole;
  controller: CommunityFeedComposerController;
}) {
  const {
    composerOpen,
    availableEvents,
    postEventId,
    postSaving,
    postBody,
    postLink,
    postFiles,
    pinPost,
    lockComments,
    composerMode,
    previewAuthorName,
    editingPost,
    existingMedia,
    previewMedia,
    selectedPreviewEvent,
    setPostEventId,
    setPostBody,
    setPostLink,
    setPostFiles,
    setPinPost,
    setLockComments,
    setComposerMode,
    setExistingMedia,
    handleFiles,
    closeComposer,
    submitPost,
  } = controller;

  return (
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
                    {event.type === "voyager" ? "Voyager" : "Agenda"} ·{" "}
                    {event.title}
                  </option>
                ))}
              </select>
            </label>

            {existingMedia.length > 0 ? (
              <div className="community-existing-media">
                <span>
                  Foto terpasang
                  <small>
                    {existingMedia.length} foto · hapus dari sini bila tidak
                    ingin dipertahankan
                  </small>
                </span>
                <div>
                  {existingMedia.map((item, index) => (
                    <span key={item.id}>
                      <b>Foto {index + 1}</b>
                      <button
                        type="button"
                        aria-label={"Hapus foto " + (index + 1)}
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
                  <span key={file.name + "-" + index}>
                    {file.name}
                    <button
                      type="button"
                      aria-label={"Hapus " + file.name}
                      onClick={() =>
                        setPostFiles((files) =>
                          files.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
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
            authorRole={editingPost?.author_role ?? accountRole ?? "member"}
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
  );
}
