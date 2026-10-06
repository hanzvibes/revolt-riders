# CI & Repo Safety Hardening Design

## Goal

Harden Revolt Riders delivery safety without changing product behavior: make PR CI deterministic, move live-production integrity checks out of normal CI, add a minimal browser smoke flow, add dependency vulnerability gating, and enable `main` protection when repository permissions allow it.

## Scope

1. PR/main CI must not depend on mutable production database contents.
2. Live production data integrity checks remain available, but run in a separate scheduled/manual workflow.
3. Production integrity assertions must check invariants, not fixed business counts such as exactly 27 members.
4. Add one non-destructive browser E2E smoke flow against the locally built application.
5. Add a production-dependency audit gate for high/critical vulnerabilities.
6. Attempt to protect `main` with required CI checks; if the connected GitHub capability cannot modify repository administration settings, record the blocker instead of claiming success.

## Non-goals

- No product UI redesign.
- No database schema or migration changes.
- No production data writes from tests.
- No authenticated browser E2E that requires committing credentials or secrets.
- No broad dependency upgrades unless required to clear a high/critical production vulnerability.

## CI Design

### Deterministic CI

`pnpm test` runs only repository-local tests. `tests/database-integrity.test.mjs` is excluded from the normal test command and gets its own `test:production-integrity` script.

The existing `UI Quality` workflow keeps these gates:

1. install
2. contract tests
3. UI guardrails
4. TypeScript
5. lint
6. production dependency audit
7. production build
8. smoke production server
9. browser smoke

### Production integrity workflow

Create `.github/workflows/production-integrity.yml` with `workflow_dispatch` plus a conservative daily schedule. It runs only `pnpm test:production-integrity` and never writes data.

The database test keeps checks for:

- member IDs are valid and unique when readable;
- numeric KM values are non-negative;
- approved ride totals match profile totals when the tables are readable;
- no cancelled agenda remains;
- public gallery/event relations are valid when readable;
- no known test pollution markers exist.

It must not require a fixed number of members, fixed number of rides, or fixed number of gallery rows.

## Browser Smoke Design

Use Playwright Chromium against a local `next start` server. Keep it intentionally small and non-destructive:

- open `/` and verify the public landing page renders;
- navigate to `/login` through the visible login control when available, otherwise open `/login` directly;
- verify login page renders without page errors;
- verify a mobile viewport can render the public landing page without horizontal page overflow.

No login credentials, no form submission, no production write.

## Dependency Audit

Run `pnpm audit --prod --audit-level high`. If the current lockfile reports a high/critical production vulnerability, update only the minimum direct dependency necessary and rerun all gates.

## Branch Protection

Desired `main` rule:

- require pull request before merge;
- require the CI status used by the repository before merge;
- prevent accidental direct pushes where supported;
- do not require unavailable review teams or signatures beyond current repository capabilities.

Repository administration settings are external to source control. If the current GitHub connector lacks write access to branch protection/rulesets, this item is reported as an external blocker with exact UI steps and is not represented as completed.

## Success Criteria

- Normal PR CI passes without querying mutable production data.
- Production integrity checks remain runnable on schedule/manual trigger.
- No fixed `27 members` assertion remains.
- A real Chromium browser test runs in CI against the built app.
- Production dependency audit is a required CI step in the workflow.
- Full test/type/lint/build/smoke/browser gates pass on the branch and on `main` after merge.
- Vercel deployment succeeds for the merged commit.
- Branch protection is either enabled and verified, or explicitly reported as blocked by repository-admin permission.
