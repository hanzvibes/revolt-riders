export type ThreadCommentLike = {
  id: string;
  parent_comment_id: string | null;
};

export function getRootComments<T extends ThreadCommentLike>(comments: readonly T[]): T[] {
  return comments.filter((comment) => !comment.parent_comment_id);
}

export function buildRepliesByParent<T extends ThreadCommentLike>(
  comments: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const comment of comments) {
    if (!comment.parent_comment_id) continue;
    const current = map.get(comment.parent_comment_id) ?? [];
    current.push(comment);
    map.set(comment.parent_comment_id, current);
  }
  return map;
}
