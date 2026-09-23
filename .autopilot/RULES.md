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
- Target up to 8 safe unfinished tasks per sprint; aim for 8 when feasible without forcing retries or request bursts.
- Keep one product task per commit.
- For an 8-task sprint, product commits 1-7 MUST include `[skip ci]`. The final product commit MUST NOT include `[skip ci]`; it is the single remote UI Quality trigger for the cumulative sprint tree.
- If a sprint ends early because fewer tasks remain or a real blocker stops safe work, the last completed product commit becomes the final CI-triggering commit and must omit `[skip ci]`.
- Tracker-only commits under `.autopilot/**` never count as QA and are ignored by UI Quality.
- Do not poll GitHub Actions after every task. Check remote CI only after the final CI-triggering commit.
- Run focused/local QA while implementing tasks so obvious regressions are caught before the final remote CI.
- A cancelled historical/intermediate workflow is not a task failure when the final cumulative tree passes.
- When the sprint target is complete and final UI Quality is green, mark the lane `READY_FOR_INTEGRATION`.

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
- locally/checkpoint-style after any repair or medium/high-risk interaction, form, navigation, shared UI, loading/error, or structural responsive work
- remotely once at the final cumulative sprint head
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
- A builder's integration batch is its completed sprint with final remote UI Quality GREEN.
- Integration Guard may process both ready lanes in one run, but strictly one lane at a time.
- `diverged`, ahead/behind counts, or a stale mergeability calculation are NOT conflicts by themselves.
- GitHub PR `mergeable=true` is authoritative for a safe merge. If mergeability is unknown/pending, re-read it once after GitHub computes it. Only an actual `mergeable=false`/conflicting PR blocks automatic integration.
- Use a normal merge commit (`merge`), not squash/rebase, for builder-lane integration. This keeps the builder head as an ancestor of main so post-merge branch synchronization is a clean fast-forward.
- Re-run/confirm main Full QA after each merge.
- After a successful merge, wait for main UI Quality GREEN, then fast-forward the merged builder branch to current main and reset that lane tracker to ACTIVE/next task before the Guard run ends.
- If an older already-merged lane was integrated with squash and therefore cannot fast-forward, force-reset only that merged builder branch to verified current main after confirming it has zero unique product diff left. Never force-reset an unmerged lane.
- If another ready lane remains, evaluate its PR against the new main; never overwrite its owned work.
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


## Rate-limit protection
- A 429, Too Many Requests, or explicit provider rate-limit response is a hard stop for that provider during the current run.
- Do not immediate-retry the same provider in a loop.
- Preserve completed work, record RATE_LIMIT_PAUSE if needed, and let the next scheduled run recover.
- Avoid redundant reads of unchanged tracker/branch state and avoid per-task Slack updates.
