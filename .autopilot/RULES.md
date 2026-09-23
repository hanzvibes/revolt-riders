# Revolt Riders Autopilot Rules

## Goal
Move frontend work forward quickly while the user is away, with strong guardrails around production and backend-sensitive systems.

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

If required: mark `BLOCKED_BACKEND`, explain why, and continue independent safe work.

## Fast execution policy
- Each builder run has a 45-minute work budget and a maximum target of 8 safe tasks.
- Do not force the task count. Finish fewer tasks if they are larger or verification needs more time.
- Prefer independent tasks when an earlier task is blocked.
- Never combine multiple unfinished product tasks into one commit.
- A task may be attempted at most twice in one run. If the same safe frontend task still fails after two repair attempts, mark it `NEEDS_REVIEW`, record the evidence, and continue with an independent safe task.
- `NEEDS_REVIEW`, `BLOCKED_BACKEND`, and `WAITING_SHARED_COMPONENT` tasks must not be retried every hour unless new evidence or a relevant code change exists.

## Run lock and recovery
Before a builder starts:
1. Inspect the builder branch and its current GitHub Actions/QA runs.
2. If a previous builder QA/build for the same lane is still running, do not start another product change.
3. If a prior run appears interrupted, reconcile the last task first: compare tracker state, latest task commit, and QA result.
4. If a task commit exists but the tracker was not updated, verify it and repair the tracker before starting new work.
5. Never overwrite or reset another run's work.

## Task states
Use tracker queue text and run log consistently:
- TODO: unchecked task with no status suffix
- DONE: checked task
- NEEDS_REVIEW: safe task failed twice or needs a human/product decision
- BLOCKED_BACKEND: requires forbidden backend-sensitive work
- WAITING_SHARED_COMPONENT: requires a cross-lane/global primitive or real merge conflict
- READY_FOR_INTEGRATION: batch-level state after the 10-task regression gate

## Risk-based QA
### Quick QA for low-risk isolated UI tasks
Run:
1. relevant focused tests
2. `pnpm audit:ui`
3. `pnpm exec tsc --noEmit`

A low-risk task is isolated styling/layout/copy/presentation work inside lane-owned files with no shared navigation, data-flow, auth, form-submission, or interaction-contract change.

### Full QA
Run:
1. relevant tests
2. `pnpm audit:ui`
3. TypeScript
4. lint
5. production build
6. production-server HTTP smoke

Full QA is mandatory when:
- the task affects interaction behavior, forms, navigation, shared UI, responsive behavior with structural changes, or loading/error states
- the task is medium/high frontend risk
- three tasks have completed since the last Full QA checkpoint
- a repair was needed
- a 10-task batch boundary is reached
- before READY_FOR_INTEGRATION
- before integration/release

If Quick QA reveals a regression, upgrade that task to Full QA after repair.

## Shared-file collision policy
- Respect file ownership written in each tracker.
- If a task needs a file owned by another lane or a global shared primitive, mark `WAITING_SHARED_COMPONENT`.
- Integration Guard may resolve a scoped frontend conflict after both branch changes are understood and QA is green.
- Never overwrite another lane's work just to make a merge pass.

## Integration gate
- Merge only one ready batch at a time.
- Re-run/confirm main Full QA after merge.
- Production deploy is triggered only by a main commit containing `[deploy]`.
- Builders never create `[deploy]` commits.
- After release, verify production and scan runtime errors when available.
- If a clearly evidenced safe frontend regression reaches production, Integration Guard may make the smallest repair or revert the offending frontend batch to the last known healthy frontend state, then run Full QA before release.
- Backend-sensitive errors are reported, not modified automatically.

## Reporting policy
- Slack channel: `#revolt-autopilot` / `C0C4MLT17FS`.
- Status board message: `1790137463.205899`.
- Builders and Guard must read the current status-board message before editing it, preserve other lanes, and update only their own line(s).
- New Slack messages are only for meaningful events: completed work, blocker, QA failure, batch readiness, merge, repair, release, rollback, or production state change.
- Do not post repeated no-change reports.

## Completion behavior
When all tasks for a lane are complete:
- switch to MAINTENANCE
- no speculative polish
- inspect only real CI/runtime/regression evidence
- make no code change if everything is healthy
