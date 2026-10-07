import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("community feed entry delegates rendering, post lifecycle, composer lifecycle, data, actions, model, and presentation", async () => {
  const entry = await read("components/community-feed.tsx");
  const screen = await read("components/community-feed-screen.tsx");
  const posts = await read("components/community-feed-posts.ts");
  const composer = await read("components/community-feed-composer.tsx");
  const data = await read("components/community-feed-data.ts");
  const actions = await read("components/community-feed-actions.ts");
  const model = await read("components/community-feed-model.ts");
  const presentation = await read("components/community-feed-presentation.tsx");

  assert.match(entry, /^"use client";/);
  assert.match(entry, /export \{ CommunityFeed \} from "\.\/community-feed-screen";/);

  assert.ok(screen.length < 10_000, "community feed screen should stay orchestration-focused");
  assert.match(screen, /useCommunityFeedPosts/);
  assert.match(screen, /useCommunityFeedComposer/);
  assert.match(screen, /CommunityFeedComposer/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /channel\("community-feed-live"\)/);
  assert.doesNotMatch(screen, /fetchFeedComposerOptions/);

  assert.match(posts, /fetchFeedPage/);
  assert.match(posts, /toggleFeedLike/);
  assert.match(posts, /manageFeedPost/);
  assert.match(posts, /channel\("community-feed-live"\)/);
  assert.match(posts, /IntersectionObserver/);

  assert.match(composer, /fetchFeedComposerOptions/);
  assert.match(composer, /saveFeedPost/);
  assert.match(composer, /validateFeedFiles/);
  assert.match(composer, /URL\.createObjectURL/);

  assert.doesNotMatch(posts, /\.from\("feed_post_likes"\)/);
  assert.doesNotMatch(posts, /\.from\("feed_post_media"\)/);

  assert.match(data, /from\("feed_posts"\)/);
  assert.match(data, /createSignedUrls/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(data, /from\("club_gallery"\)/);

  assert.match(actions, /from\("feed_post_likes"\)/);
  assert.match(actions, /from\("feed_posts"\)/);
  assert.match(actions, /from\("feed_post_media"\)/);
  assert.match(actions, /FEED_MAX_PINNED_POSTS/);

  assert.match(model, /export type FeedPost/);
  assert.match(model, /export const FEED_PAGE_SIZE = 12/);
  assert.match(model, /validateFeedFiles/);
  assert.match(model, /feedErrorMessage/);

  assert.match(presentation, /export function FeedPostCard/);
  assert.match(presentation, /export function ComposerPostPreview/);
  assert.match(presentation, /export function FeedSkeleton/);
});

test("community feed post lifecycle keeps pagination and realtime edge handling", async () => {
  const posts = await read("components/community-feed-posts.ts");

  assert.match(posts, /incomingIds/);
  assert.match(posts, /Math\.max\(FEED_PAGE_SIZE, loadedCount\)/);
  assert.match(posts, /change\.eventType === "DELETE"/);
  assert.match(posts, /record\.status !== "published"/);
  assert.match(posts, /observer\.disconnect\(\)/);
});

test("community feed keeps failure recovery and composer validation", async () => {
  const posts = await read("components/community-feed-posts.ts");
  const composer = await read("components/community-feed-composer.tsx");

  assert.match(posts, /feedErrorMessage\(cause\)/);
  assert.match(posts, /void refreshLoadedFeed\(\)/);
  assert.match(composer, /validateFeedFiles\(combined\)/);
  assert.match(composer, /setFeedError\(validationError\)/);
  assert.match(composer, /Perubahan post belum dapat disimpan/);
  assert.match(composer, /Post belum dapat disimpan/);
});
