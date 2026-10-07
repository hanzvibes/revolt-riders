import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("leaderboard screen delegates data, ranking model, and podium interaction", async () => {
  const screen = await read("components/leaderboard-screen.tsx");
  const controller = await read("components/leaderboard-controller.ts");
  const data = await read("components/leaderboard-data.ts");
  const model = await read("components/leaderboard-model.ts");
  const stack = await read("components/leaderboard-top-stack.tsx");

  assert.ok(
    screen.length < 18_000,
    "leaderboard screen should stay presentation-focused",
  );
  assert.match(screen, /useLeaderboardController/);
  assert.match(screen, /LeaderboardTopStack/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /fetchWithCache/);

  assert.match(controller, /fetchWithCache<LeaderboardRider\[\]>/);
  assert.match(controller, /"riding_leaderboard_data"/);
  assert.match(controller, /ttlMs: 2 \* 60 \* 1000/);
  assert.match(controller, /deriveLeaderboard/);
  assert.match(controller, /rotateTopStack/);

  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /rpc\("get_riding_leaderboard"\)/);
  assert.match(data, /Math\.round\(Number/);

  assert.match(model, /rankByMemberId/);
  assert.match(model, /remainingRiders/);
  assert.match(model, /activeTopIndex/);

  assert.match(stack, /useReducedMotion/);
  assert.match(stack, /dragElastic=\{0\.16\}/);
  assert.match(stack, /ArrowLeft/);
  assert.match(stack, /ArrowRight/);
});

test("leaderboard data keeps profile-first query with RPC fallback", async () => {
  const data = await read("components/leaderboard-data.ts");

  assert.match(data, /if \(!profileError && profiles && profiles\.length > 0\)/);
  assert.match(data, /get_riding_leaderboard/);
  assert.match(data, /throw profileError \|\| fetchError/);
  assert.match(data, /nickname/);
});

test("leaderboard derivation preserves search, current rank, and top stack", async () => {
  const model = await read("components/leaderboard-model.ts");

  assert.match(model, /query\.trim\(\)\.toLowerCase\(\)/);
  assert.match(model, /memberExternalId/);
  assert.match(model, /myRank/);
  assert.match(model, /kmToNext/);
  assert.match(model, /riders\.slice\(0, 3\)/);
  assert.match(model, /const safeTopIndex/);
  assert.match(
    model,
    /\(index - safeTopIndex \+ top3\.length\) % top3\.length/,
  );
});

test("leaderboard refresh invalidates ranking and member directory caches", async () => {
  const controller = await read("components/leaderboard-controller.ts");

  assert.match(
    controller,
    /invalidateCache\("riding_leaderboard_data"\)/,
  );
  assert.match(
    controller,
    /invalidateCache\("member_profiles_list"\)/,
  );
  assert.match(controller, /loadLeaderboard\(true\)/);
});
