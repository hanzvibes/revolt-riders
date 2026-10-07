import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("member screen delegates data, detail lifecycle, and mutations", async () => {
  const screen = await read("components/member-screen.tsx");
  const controller = await read(
    "components/member-screen-controller.ts",
  );
  const data = await read("components/member-data.ts");
  const detail = await read(
    "components/member-detail-sheet.tsx",
  );

  assert.ok(
    screen.length < 16_000,
    "member screen should stay presentation-focused",
  );
  assert.match(screen, /useMemberScreenController/);
  assert.match(screen, /MemberDetailSheet/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /deleteRideLog/);
  assert.doesNotMatch(screen, /confirmAction/);

  assert.match(controller, /fetchWithCache<MemberDisplay\[\]>/);
  assert.match(controller, /member_profiles_list/);
  assert.match(controller, /member_touring:/);
  assert.match(controller, /detailRequestRef/);
  assert.match(controller, /deleteRideLog/);
  assert.match(controller, /confirmAction/);

  assert.match(data, /from\("member_profiles"\)/);
  assert.match(data, /from\("member_details"\)/);
  assert.match(data, /from\("ride_logs"\)/);
  assert.match(data, /from\("event_attendance"\)/);
  assert.match(data, /from\("events"\)/);

  assert.match(detail, /RideLogEditModal/);
  assert.match(detail, /member-tour-action/);
  assert.match(detail, /member-touring-table/);
});

test("member directory model preserves search and totals behavior", async () => {
  const model = await read("components/member-model.ts");

  assert.match(model, /query\.trim\(\)\.toLowerCase\(\)/);
  assert.match(model, /member\.member_external_id/);
  assert.match(model, /member\.motorcycle/);
  assert.match(model, /total_km/);
  assert.match(model, /touring_count/);
});

test("member touring data preserves partial-cache protection and dedupe", async () => {
  const data = await read("components/member-data.ts");

  assert.match(
    data,
    /cacheable = !rideLogsRes\.error && !attendanceRes\.error/,
  );
  assert.match(data, /if \(eventsRes\.error\) cacheable = false/);
  assert.match(data, /coveredEventIds/);
  assert.match(data, /coveredEventIds\.has\(item\.event_id\)/);
  assert.match(data, /Number\(ride\.distance_km\)/);
});

test("member detail race guard and ride delete error path are preserved", async () => {
  const controller = await read(
    "components/member-screen-controller.ts",
  );

  assert.match(controller, /\+\+detailRequestRef\.current/);
  assert.match(
    controller,
    /detailRequestRef\.current === requestId/,
  );
  assert.match(controller, /destructive: true/);
  assert.match(controller, /if \(!confirmed\) return/);
  assert.match(controller, /Gagal menghapus riwayat\./);
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
    /invalidateCache\("admin_dashboard_overview"\)/,
  );
});
