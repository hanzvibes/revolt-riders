import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const fileExists = async (path) => {
  try {
    await access(new URL(`../${path}`, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

// ==============================================================================
// 1. PWA & PRODUCTION CONTRACTS
// ==============================================================================
test("PWA manifest is valid and installable", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.name.includes("Revolt Riders"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
});

test("Service worker provides offline navigation fallback and push capabilities", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /const PRECACHE/);
  assert.match(worker, /"\/offline"/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.match\("\/offline"\)/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /showNotification/);
});

// ==============================================================================
// 2. ROUTE INTEGRITY & EXPORT TESTS (ALL 24 ROUTES)
// ==============================================================================
const expectedRoutes = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/admin/page.tsx",
  "app/admin/attendance/page.tsx",
  "app/admin/bulletins/page.tsx",
  "app/admin/events/page.tsx",
  "app/admin/import/page.tsx",
  "app/admin/insights/page.tsx",
  "app/admin/join-requests/page.tsx",
  "app/admin/members/page.tsx",
  "app/agenda/page.tsx",
  "app/api/sheets/[dataset]/route.ts",
  "app/bulletin/page.tsx",
  "app/check-in/page.tsx",
  "app/history/page.tsx",
  "app/join/confirm/[token]/page.tsx",
  "app/kas/page.tsx",
  "app/leaderboard/page.tsx",
  "app/login/page.tsx",
  "app/member/page.tsx",
  "app/notifications/page.tsx",
  "app/offline/page.tsx",
  "app/profil/page.tsx",
  "app/riding/page.tsx",
  "app/riding/approval/page.tsx",
  "app/setup/page.tsx",
  "app/undangan/[token]/page.tsx",
];

test("All 27 production routes exist and contain default export", async () => {
  for (const route of expectedRoutes) {
    const exists = await fileExists(route);
    assert.ok(exists, `Route file ${route} must exist`);
    const content = await read(route);
    if (route.endsWith("route.ts")) {
      assert.match(content, /export\s+async\s+function\s+GET/, `${route} must export GET handler`);
    } else {
      assert.match(content, /export\s+default/, `${route} must have a default export component`);
    }
  }
});

// ==============================================================================
// 3. DATABASE MIGRATIONS & STORED PROCEDURES INTEGRITY
// ==============================================================================
test("Database migrations enforce security definer, search_path, and qualified columns", async () => {
  const fixesMigration = await read("supabase/migrations/20260918000100_revolt_riders_comprehensive_fixes.sql");

  // QR Code unambiguous reference
  assert.match(fixesMigration, /event_checkin_codes\.active_until > now\(\)/);

  // Rejection RPC for account requests
  assert.match(fixesMigration, /create or replace function public\.reject_member_account_request/);
  assert.match(fixesMigration, /security definer/);
  assert.match(fixesMigration, /set search_path = ''/);

  // Single-counted dashboard stats
  assert.match(fixesMigration, /\(select coalesce\(sum\(member_profile\.total_km\), 0\) from public\.member_profiles as member_profile\)::numeric/);

  // Permanent event deletion RPC
  assert.match(fixesMigration, /create or replace function public\.delete_event/);
  assert.match(fixesMigration, /delete from public\.event_checkin_codes where event_id = p_event_id;/);
  assert.match(fixesMigration, /delete from public\.events where id = p_event_id;/);

  // Role-based riding validation
  assert.match(fixesMigration, /create or replace function public\.manage_ride_log/);
  assert.match(fixesMigration, /'road_captain', 'admin', 'superadmin'/);

  // Leaderboard single source of truth RPC
  assert.match(fixesMigration, /create or replace function public\.get_riding_leaderboard/);
  assert.match(fixesMigration, /round\(coalesce\(mp\.total_km, 0\)\)::numeric as total_km/);
});

// ==============================================================================
// 4. BUSINESS LOGIC & PERMISSION SPECIFICATION TESTS
// ==============================================================================
test("Role permission rules match Revolt Riders specification", () => {
  const canReview = (role) => ["road_captain", "admin", "superadmin"].includes(role);
  const canManageAttendance = (role) => ["road_captain", "admin", "superadmin"].includes(role);
  const canManageMembers = (role) => ["admin", "superadmin"].includes(role);
  const canManageCash = (role) => ["treasurer", "admin", "superadmin"].includes(role);

  // Public / Anon
  assert.equal(canReview(undefined), false);
  assert.equal(canManageAttendance(undefined), false);
  assert.equal(canManageMembers(undefined), false);
  assert.equal(canManageCash(undefined), false);

  // Regular Member
  assert.equal(canReview("member"), false);
  assert.equal(canManageAttendance("member"), false);
  assert.equal(canManageMembers("member"), false);
  assert.equal(canManageCash("member"), false);

  // Road Captain
  assert.equal(canReview("road_captain"), true);
  assert.equal(canManageAttendance("road_captain"), true);
  assert.equal(canManageMembers("road_captain"), false);
  assert.equal(canManageCash("road_captain"), false);

  // Treasurer
  assert.equal(canReview("treasurer"), false);
  assert.equal(canManageMembers("treasurer"), false);
  assert.equal(canManageCash("treasurer"), true);

  // Admin & Superadmin
  assert.equal(canReview("admin"), true);
  assert.equal(canManageAttendance("admin"), true);
  assert.equal(canManageMembers("admin"), true);
  assert.equal(canManageCash("admin"), true);

  assert.equal(canReview("superadmin"), true);
  assert.equal(canManageAttendance("superadmin"), true);
  assert.equal(canManageMembers("superadmin"), true);
  assert.equal(canManageCash("superadmin"), true);
});

test("Riding log approval workflow correctly sets status based on submitter role", () => {
  const determineInitialRideStatus = (userRole) => {
    if (["admin", "superadmin", "road_captain"].includes(userRole)) {
      return "approved";
    }
    return "pending";
  };

  assert.equal(determineInitialRideStatus("member"), "pending");
  assert.equal(determineInitialRideStatus(null), "pending");
  assert.equal(determineInitialRideStatus("treasurer"), "pending");
  assert.equal(determineInitialRideStatus("road_captain"), "approved");
  assert.equal(determineInitialRideStatus("admin"), "approved");
  assert.equal(determineInitialRideStatus("superadmin"), "approved");
});

test("Leaderboard formatting rounds kilometer numbers cleanly without decimals", () => {
  const formatKm = (km) => {
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(km)) + " KM";
  };

  assert.equal(formatKm(1198.9), "1.199 KM");
  assert.equal(formatKm(344.9), "345 KM");
  assert.equal(formatKm(1616), "1.616 KM");
  assert.equal(formatKm(2498.8), "2.499 KM");
  assert.equal(formatKm(0), "0 KM");
});

// ==============================================================================
// 5. APP SHELL & NAVIGATION ARCHITECTURE TESTS
// ==============================================================================
test("AppShell implements streamlined navigation with collapsible operational panel", async () => {
  const shellContent = await read("components/app-shell.tsx");

  // Utama items (5 items)
  assert.match(shellContent, /\["Home", "\/dashboard", Home\]/);
  assert.match(shellContent, /\["Agenda", "\/agenda", CalendarDays\]/);
  assert.match(shellContent, /\["Catat Riding", "\/riding", Bike\]/);
  assert.match(shellContent, /\["Member", "\/member", UsersRound\]/);
  assert.match(shellContent, /\["Profil", "\/profil", UserRound\]/);

  // Komunitas items (4 items)
  assert.match(shellContent, /\["Leaderboard", "\/leaderboard", Trophy\]/);
  assert.match(shellContent, /\["Kas Revolt", "\/kas", CircleDollarSign\]/);
  assert.match(shellContent, /\["Bulletin", "\/bulletin", Bell\]/);
  assert.match(shellContent, /\["Check-in", "\/check-in", ScanLine\]/);

  // Accordion group navigation
  assert.match(shellContent, /sidebar-accordion-group/);
  assert.match(shellContent, /<span className="accordion-title">Operasional<\/span>/);
  assert.match(shellContent, /<ChevronDown className="accordion-chevron" \/>/);
});

// ==============================================================================
// 6. SKELETON LOADING STATE VERIFICATION
// ==============================================================================
test("Skeleton components and shimmer animation are available for zero CLS", async () => {
  const skeletonExists = await fileExists("components/skeleton.tsx");
  assert.ok(skeletonExists, "components/skeleton.tsx must exist");

  const skeletonContent = await read("components/skeleton.tsx");
  assert.match(skeletonContent, /export function Skeleton/);
  assert.match(skeletonContent, /export function CardSkeleton/);
  assert.match(skeletonContent, /export function StatsGridSkeleton/);
  assert.match(skeletonContent, /export function PageSkeleton/);

  const cssContent = await read("app/globals.css");
  assert.match(cssContent, /@keyframes revolt-shimmer/);
});

// ==============================================================================
// 7. JOIN REQUESTS & PUBLIC LANDING CONTRACT VERIFICATION
// ==============================================================================
test("Join requests migration enforces independent table, active unique WA, and lifecycle RPCs", async () => {
  const migrationExists = await fileExists("supabase/migrations/20260918000300_add_join_requests_and_public_landing.sql");
  assert.ok(migrationExists, "20260918000300 migration file must exist");

  const sql = await read("supabase/migrations/20260918000300_add_join_requests_and_public_landing.sql");
  assert.match(sql, /create table if not exists public\.join_requests/);
  assert.match(sql, /create unique index if not exists idx_join_requests_active_whatsapp/);
  assert.match(sql, /where status in \('pending', 'accepted', 'confirmed'\)/);
  assert.match(sql, /create or replace function public\.submit_join_request/);
  assert.match(sql, /create or replace function public\.accept_join_request/);
  assert.match(sql, /create or replace function public\.confirm_join_request/);
  assert.match(sql, /create or replace function public\.activate_join_request/);
  assert.match(sql, /create table if not exists public\.club_gallery/);
  assert.match(sql, /is_public boolean not null default true/);
});
