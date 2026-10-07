"use client";

import {
  socialInitials,
  socialRelativeDate,
  socialRoleLabel,
} from "@/components/community-feed-utils";
import {
  LockKeyhole,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import type { ThreadComment } from "./post-thread-data";

export function PostThreadDiscussion({
  comments,
  rootComments,
  repliesByParent,
  commentsLocked,
  userId,
  isStaff,
  commentBody,
  replyTarget,
  commentSaving,
  onCommentBodyChange,
  onReplyTargetChange,
  onStartReply,
  onDeleteComment,
  onSubmitComment,
}: {
  comments: ThreadComment[];
  rootComments: ThreadComment[];
  repliesByParent: Map<string, ThreadComment[]>;
  commentsLocked: boolean;
  userId: string | null;
  isStaff: boolean;
  commentBody: string;
  replyTarget: ThreadComment | null;
  commentSaving: boolean;
  onCommentBodyChange: (value: string) => void;
  onReplyTargetChange: (
    comment: ThreadComment | null,
  ) => void;
  onStartReply: (comment: ThreadComment) => void;
  onDeleteComment: (
    comment: ThreadComment,
  ) => Promise<void>;
  onSubmitComment: (event: FormEvent) => Promise<void>;
}) {
  return (
    <>
      <section
        className="community-thread-discussion"
        aria-labelledby="thread-discussion-title"
      >
        <header className="community-thread-discussion-head">
          <h2 id="thread-discussion-title">Komentar</h2>
          <span>{comments.length}</span>
        </header>

        {rootComments.length === 0 ? (
          <p className="community-no-comments">
            Belum ada komentar. Jadi yang pertama membuka
            percakapan.
          </p>
        ) : (
          <div className="community-thread-list">
            {rootComments.map((comment) => {
              const replies =
                repliesByParent.get(comment.id) ?? [];
              const canDelete =
                isStaff || comment.author_id === userId;

              return (
                <article
                  className={
                    "thread-comment-root" +
                    (replies.length > 0
                      ? " has-replies"
                      : "")
                  }
                  key={comment.id}
                >
                  <div className="thread-comment-line">
                    <span
                      className="community-avatar small"
                      aria-hidden="true"
                    >
                      {socialInitials(comment.author_name)}
                    </span>
                    <div className="thread-comment-content">
                      <header>
                        <strong>
                          {comment.author_name}
                        </strong>
                        <span>
                          {
                            socialRoleLabel[
                              comment.author_role
                            ]
                          }
                        </span>
                        <time dateTime={comment.created_at}>
                          {socialRelativeDate(
                            comment.created_at,
                          )}
                        </time>
                      </header>
                      <p>{comment.body}</p>
                      <div className="thread-comment-actions">
                        {!commentsLocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              onStartReply(comment)
                            }
                          >
                            Balas
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="danger"
                            onClick={() =>
                              void onDeleteComment(comment)
                            }
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
                          isStaff ||
                          reply.author_id === userId;

                        return (
                          <div
                            className="thread-comment-line"
                            key={reply.id}
                          >
                            <span
                              className="community-avatar small"
                              aria-hidden="true"
                            >
                              {socialInitials(
                                reply.author_name,
                              )}
                            </span>
                            <div className="thread-comment-content">
                              <header>
                                <strong>
                                  {reply.author_name}
                                </strong>
                                <span>
                                  {
                                    socialRoleLabel[
                                      reply.author_role
                                    ]
                                  }
                                </span>
                                <time
                                  dateTime={reply.created_at}
                                >
                                  {socialRelativeDate(
                                    reply.created_at,
                                  )}
                                </time>
                              </header>
                              <p>{reply.body}</p>
                              {canDeleteReply ? (
                                <div className="thread-comment-actions">
                                  <button
                                    type="button"
                                    className="danger"
                                    onClick={() =>
                                      void onDeleteComment(
                                        reply,
                                      )
                                    }
                                  >
                                    <Trash2
                                      aria-hidden="true"
                                    />
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

        {commentsLocked ? (
          <p className="community-comments-locked">
            <LockKeyhole aria-hidden="true" />
            Pengurus telah menutup komentar untuk post ini.
          </p>
        ) : null}
      </section>

      {!commentsLocked ? (
        <form
          className="community-thread-composer"
          onSubmit={onSubmitComment}
        >
          {replyTarget ? (
            <div className="community-reply-target">
              <span>
                Membalas <b>{replyTarget.author_name}</b>
              </span>
              <button
                type="button"
                onClick={() => onReplyTargetChange(null)}
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
              onChange={(event) =>
                onCommentBodyChange(event.target.value)
              }
              maxLength={1000}
              placeholder={
                replyTarget
                  ? "Tulis balasan…"
                  : "Tulis komentar…"
              }
              required
            />
            <button
              type="submit"
              disabled={
                commentSaving || !commentBody.trim()
              }
            >
              <Send aria-hidden="true" />
              <span className="sr-only">
                Kirim komentar
              </span>
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
