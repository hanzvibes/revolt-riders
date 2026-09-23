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

## Hourly sprint policy
- One hourly builder invocation means one multi-task sprint, not one task.
- Target exactly 8 safe unfinished tasks per sprint when 8 safe tasks are available.
- Do not stop after the first successful task.
- Stop before 8 only when fewer tasks remain or a genuine hard blocker makes further independent work unsafe.
- Each successful 8-task sprint is one integration batch.
- Keep one product task per commit.
- Intermediate task commits may trigger GitHub Actions in the background. Do not wait for each intermediate remote CI run before continuing.
- A cancelled intermediate workflow that was superseded by a later sprint commit is not itself a failure.
- Validate the cumulative sprint head with Full QA before declaring the sprint successful.
- When 8 tasks are completed and final Full QA is green, mark the lane `READY_FOR_INTEGRATION`.

## Sprint lock and recovery
Before a builder starts:
1. Reconcile the tracker, latest task commit, and branch state.
2. Mark the current sprint RUNNING in the branch tracker with its intended 8-task range.
3. A newer automation invocation must not overwrite an actively running sprint.
4. If a prior sprint was interrupted, reconcile its last committed task and tracker state, then continue from the next safe task.
5. Do not use an in-progress GitHub Actions run from an intermediate task commit as a sprint lock.
6. Never overwrite or reset another lane's work.

## Task states
- TODO: unchecked task with no status suffix
- RUNNING: current task/sprint in progress
- DONE: checked task
- NEEDS_REVIEW: safe task failed twice or needs a human/product decision
- BLOCKED_BACKEND: requires forbidden backend-sensitive work
- WAITING_SHARED_COMPONENT: requires a cross-lane/global primitive or real merge conflict
- READY_FOR_INTEGRATION: sprint-level state after 8 tasks + final Full QA

## Sprint QA
### Quick QA for low-risk isolated UI tasks
Run:
1. relevant focused tests
2. `pnpm audit:ui`
3. `pnpm exec tsc --noEmit`

### Full QA checkpoint
Run:
1. relevant tests
2. `pnpm audit:ui`
3. TypeScript
4. lint
5. production build
6. production-server HTTP smoke

Full QA is mandatory:
- after every 4 completed tasks inside the sprint
- after any repair
- for medium/high-risk interaction, form, navigation, shared UI, loading/error, or structural responsive work
- at the final 8-task sprint head
- before READY_FOR_INTEGRATION
- before integration/release

If Quick QA reveals a regression, repair it and upgrade the validation to Full QA.

## Failure handling
- A task may receive up to two safe repair attempts in one sprint.
- If it still fails, mark `NEEDS_REVIEW` with evidence and continue with another independent safe task.
- `NEEDS_REVIEW`, `BLOCKED_BACKEND`, and `WAITING_SHARED_COMPONENT` should not be retried every hour unless new evidence or a relevant code change exists.

## Shared-file collision policy
- Respect file ownership written in each tracker.
- If a task needs a file owned by another lane or a global shared primitive, mark `WAITING_SHARED_COMPONENT`.
- Integration Guard may resolve a scoped frontend conflict after both branch changes are understood and QA is green.
- Never overwrite another lane's work just to make a merge pass.

## Integration gate
- A builder's integration batch is its completed 8-task sprint.
- Integration Guard may process both ready lanes in one run, but strictly one lane at a time.
- Re-run/confirm main Full QA after each merge.
- After merging one lane, synchronize/rebase the other ready lane safely against the new main before merging it.
- Production deploy is triggered only by a main commit containing `[deploy]`.
- Builders never create `[deploy]` commits.
- After release, verify production and scan runtime errors when available.
- Safe frontend production regressions may be repaired or the offending frontend batch reverted after Full QA.
- Backend-sensitive errors are reported, not modified automatically.

## Reporting policy
- Slack channel: `#revolt-autopilot` / `C0C4MLT17FS`.
- Status board message: `1790137463.205899`.
- Builders and Guard must read the current status-board message before editing it, preserve other lanes, and update only their own line(s).
- New Slack messages are only for meaningful events: sprint completion, blocker, QA failure, batch readiness, merge, repair, release, rollback, or production state change.
- Do not post repeated no-change reports.

## Completion behavior
When all tasks for a lane are complete:
- switch to MAINTENANCE
- no speculative polish
- inspect only real CI/runtime/regression evidence
- make no code change if everything is healthy
