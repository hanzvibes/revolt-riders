import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ThreadComment } from "./post-thread-data";

export async function setThreadLike({
  postId,
  userId,
  liked,
}: {
  postId: string;
  userId: string;
  liked: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  const result = liked
    ? await supabase
        .from("feed_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId)
    : await supabase
        .from("feed_post_likes")
        .insert({
          post_id: postId,
          user_id: userId,
        });

  if (result.error) throw result.error;
}

export async function createThreadComment({
  postId,
  parentCommentId,
  body,
}: {
  postId: string;
  parentCommentId: string | null;
  body: string;
}): Promise<ThreadComment> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("feed_post_comments")
    .insert({
      post_id: postId,
      parent_comment_id: parentCommentId,
      body: body.trim(),
    })
    .select(
      "id,post_id,parent_comment_id,body,author_id,author_name,author_role,created_at",
    )
    .single();

  if (error) throw error;
  if (!data) {
    throw new Error("Komentar belum dapat dikirim.");
  }

  return data as ThreadComment;
}

export async function removeThreadComment(
  commentId: string,
) {
  const { error } = await getSupabaseBrowserClient()
    .from("feed_post_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}
