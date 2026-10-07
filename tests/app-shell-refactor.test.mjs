import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("app shell delegates navigation, drawer lifecycle, and sidebar rendering", async () => {
  const shell = await read("components/app-shell.tsx");
  const controller = await read(
    "components/app-shell-controller.ts",
  );
  const navigation = await read(
    "components/app-shell-navigation.ts",
  );
  const sidebar = await read(
    "components/app-shell-sidebar.tsx",
  );

  assert.ok(
    shell.length < 8_000,
    "AppShell should stay layout-focused",
  );
  assert.match(shell, /useAppShellController/);
  assert.match(shell, /AppShellSidebar/);
  assert.doesNotMatch(shell, /\buseEffect\s*\(/);
  assert.doesNotMatch(shell, /getSupabaseBrowserClient/);
  assert.doesNotMatch(shell, /fetchWithCache/);

  assert.match(controller, /DRAWER_FOCUSABLE_SELECTOR/);
  assert.match(controller, /window\.matchMedia/);
  assert.match(controller, /event\.key === "Escape"/);
  assert.match(controller, /event\.key !== "Tab"/);
  assert.match(controller, /shell:pending-join-count/);
  assert.match(controller, /fetchWithCache<number>/);

  assert.match(navigation, /utamaItems/);
  assert.match(navigation, /komunitasItems/);
  assert.match(navigation, /operationalItems/);
  assert.match(navigation, /adminItems/);
  assert.match(navigation, /activeAliases/);

  assert.match(sidebar, /sidebar-accordion-group/);
  assert.match(sidebar, /Pendaftaran Member/);
  assert.match(sidebar, /sidebar-user-card/);
});

test("app shell drawer preserves focus trap and opener restoration", async () => {
  const controller = await read(
    "components/app-shell-controller.ts",
  );

  assert.match(controller, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(controller, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(controller, /document\.body\.style\.overflow = "hidden"/);
  assert.match(controller, /window\.cancelAnimationFrame/);
  assert.match(controller, /window\.removeEventListener/);
});

test("app shell role boundaries preserve operational and admin visibility", async () => {
  const controller = await read(
    "components/app-shell-controller.ts",
  );
  const navigation = await read(
    "components/app-shell-navigation.ts",
  );

  assert.match(
    controller,
    /"road_captain"[\s\S]*"admin"[\s\S]*"superadmin"/,
  );
  assert.match(
    controller,
    /hasRole\(account\.role, \["admin", "superadmin"\]\)/,
  );
  assert.match(navigation, /Pendaftaran Member/);
  assert.match(navigation, /Dashboard Admin/);
});

test("app shell pending join badge keeps cached fallback behavior", async () => {
  const controller = await read(
    "components/app-shell-controller.ts",
  );

  assert.match(controller, /from\("join_requests"\)/);
  assert.match(controller, /\.eq\("status", "pending"\)/);
  assert.match(controller, /ttlMs: 30_000/);
  assert.match(controller, /setPendingJoinCount\(0\)/);
});
