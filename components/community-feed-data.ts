import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  FEED_COMPOSER_AGENDA_LIMIT,
  FEED_COMPOSER_VOYAGER_LIMIT,
  FEED_MEDIA_BUCKET,
  FEED_MEDIA_SIGNED_URL_TTL_SECONDS,
  type FeedEvent,
  type FeedPost,
  type FeedPostRow,
} from "./community-feed-model";

const FEED_POST_SELECT =
  "id,body,link_url,event_id,attached_event:events!feed_posts_event_id_fkey(id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at),is_pinned,comments_locked,author_id,author_name,author_role,published_at,created_at,like_count,comment_count,feed_post_media(id,object_path,alt_text,sort_order)";

const FEED_EVENT_SELECT =
  "id,title,slug,type,location_name,start_at,end_at,status,counts_as_mandatory,official_distance_km,official_support,activity_summary,completed_at";

export async function fetchFeedPage({
  userId,
  from,
  pageSize,
}: {
  userId: string;
  from: number;
  pageSize: number;
}) {
  const supabase = getSupabaseBrowserClient();
  const { data: rawPosts, error: postError } = await supabase
    .from("feed_posts")
    .select(FEED_POST_SELECT)
    .eq("status", "published")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (postError) throw postError;

  const rows = (rawPosts ?? []) as FeedPostRow[];
  const postIds = rows.map((post) => post.id);
  const media = rows.flatMap((post) => post.feed_post_media ?? []);
  const mediaUrlByPath = new Map<string, string>();

  if (media.length > 0) {
    const { data: signedMedia, error: mediaError } = await supabase.storage
      .from(FEED_MEDIA_BUCKET)
      .createSignedUrls(
        media.map((item) => item.object_path),
        FEED_MEDIA_SIGNED_URL_TTL_SECONDS,
      );

    if (mediaError) throw mediaError;

    for (const item of signedMedia ?? []) {
      if (item.path && item.signedUrl) {
        mediaUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }

  const voyagerEventIds = Array.from(
    new Set(
      rows
        .map((post) => post.attached_event)
        .filter(
          (event): event is FeedEvent =>
            Boolean(event && event.type === "voyager"),
        )
        .map((event) => event.id),
    ),
  );

  const [likesResult, participantsResult, photosResult] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from("feed_post_likes")
          .select("post_id")
          .in("post_id", postIds)
          .eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
    voyagerEventIds.length > 0
      ? supabase
          .from("event_participants")
          .select("event_id")
          .in("event_id", voyagerEventIds)
      : Promise.resolve({ data: [], error: null }),
    voyagerEventIds.length > 0
      ? supabase
          .from("club_gallery")
          .select("event_id")
          .in("event_id", voyagerEventIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (likesResult.error) throw likesResult.error;
  if (participantsResult.error) throw participantsResult.error;
  if (photosResult.error) throw photosResult.error;

  const likedIds = new Set(
    ((likesResult.data ?? []) as { post_id: string }[]).map(
      (like) => like.post_id,
    ),
  );
  const participantCountByEvent = new Map<string, number>();
  for (const row of (participantsResult.data ?? []) as { event_id: string }[]) {
    participantCountByEvent.set(
      row.event_id,
      (participantCountByEvent.get(row.event_id) ?? 0) + 1,
    );
  }

  const photoCountByEvent = new Map<string, number>();
  for (const row of (photosResult.data ?? []) as { event_id: string | null }[]) {
    if (!row.event_id) continue;
    photoCountByEvent.set(
      row.event_id,
      (photoCountByEvent.get(row.event_id) ?? 0) + 1,
    );
  }

  const posts: FeedPost[] = rows.map((post) => ({
    ...post,
    attached_event: post.attached_event
      ? {
          ...post.attached_event,
          participantCount:
            post.attached_event.type === "voyager"
              ? participantCountByEvent.get(post.attached_event.id) ?? 0
              : undefined,
          photoCount:
            post.attached_event.type === "voyager"
              ? photoCountByEvent.get(post.attached_event.id) ?? 0
              : undefined,
        }
      : null,
    media: (post.feed_post_media ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        ...item,
        signedUrl: mediaUrlByPath.get(item.object_path),
      })),
    likeCount: post.like_count ?? 0,
    commentCount: post.comment_count ?? 0,
    likedByMe: likedIds.has(post.id),
  }));

  return {
    posts,
    rowCount: rows.length,
    hasMore: rows.length === pageSize,
  };
}

export async function fetchFeedComposerOptions({
  memberExternalId,
  editingEvent,
}: {
  memberExternalId?: string | null;
  editingEvent?: FeedEvent | null;
}) {
  const supabase = getSupabaseBrowserClient();
  const now = new Date().toISOString();

  const [agendaResult, voyagerResult, profileResult] = await Promise.all([
    supabase
      .from("events")
      .select(FEED_EVENT_SELECT)
      .eq("status", "published")
      .neq("type", "voyager")
      .gte("start_at", now)
      .order("start_at", { ascending: true })
      .limit(FEED_COMPOSER_AGENDA_LIMIT),
    supabase
      .from("events")
      .select(FEED_EVENT_SELECT)
      .eq("status", "published")
      .eq("type", "voyager")
      .order("start_at", { ascending: false })
      .limit(FEED_COMPOSER_VOYAGER_LIMIT),
    memberExternalId
      ? supabase
          .from("member_profiles")
          .select("full_name,nickname")
          .eq("member_external_id", memberExternalId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (agendaResult.error || voyagerResult.error) {
    throw agendaResult.error ?? voyagerResult.error;
  }

  const profile =
    !profileResult.error && profileResult.data
      ? (profileResult.data as { full_name: string; nickname: string | null })
      : null;
  const authorName = profile ? profile.nickname || profile.full_name : null;

  const agendaRows = (agendaResult.data ?? []) as FeedEvent[];
  const voyagerRows = (voyagerResult.data ?? []) as FeedEvent[];
  const voyagerIds = voyagerRows.map((event) => event.id);

  let voyagerOptions = voyagerRows;

  if (voyagerIds.length > 0) {
    const [participantsResult, photosResult] = await Promise.all([
      supabase
        .from("event_participants")
        .select("event_id")
        .in("event_id", voyagerIds),
      supabase
        .from("club_gallery")
        .select("event_id")
        .in("event_id", voyagerIds),
    ]);

    const participantCountByEvent = new Map<string, number>();
    if (!participantsResult.error) {
      for (const row of (participantsResult.data ?? []) as { event_id: string }[]) {
        participantCountByEvent.set(
          row.event_id,
          (participantCountByEvent.get(row.event_id) ?? 0) + 1,
        );
      }
    }

    const photoCountByEvent = new Map<string, number>();
    if (!photosResult.error) {
      for (const row of (photosResult.data ?? []) as { event_id: string | null }[]) {
        if (!row.event_id) continue;
        photoCountByEvent.set(
          row.event_id,
          (photoCountByEvent.get(row.event_id) ?? 0) + 1,
        );
      }
    }

    voyagerOptions = voyagerRows.map((event) => ({
      ...event,
      participantCount: participantCountByEvent.get(event.id) ?? 0,
      photoCount: photoCountByEvent.get(event.id) ?? 0,
    }));
  }

  const events = [...agendaRows, ...voyagerOptions];
  if (editingEvent && !events.some((event) => event.id === editingEvent.id)) {
    events.unshift(editingEvent);
  }

  return { events, authorName };
}
