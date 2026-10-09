import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uloqjgwgupuaatdixvsa.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable__xL3dYFyGz8aicIEDUyHfQ_XGBsBdoa";

const supabase = createClient(url, key);

test("Member profiles stay private to anon or preserve official data integrity", async () => {
  const { data: profiles, error } = await supabase
    .from("member_profiles")
    .select("member_external_id, full_name, nickname, club_role, total_km")
    .order("member_external_id");

  if (error) {
    assert.equal(error.code, "42501", `Unexpected member_profiles error: ${error.message}`);
    assert.match(error.message, /permission denied/i);
    return;
  }

  assert.ok(Array.isArray(profiles), "Profiles must return an array when readable");

  const idSet = new Set();
  for (const profile of profiles) {
    assert.match(profile.member_external_id, /^RR-\d{3,}$/, "Member ID must use the RR-### format");
    assert.ok(!idSet.has(profile.member_external_id), `Duplicate ID found: ${profile.member_external_id}`);
    idSet.add(profile.member_external_id);
    assert.ok(profile.full_name && profile.full_name.length > 0, "Full name must not be empty");
    assert.ok(Number.isFinite(Number(profile.total_km)), "total_km must be numeric");
    assert.ok(Number(profile.total_km) >= 0, "total_km must be >= 0");
  }
});

test("Ride logs stay private to anon or preserve KM integrity", async () => {
  const { data: rides, error: rideError } = await supabase
    .from("ride_logs")
    .select("id, member_external_id, odometer_start, odometer_end, distance_km, status, title");

  if (rideError) {
    assert.equal(rideError.code, "42501", `Unexpected ride_logs error: ${rideError.message}`);
    assert.match(rideError.message, /permission denied/i);
    return;
  }

  assert.ok(Array.isArray(rides), "Ride logs must return an array when readable");

  for (const ride of rides) {
    const diff = Number(ride.odometer_end) - Number(ride.odometer_start);
    assert.ok(
      Math.abs(Number(ride.distance_km) - diff) < 0.01,
      `Ride ${ride.id} distance mismatch: ${ride.distance_km} vs diff ${diff}`,
    );
  }

  const { data: profiles, error: profileError } = await supabase
    .from("member_profiles")
    .select("member_external_id, total_km");

  if (profileError) {
    assert.equal(profileError.code, "42501", `Unexpected member_profiles error: ${profileError.message}`);
    return;
  }

  const approvedRides = rides.filter((ride) => ride.status === "approved");
  const sumMap = new Map();
  for (const ride of approvedRides) {
    sumMap.set(
      ride.member_external_id,
      (sumMap.get(ride.member_external_id) || 0) + Number(ride.distance_km),
    );
  }

  for (const profile of profiles || []) {
    const rideSum = sumMap.get(profile.member_external_id) || 0;
    const profileKm = Number(profile.total_km);
    assert.ok(
      Math.abs(profileKm - rideSum) < 0.01,
      `Member ${profile.member_external_id} total_km mismatch: ${profileKm} vs rides sum ${rideSum}`,
    );
  }
});

test("Events table has no cancelled status and adheres to clean permanent deletion", async () => {
  const { data: cancelledEvents, error } = await supabase
    .from("events")
    .select("id, title, status")
    .eq("status", "cancelled");

  assert.equal(error, null, `Event query error: ${error?.message}`);
  assert.equal(
    cancelledEvents?.length || 0,
    0,
    "No events should remain in 'cancelled' status per permanent deletion rule",
  );
});

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

test("Database is clean from temporary artifacts or test pollution", async () => {
  const { data: testProfiles } = await supabase
    .from("member_profiles")
    .select("member_external_id")
    .ilike("member_external_id", "%test%");

  assert.equal(testProfiles?.length || 0, 0, "No test profiles should exist in production database");

  const { data: testRides } = await supabase
    .from("ride_logs")
    .select("id")
    .ilike("title", "%TEST_SMOKE_%");

  assert.equal(testRides?.length || 0, 0, "No test ride logs should exist in production database");
});

test("Ride Stories and public activities preserve valid relationships when present", async () => {
  const { data: gallery, error: galleryError } = await supabase
    .from("club_gallery")
    .select("id, title, description, image_url, location, ride_date, event_id, events:event_id(id, title, type, slug)")
    .eq("is_public", true)
    .order("ride_date", { ascending: false });

  assert.equal(galleryError, null, `Gallery query error: ${galleryError?.message}`);
  assert.ok(Array.isArray(gallery), "Gallery must return an array");

  for (const item of gallery) {
    assert.ok(item.id, "Gallery item must have id");
    assert.ok(item.title, "Gallery item must have title");
    assert.ok(item.image_url, "Gallery item must have image_url");
    if (item.events) {
      assert.ok(item.events.id, "Linked event must have id");
      assert.ok(item.events.title, "Linked event must have title");
      assert.ok(item.events.type, "Linked event must have type");
    }
  }

  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id, title, slug, type, start_at, status")
    .in("status", ["published", "completed"]);

  assert.equal(eventError, null, `Events query error: ${eventError?.message}`);
  assert.ok(Array.isArray(events), "Events must return an array");
});
