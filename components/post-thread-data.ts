import type {
  CommunityFeedEvent,
  CommunityFeedMedia,
} from "@/components/community-feed-primitives";
import type { AppRole } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type ThreadComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  body: string;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  created_at: string;
};

export type ThreadPost = {
  id: string;
  body: string;
  link_url: string | null;
  event_id: string | null;
  attached_event: CommunityFeedEvent | null;
  comments_locked: boolean;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  published_at: string | null;
  created_at: string;
  media: CommunityFeedMedia[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type ThreadPostRow = Omit<
  ThreadPost,
  "media" | "likeCount" | "commentCount" | "likedByMe"
> & {
  like_count: number;
  comment_count: number;
  feed_post_media?: CommunityFeedMedia[];
};

export type ThreadSnapshot = {
  post: ThreadPost | null;
  comments: ThreadComment[];
};

export async function fetchThreadSnapshot({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<ThreadSnapshot> {
  const supabase = getSupabaseBrowserClient();
  const { data: rawPost, error: postError } =
    await supabase
      .from("feed_posts")
      .select(
        "id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at),comments_locked,author_id,author_name,author_role,published_at,created_at,like_count,comment_count,feed_post_media(id,object_path,alt_text,sort_order)",
      )
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle();

  if (postError) throw postError;
  if (!rawPost) {
    return { post: null, comments: [] };
  }

  const row = rawPost as ThreadPostRow;
  const media = [...(row.feed_post_media ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const mediaUrlByPath = new Map<string, string>();

  if (media.length > 0) {
    const { data: signedMedia, error: mediaError } =
      await supabase.storage
        .from("community-feed")
        .createSignedUrls(
          media.map((item) => item.object_path),
          60 * 60,
        );

    if (mediaError) throw mediaError;

    for (const item of signedMedia ?? []) {
      if (item.path && item.signedUrl) {
        mediaUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  const voyagerEventId =
    row.attached_event?.type === "voyager"
      ? row.attached_event.id
      : null;

  const [
    likeResult,
    commentResult,
    participantsResult,
    photosResult,
  ] = await Promise.all([
    supabase
      .from("feed_post_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("feed_post_comments")
      .select(
        "id,post_id,parent_comment_id,body,author_id,author_name,author_role,created_at",
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    voyagerEventId
      ? supabase
          .from("event_participants")
          .select("event_id")
          .eq("event_id", voyagerEventId)
      : Promise.resolve({ data: [], error: null }),
    voyagerEventId
      ? supabase
          .from("club_gallery")
          .select("event_id")
          .eq("event_id", voyagerEventId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (likeResult.error) throw likeResult.error;
  if (commentResult.error) throw commentResult.error;
  if (participantsResult.error) {
    throw participantsResult.error;
  }
  if (photosResult.error) throw photosResult.error;

  return {
    post: {
      ...row,
      attached_event: row.attached_event
        ? {
            ...row.attached_event,
            participantCount:
              row.attached_event.type === "voyager"
                ? (participantsResult.data ?? []).length
                : undefined,
            photoCount:
              row.attached_event.type === "voyager"
                ? (photosResult.data ?? []).length
                : undefined,
          }
        : null,
      media: media.map((item) => ({
        ...item,
        signedUrl: mediaUrlByPath.get(item.object_path),
      })),
      likeCount: row.like_count ?? 0,
      commentCount: row.comment_count ?? 0,
      likedByMe: Boolean(likeResult.data),
    },
    comments:
      (commentResult.data ?? []) as ThreadComment[],
  };
}
