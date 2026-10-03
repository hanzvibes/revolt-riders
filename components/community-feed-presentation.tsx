"use client";

import {
  CommunityEventAttachment,
  CommunityMediaGallery,
  OfficialFeedAvatar,
} from "@/components/community-feed-primitives";
import {
  getSocialUrlDetails,
  socialRelativeDate,
  socialRoleLabel,
} from "@/components/community-feed-utils";
import type { AppRole } from "@/context/data-cache-context";
import {
  Archive,
  ChevronDown,
  ExternalLink,
  Heart,
  Link2,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  UnlockKeyhole,
} from "lucide-react";
import { useState } from "react";
import type {
  FeedEvent,
  FeedManageAction,
  FeedMedia,
  FeedPost,
} from "./community-feed-model";

export function FeedSkeleton() {
  return (
    <div
      className="community-feed-skeleton"
      aria-label="Memuat Feed"
      aria-live="polite"
    >
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

export function FeedPostCard({
  post,
  isStaff,
  currentRole,
  currentUserId,
  onToggleLike,
  onOpenDiscussion,
  onEdit,
  onManage,
}: {
  post: FeedPost;
  isStaff: boolean;
  currentRole?: AppRole;
  currentUserId?: string;
  onToggleLike: (post: FeedPost) => void;
  onOpenDiscussion: (post: FeedPost) => void;
  onEdit: (post: FeedPost) => void;
  onManage: (post: FeedPost, action: FeedManageAction) => void;
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
              {post.is_pinned ? (
                <span className="community-pin-label">
                  <Pin aria-hidden="true" />
                  Disematkan
                </span>
              ) : null}
            </span>

            {canManage ? (
              <details className="community-post-menu">
                <summary aria-label={`Kelola post ${post.author_name}`}>
                  <MoreHorizontal aria-hidden="true" />
                </summary>
                <div>
                  <button type="button" onClick={() => onEdit(post)}>
                    <Pencil aria-hidden="true" />
                    Edit post
                  </button>
                  <button type="button" onClick={() => onManage(post, "pin")}>
                    <Pin aria-hidden="true" />
                    {post.is_pinned ? "Lepas sematan" : "Sematkan"}
                  </button>
                  <button type="button" onClick={() => onManage(post, "comments")}>
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

export function ComposerPostPreview({
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
