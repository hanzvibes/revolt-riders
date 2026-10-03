import type {
  CommunityFeedEvent,
  CommunityFeedMedia,
} from "@/components/community-feed-primitives";
import type { AppRole } from "@/context/data-cache-context";

export type RealtimeChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

export type FeedMedia = CommunityFeedMedia;
export type FeedEvent = CommunityFeedEvent;

export type FeedPost = {
  id: string;
  body: string;
  link_url: string | null;
  event_id: string | null;
  attached_event: FeedEvent | null;
  is_pinned: boolean;
  comments_locked: boolean;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  published_at: string | null;
  created_at: string;
  media: FeedMedia[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type FeedPostRow = Omit<
  FeedPost,
  "media" | "likeCount" | "commentCount" | "likedByMe"
> & {
  like_count: number;
  comment_count: number;
  feed_post_media?: FeedMedia[];
};

export type FeedManageAction = "pin" | "comments" | "archive";

export const FEED_PAGE_SIZE = 12;
export const FEED_MEDIA_BUCKET = "community-feed";
export const FEED_MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60;
export const FEED_MAX_MEDIA = 4;
export const FEED_MAX_MEDIA_BYTES = 8 * 1024 * 1024;
export const FEED_COMPOSER_AGENDA_LIMIT = 12;
export const FEED_COMPOSER_VOYAGER_LIMIT = 8;
export const FEED_MAX_PINNED_POSTS = 2;

export const allowedFeedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function feedErrorMessage(cause: unknown) {
  const message =
    typeof cause === "object" && cause !== null && "message" in cause
      ? String(cause.message)
      : "";

  if (/permission denied|row-level security|not authorized/i.test(message)) {
    return "Akses feed belum tersedia untuk akun ini. Muat ulang halaman atau hubungi pengurus bila masalah berlanjut.";
  }

  return "Kabar Revolt belum dapat dimuat. Coba muat ulang halaman.";
}

export function validateFeedFiles(files: File[]) {
  const invalid = files.find(
    (file) =>
      !allowedFeedImageTypes.has(file.type) || file.size > FEED_MAX_MEDIA_BYTES,
  );

  return invalid
    ? "Gunakan JPG, PNG, atau WEBP dengan ukuran maksimal 8 MB per foto."
    : null;
}
