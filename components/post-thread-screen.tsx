"use client";

import { AppShell } from "@/components/app-shell";
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
import { PageSkeleton } from "@/components/skeleton";
import {
  ExternalLink,
  Heart,
  Link2,
  LockKeyhole,
  MessageCircle,
} from "lucide-react";
import { useParams } from "next/navigation";

import { PostThreadDiscussion } from "./post-thread-discussion";
import { usePostThreadController } from "./post-thread-controller";

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const postId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;
  const {
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
    rootComments,
    repliesByParent,
    setCommentBody,
    setReplyTarget,
    toggleLike,
    submitComment,
    deleteComment,
    startReply,
  } = usePostThreadController(postId);

  if (accessLoading || loading) {
    return (
      <AppShell active="Home" title="Post" eyebrow={null} socialHeader headerBackHref="/dashboard">
        <PageSkeleton title="Memuat Post..." />
      </AppShell>
    );
  }

  if (!activeMember) {
    return (
      <AppShell active="Home" title="Post" eyebrow={null} socialHeader headerBackHref="/dashboard">
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
      <AppShell active="Home" title="Post" eyebrow={null} socialHeader headerBackHref="/dashboard">
        <div className="community-thread-page">
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
    <AppShell active="Home" title="Post" eyebrow={null} socialHeader headerBackHref="/dashboard">
      <div className="community-thread-page dashboard-social-feed-v1">
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

        <PostThreadDiscussion
          comments={comments}
          rootComments={rootComments}
          repliesByParent={repliesByParent}
          commentsLocked={post.comments_locked}
          userId={userId}
          isStaff={isStaff}
          commentBody={commentBody}
          replyTarget={replyTarget}
          commentSaving={commentSaving}
          onCommentBodyChange={setCommentBody}
          onReplyTargetChange={setReplyTarget}
          onStartReply={startReply}
          onDeleteComment={deleteComment}
          onSubmitComment={submitComment}
        />
      </div>
    </AppShell>
  );
}
