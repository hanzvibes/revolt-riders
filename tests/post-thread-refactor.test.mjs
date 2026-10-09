import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("post thread screen delegates data, realtime, and comment lifecycle", async () => {
  const screen = await read(
    "components/post-thread-screen.tsx",
  );
  const controller = await read(
    "components/post-thread-controller.ts",
  );
  const data = await read(
    "components/post-thread-data.ts",
  );
  const actions = await read(
    "components/post-thread-actions.ts",
  );
  const discussion = await read(
    "components/post-thread-discussion.tsx",
  );

  assert.ok(
    screen.length < 14_000,
    "post thread screen should stay presentation-focused",
  );
  assert.match(screen, /usePostThreadController/);
  assert.match(screen, /PostThreadDiscussion/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /\.from\(/);

  assert.match(controller, /channel\("feed-thread-" \+ postId\)/);
  assert.match(controller, /table: "feed_post_comments"/);
  assert.match(controller, /table: "feed_posts"/);
  assert.match(controller, /setThreadLike/);
  assert.match(controller, /createThreadComment/);
  assert.match(controller, /removeThreadComment/);

  assert.match(data, /from\("feed_posts"\)/);
  assert.match(data, /createSignedUrls/);
  assert.match(data, /from\("feed_post_likes"\)/);
  assert.match(data, /from\("feed_post_comments"\)/);
  assert.match(data, /from\("event_participants"\)/);
  assert.match(data, /from\("club_gallery"\)/);

  assert.match(actions, /feed_post_likes/);
  assert.match(actions, /feed_post_comments/);
  assert.match(discussion, /thread-comment-root/);
  assert.match(discussion, /thread-comment-box/);
});

test("post thread model preserves comment ordering and recursive delete", async () => {
  const model = await read(
    "components/post-thread-model.ts",
  );

  assert.match(model, /sortThreadComments/);
  assert.match(model, /getThreadCommentTree/);
  assert.match(model, /getThreadRemovedCommentIds/);
  assert.match(model, /while \(changed\)/);
  assert.match(
    model,
    /removedIds\.has\(item\.parent_comment_id\)/,
  );
});

test("post thread keeps optimistic like with rollback reload", async () => {
  const controller = await read(
    "components/post-thread-controller.ts",
  );

  assert.match(controller, /likedByMe: !wasLiked/);
  assert.match(
    controller,
    /Math\.max\(\s*0,[\s\S]*wasLiked \? -1 : 1/,
  );
  assert.match(controller, /setThreadLike/);
  assert.match(controller, /loadThread\(\{ quiet: true \}\)/);
});

test("post thread comment errors and locked guard remain explicit", async () => {
  const controller = await read(
    "components/post-thread-controller.ts",
  );

  assert.match(controller, /post\.comments_locked/);
  assert.match(controller, /Komentar belum dapat dikirim\./);
  assert.match(controller, /Komentar belum dapat dihapus\./);
  assert.match(controller, /commentCount: Math\.max/);
});
