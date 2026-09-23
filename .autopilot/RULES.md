# Revolt Riders Autopilot Rules

## Goal
Allow multiple frontend autopilots to work safely while the user is away, without uncontrolled backend changes or Vercel deploy spam.

## Builder lanes
- Dashboard builder: `feat/autopilot-dashboard`
- Profile builder: `feat/autopilot-profile`
- Integration/Repair Guard owns integration to `main`.

## Hard safety boundary
Builders and repair automation must NOT modify:
- Supabase schema/migrations/RLS/policies/auth configuration
- DB/Drizzle schema or migrations
- secrets/environment credentials
- production data
- permission/role logic
- destructive backend behavior

If required: mark `BLOCKED_BACKEND`, explain why, and continue safe work.

## Shared-file collision policy
- Respect file ownership written in each tracker.
- If a task needs a file owned by another lane or a global shared primitive, mark `WAITING_SHARED_COMPONENT`.
- Integration Guard may resolve a scoped frontend conflict after both branch changes are understood and QA is green.
- Never overwrite another lane's work just to make a merge pass.

## QA gate
Per task:
1. Relevant tests
2. UI audit
3. TypeScript
4. Lint
5. Production build
6. Start production server and HTTP smoke check

Per 10-task batch:
- broader regression
- compare against latest `main`
- no unresolved frontend regression
- no backend-sensitive diff
- branch CI green
- then mark READY_FOR_INTEGRATION

## Integration gate
- Merge only one ready batch at a time.
- Re-run/confirm main QA after merge.
- Production deploy is triggered only by a main commit containing `[deploy]`.
- Builders never create `[deploy]` commits.
- After release, verify production and scan runtime errors when available.
- If a safe frontend bug is evidenced, repair on a `fix/autopilot-repair` branch, QA, merge, then release.
- Backend-sensitive errors are reported, not modified automatically.

## Completion behavior
When all tasks for a lane are complete:
- switch to MAINTENANCE
- no speculative polish
- inspect only real CI/runtime/regression evidence
- make no code change if everything is healthy
