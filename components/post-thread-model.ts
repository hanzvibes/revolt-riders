import type { ThreadComment } from "./post-thread-data";

export function sortThreadComments(
  comments: ThreadComment[],
) {
  return comments
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime(),
    );
}

export function upsertThreadComment(
  comments: ThreadComment[],
  nextComment: ThreadComment,
) {
  const existing = comments.some(
    (comment) => comment.id === nextComment.id,
  );

  if (existing) {
    return comments.map((comment) =>
      comment.id === nextComment.id
        ? nextComment
        : comment,
    );
  }

  return sortThreadComments([...comments, nextComment]);
}

export function getThreadCommentTree(
  comments: ThreadComment[],
) {
  const rootComments = comments.filter(
    (comment) => !comment.parent_comment_id,
  );
  const repliesByParent = new Map<
    string,
    ThreadComment[]
  >();

  for (const comment of comments) {
    if (!comment.parent_comment_id) continue;

    const current =
      repliesByParent.get(comment.parent_comment_id) ?? [];
    current.push(comment);
    repliesByParent.set(
      comment.parent_comment_id,
      current,
    );
  }

  return { rootComments, repliesByParent };
}

export function getThreadRemovedCommentIds(
  comments: ThreadComment[],
  commentId: string,
) {
  const removedIds = new Set<string>([commentId]);
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

  return removedIds;
}
