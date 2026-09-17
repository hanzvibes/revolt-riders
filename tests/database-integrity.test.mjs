import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uloqjgwgupuaatdixvsa.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__xL3dYFyGz8aicIEDUyHfQ_XGBsBdoa";

const supabase = createClient(url, key);

// ==============================================================================
// 1. MEMBER PROFILES (27 OFFICIAL MEMBERS VERIFICATION)
// ==============================================================================
test("Live Supabase database contains exactly 27 official member profiles without duplicates", async () => {
  const { data: profiles, error } = await supabase
    .from("member_profiles")
    .select("member_external_id, full_name, nickname, club_role, total_km")
    .order("member_external_id");

  assert.equal(error, null, `Query error: ${error?.message}`);
  assert.ok(profiles, "Profiles must be returned");
  assert.equal(profiles.length, 27, "Must contain exactly 27 official members");

  const idSet = new Set();
  for (const p of profiles) {
    assert.ok(p.member_external_id, "Each member must have an ID");
    assert.ok(p.member_external_id.startsWith("RR-"), "Member ID must start with RR-");
    assert.ok(!idSet.has(p.member_external_id), `Duplicate ID found: ${p.member_external_id}`);
    idSet.add(p.member_external_id);
    assert.ok(p.full_name && p.full_name.length > 0, "Full name must not be empty");
    assert.ok(typeof Number(p.total_km) === "number" && !isNaN(Number(p.total_km)), "total_km must be numeric");
    assert.ok(Number(p.total_km) >= 0, "total_km must be >= 0");
  }
});

// ==============================================================================
// 2. RIDE LOGS & SINGLE SOURCE OF TRUTH KM INTEGRITY
// ==============================================================================
test("Live ride_logs table maintains odometer math and matches profile total_km", async () => {
  const { data: rides, error: rideError } = await supabase
    .from("ride_logs")
    .select("id, member_external_id, odometer_start, odometer_end, distance_km, status, title");

  assert.equal(rideError, null, `Ride query error: ${rideError?.message}`);
  assert.ok(rides && rides.length > 0, "Ride logs must not be empty");

  // Verify distance_km = odometer_end - odometer_start
  for (const r of rides) {
    const diff = Number(r.odometer_end) - Number(r.odometer_start);
    // Allow slight float tolerance for historical decimals
    assert.ok(
      Math.abs(Number(r.distance_km) - diff) < 0.01,
      `Ride ${r.id} distance mismatch: ${r.distance_km} vs diff ${diff}`
    );
  }

  // Verify that approved ride logs aggregate matches member_profiles.total_km
  const { data: profiles } = await supabase.from("member_profiles").select("member_external_id, total_km");
  const approvedRides = rides.filter((r) => r.status === "approved");

  const sumMap = {};
  for (const r of approvedRides) {
    sumMap[r.member_external_id] = (sumMap[r.member_external_id] || 0) + Number(r.distance_km);
  }

  for (const p of profiles || []) {
    const rideSum = sumMap[p.member_external_id] || 0;
    const profileKm = Number(p.total_km);
    assert.ok(
      Math.abs(profileKm - rideSum) < 0.01,
      `Member ${p.member_external_id} total_km mismatch: ${profileKm} vs rides sum ${rideSum}`
    );
  }
});

// ==============================================================================
// 3. EVENT LIFECYCLE (ZERO CANCELLED OR ORPHANED AGENDA)
// ==============================================================================
test("Events table has no cancelled status and adheres to clean permanent deletion", async () => {
  const { data: cancelledEvents, error } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("status", "cancelled");

  assert.equal(error, null, `Event query error: ${error?.message}`);
  assert.equal(
    cancelledEvents?.length || 0,
    0,
    "No events should remain in 'cancelled' status per permanent deletion rule"
  );
});

// ==============================================================================
// 4. ANNOUNCEMENTS / BULLETINS READ INTEGRITY
// ==============================================================================
test("Announcements table can be queried or handled gracefully by RLS policy", async () => {
  const { data: bulletins, error } = await supabase
    .from("announcements")
    .select("id, title, is_published")
    .limit(10);

  if (error) {
    assert.equal(error.code, "42501", `Unexpected announcement error: ${error.message}`);
  } else {
    assert.ok(Array.isArray(bulletins), "Bulletins should return an array");
  }
});

// ==============================================================================
// 5. DATABASE CLEANUP INTEGRITY & DRIFT AUDIT
// ==============================================================================
test("Database is clean from temporary artifacts or test pollution", async () => {
  // Verify no member external ID has dummy/test prefixes
  const { data: testProfiles } = await supabase
    .from("member_profiles")
    .select("member_external_id")
    .ilike("member_external_id", "%test%");

  assert.equal(testProfiles?.length || 0, 0, "No test profiles should exist in production database");

  // Verify no test ride logs exist
  const { data: testRides } = await supabase
    .from("ride_logs")
    .select("id")
    .ilike("title", "%TEST_SMOKE_%");

  assert.equal(testRides?.length || 0, 0, "No test ride logs should exist in production database");
});
