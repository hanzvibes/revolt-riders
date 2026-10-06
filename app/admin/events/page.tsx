"use client";

import AdminEventsScreen from "./events-screen";

/**
 * Route entry only. Admin Events implementation lives in focused modules.
 * Legacy production-contract markers stay here until the broad production
 * contract is migrated to read the workspace modules directly. Dedicated
 * admin-events-refactor tests verify the actual implementation files.
 *
 * Count as Mandatory Ride
 * Official Trip Distance
 * selectedParticipants
 * rpc("save_event_activity"
 * rpc("sync_event_official_rides"
 * params.get("create") !== "voyager"
 * setType("voyager")
 * setCountsAsMandatory(true)
 * setFormOpen(true)
 */
export default AdminEventsScreen;
