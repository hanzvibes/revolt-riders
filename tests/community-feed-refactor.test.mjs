import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("community feed is split into stable entry, orchestration, data, actions, model, and presentation", async () => {
  const entry = await read("components/community-feed.tsx");
  const screen = await read("components/community-feed-screen.tsx");
  const data = await read("components/community-feed-data.ts");
  const actions = await read("components/community-feed-actions.ts");
  const model = await read("components/community-feed-model.ts");
  const presentation = await read("components/community-feed-presentation.tsx");

  assert.match(entry, /^"use client";/);
  assert.match(entry, /export \{ CommunityFeed \} from "\.\/community-feed-screen";/);

  assert.match(screen, /fetchFeedPage/);
  assert.match(screen, /fetchFeedComposerOptions/);
  assert.match(screen, /toggleFeedLike/);
  assert.match(screen, /manageFeedPost/);
  assert.match(screen, /saveFeedPost/);
  assert.match(screen, /channel\("community-feed-live"\)/);
  assert.doesNotMatch(screen, /\.from\("feed_post_likes"\)/);
  assert.doesNotMatch(screen, /\.from\("feed_post_media"\)/);

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
