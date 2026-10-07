import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function getThreadDataClient() {
  return getSupabaseBrowserClient();
}

export async function fetchPublishedThreadPost(postId: string) {
  const supabase = getThreadDataClient();
  const { data, error } = await supabase
    .from("feed_posts")
    .select(
      "id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at),comments_locked,author_id,author_name,author_role,published_at,created_at,like_count,comment_count,feed_post_media(id,object_path,alt_text,sort_order)",
    )
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createThreadMediaUrlMap(objectPaths: readonly string[]) {
  const urls = new Map<string, string>();
  if (objectPaths.length === 0) return urls;

  const { data, error } = await getThreadDataClient().storage
    .from("community-feed")
    .createSignedUrls([...objectPaths], 60 * 60);

  if (error) throw error;
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export async function fetchThreadEngagement(
  postId: string,
  userId: string,
  voyagerEventId: string | null,
) {
  const supabase = getThreadDataClient();
  const [likeResult, commentResult, participantsResult, photosResult] =
    await Promise.all([
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
  if (participantsResult.error) throw participantsResult.error;
  if (photosResult.error) throw photosResult.error;

  return {
    likedByMe: Boolean(likeResult.data),
    comments: commentResult.data ?? [],
    participantCount: (participantsResult.data ?? []).length,
    photoCount: (photosResult.data ?? []).length,
  };
}
