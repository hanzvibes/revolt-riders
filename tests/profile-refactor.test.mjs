import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("profile screen delegates data lifecycle and ride mutations", async () => {
  const screen = await read("components/profile-screen.tsx");
  const controller = await read(
    "components/profile-screen-controller.ts",
  );
  const data = await read("components/profile-data.ts");
  const rideHistory = await read(
    "components/profile-ride-history.tsx",
  );

  assert.ok(
    screen.length < 24_000,
    "profile screen should stay presentation-focused",
  );
  assert.match(screen, /useProfileScreenController/);
  assert.match(screen, /ProfileRideHistory/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /deleteRideLog/);
  assert.doesNotMatch(screen, /confirmAction/);

  assert.match(controller, /fetchWithCache/);
  assert.match(controller, /fetchProfileSnapshot/);
  assert.match(controller, /member_details/);
  assert.match(controller, /handleRideUpdated/);
  assert.match(controller, /auth\.signOut/);

  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("member_details"\)/);
  assert.match(data, /from\("ride_logs"\)/);
  assert.match(data, /from\("event_rsvps"\)/);
  assert.match(data, /from\("member_motorcycles"\)/);
  assert.match(data, /from\("events"\)/);

  assert.match(rideHistory, /confirmAction/);
  assert.match(rideHistory, /deleteRideLog/);
  assert.match(rideHistory, /RideLogEditModal/);
  assert.match(rideHistory, /profile-ride-status/);
  assert.match(rideHistory, /profile-ride-action/);
});

test("profile data preserves numeric normalization and query errors", async () => {
  const data = await read("components/profile-data.ts");

  assert.match(data, /total_km:\s*Number/);
  assert.match(
    data,
    /distance_km:\s*[\s\S]*Number\(ride\.distance_km\)/,
  );
  assert.match(data, /if \(profileResult\.error\) throw/);
  assert.match(data, /if \(rideResult\.error\) throw/);
  assert.match(data, /if \(eventResult\.error\) throw/);
});

test("profile controller preserves cache invalidation and save errors", async () => {
  const controller = await read(
    "components/profile-screen-controller.ts",
  );

  assert.match(controller, /invalidateCache\("riding:"\)/);
  assert.match(
    controller,
    /invalidateCache\("riding_leaderboard_data"\)/,
  );
  assert.match(
    controller,
    /invalidateCache\("dashboard_club_stats"\)/,
  );
  assert.match(
    controller,
    /throw new Error\("Sesi member tidak ditemukan\."\)/,
  );
  assert.match(
    controller,
    /Profil belum dapat disimpan\./,
  );
});

test("profile ride history preserves destructive confirmation and fallback error", async () => {
  const rideHistory = await read(
    "components/profile-ride-history.tsx",
  );

  assert.match(rideHistory, /destructive:\s*true/);
  assert.match(rideHistory, /if \(!confirmed\) return/);
  assert.match(
    rideHistory,
    /Gagal menghapus catatan riding\./,
  );
});
