import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("community feed keeps a thin public entry around the focused screen", async () => {
  const entry = await read("components/community-feed.tsx");
  const screen = await read("components/community-feed-screen.tsx");

  assert.match(entry, /^"use client";/);
  assert.match(entry, /export \{ CommunityFeed \} from "\.\/community-feed-screen";/);
  assert.match(screen, /export function CommunityFeed/);
  assert.match(screen, /from\("feed_posts"\)/);
  assert.match(screen, /channel\("community-feed-live"\)/);
});
