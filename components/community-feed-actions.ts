import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  FEED_MAX_PINNED_POSTS,
  FEED_MEDIA_BUCKET,
  type FeedManageAction,
  type FeedMedia,
  type FeedPost,
} from "./community-feed-model";

export async function toggleFeedLike({
  post,
  userId,
}: {
  post: FeedPost;
  userId: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const result = post.likedByMe
    ? await supabase
        .from("feed_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId)
    : await supabase
        .from("feed_post_likes")
        .insert({ post_id: post.id, user_id: userId });

  if (result.error) throw result.error;
}

export async function manageFeedPost({
  post,
  posts,
  action,
}: {
  post: FeedPost;
  posts: FeedPost[];
  action: FeedManageAction;
}) {
  const supabase = getSupabaseBrowserClient();

  if (action === "pin" && !post.is_pinned) {
    const otherPinned = posts
      .filter((item) => item.is_pinned && item.id !== post.id)
      .sort(
        (a, b) =>
          new Date(b.published_at ?? b.created_at).getTime() -
          new Date(a.published_at ?? a.created_at).getTime(),
      );

    if (otherPinned.length >= FEED_MAX_PINNED_POSTS) {
      const oldestPinned = otherPinned[otherPinned.length - 1];
      const { error: unpinError } = await supabase
        .from("feed_posts")
        .update({ is_pinned: false })
        .eq("id", oldestPinned.id);

      if (unpinError) throw unpinError;
    }
  }

  const payload =
    action === "pin"
      ? { is_pinned: !post.is_pinned }
      : action === "comments"
        ? { comments_locked: !post.comments_locked }
        : { status: "archived" };

  const { error: updateError } = await supabase
    .from("feed_posts")
    .update(payload)
    .eq("id", post.id);

  if (updateError) throw updateError;
}

export async function saveFeedPost({
  editingPost,
  body,
  linkUrl,
  eventId,
  pinned,
  commentsLocked,
  existingMedia,
  files,
  publish,
}: {
  editingPost: FeedPost | null;
  body: string;
  linkUrl: string;
  eventId: string;
  pinned: boolean;
  commentsLocked: boolean;
  existingMedia: FeedMedia[];
  files: File[];
  publish: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  let postId = editingPost?.id ?? "";

  if (editingPost) {
    const { error: updateError } = await supabase
      .from("feed_posts")
      .update({
        body: body.trim(),
        link_url: linkUrl.trim() || null,
        event_id: eventId || null,
        is_pinned: pinned,
        comments_locked: commentsLocked,
      })
      .eq("id", editingPost.id);

    if (updateError) throw updateError;

    const keptIds = new Set(existingMedia.map((item) => item.id));
    const removedMedia = editingPost.media.filter(
      (item) => !keptIds.has(item.id),
    );

    if (removedMedia.length > 0) {
      const { error: mediaDeleteError } = await supabase
        .from("feed_post_media")
        .delete()
        .in(
          "id",
          removedMedia.map((item) => item.id),
        );

      if (mediaDeleteError) throw mediaDeleteError;

      const paths = removedMedia
        .map((item) => item.object_path)
        .filter(Boolean);

      if (paths.length > 0) {
        const { error: storageDeleteError } = await supabase.storage
          .from(FEED_MEDIA_BUCKET)
          .remove(paths);

        if (storageDeleteError) {
          console.error(
            "Media post terhapus dari database, tapi file storage belum bersih.",
            storageDeleteError,
          );
        }
      }
    }

    for (const [index, item] of existingMedia.entries()) {
      if (item.sort_order === index) continue;
      const { error: sortError } = await supabase
        .from("feed_post_media")
        .update({ sort_order: index })
        .eq("id", item.id);

      if (sortError) throw sortError;
    }
  } else {
    const { data: post, error: createError } = await supabase
      .from("feed_posts")
      .insert({
        body: body.trim(),
        link_url: linkUrl.trim() || null,
        event_id: eventId || null,
        status: publish ? "published" : "draft",
        is_pinned: pinned,
        comments_locked: commentsLocked,
      })
      .select("id")
      .single();

    if (createError || !post) {
      throw createError ?? new Error("Post tidak dapat dibuat.");
    }

    postId = post.id;
  }

  for (const [index, file] of files.entries()) {
    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const objectPath = `${postId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(FEED_MEDIA_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: mediaError } = await supabase
      .from("feed_post_media")
      .insert({
        post_id: postId,
        object_path: objectPath,
        sort_order: existingMedia.length + index,
        alt_text: `Dokumentasi post Revolt Riders ${existingMedia.length + index + 1}`,
      });

    if (mediaError) {
      await supabase.storage.from(FEED_MEDIA_BUCKET).remove([objectPath]);
      throw mediaError;
    }
  }

  return postId;
}
