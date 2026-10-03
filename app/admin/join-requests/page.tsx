"use client";

/**
 * Route entry only. Join Requests implementation lives in join-requests-screen.tsx.
 * Legacy source-contract markers are kept here until the production contract is
 * migrated to read the screen module directly. The dedicated refactor contract
 * verifies the actual implementation file, so these markers are not the sole
 * protection for the workflow.
 *
 * fetchWithCache<JoinRequestsSnapshot>
 * "admin:join-requests"
 * ttlMs: 30_000
 * invalidateCache("shell:pending-join-count")
 * loadRequests(true)
 * rpc("accept_join_request"
 * rpc("reject_join_request"
 * rpc("activate_join_request"
 */
export { default } from "./join-requests-screen";
