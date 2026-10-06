# CI & Repo Safety Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Revolt Riders CI deterministic, preserve separate live-production integrity checks, add a minimal real-browser smoke test, add dependency auditing, and verify `main` protection where permissions allow.

**Architecture:** Keep repository-local verification in the existing UI Quality workflow and move live Supabase integrity checks into a separate scheduled/manual workflow. Add Playwright only for a small non-destructive public browser smoke path. Repository-admin branch protection is attempted separately from source changes and must be reported honestly if unavailable.

**Tech Stack:** Next.js 16, Node 22.13, pnpm 11.25, Node test runner, GitHub Actions, Playwright Chromium, Supabase.

**Spec:** `docs/superpowers/specs/2026-10-06-ci-repo-safety-design.md`

## Global Constraints

- No product behavior or UI redesign.
- No database schema changes.
- No production writes from tests.
- No committed credentials or auth secrets.
- Only minimum dependency changes needed for high/critical production vulnerabilities.
- Browser E2E stays non-destructive and unauthenticated.

## Review Focus

- Normal PR test command must not execute live production database queries.
- Production-integrity workflow must still fail on real invariant violations without fixed row counts.
- Browser smoke must test a real built server, not static source matching.
- Dependency audit must gate high/critical production vulnerabilities without including dev-only findings.
- Existing build/smoke gates must remain intact after workflow edits.

---

### Task 1: Split mutable production integrity tests from normal CI

**Files:**
- Modify: `package.json`
- Modify: `tests/database-integrity.test.mjs`
- Create: `.github/workflows/production-integrity.yml`

**Interfaces:**
- Produces: `pnpm test` for deterministic repository-local tests.
- Produces: `pnpm test:production-integrity` for live read-only database checks.

- [ ] **Step 1: Add a repository test asserting scripts/workflow separation**

Add a test that verifies `package.json` excludes `database-integrity.test.mjs` from the normal test command and exposes `test:production-integrity`, and verifies the production workflow calls only that script.

- [ ] **Step 2: Run the new test and verify RED**

Run: `pnpm test`
Expected: FAIL because the scripts/workflow have not been split yet.

- [ ] **Step 3: Implement script and workflow separation**

Normal `test` uses Node's test runner while excluding `tests/database-integrity.test.mjs`. `test:production-integrity` runs that file directly. Create a scheduled/manual workflow using Node 22.13 and pnpm 11.25.

- [ ] **Step 4: Replace fixed business-count assertions with invariants**

Remove the exact 27-member requirement and any requirement that legitimate production collections be non-empty solely to satisfy CI. Keep validity, uniqueness, relationship, privacy, and pollution checks.

- [ ] **Step 5: Run both test paths**

Run: `pnpm test`
Expected: PASS without live production dependency.

Run: `pnpm test:production-integrity`
Expected: PASS against current production or fail only on an actual documented invariant violation.

### Task 2: Add production dependency vulnerability gate

**Files:**
- Modify: `.github/workflows/ui-quality.yml`
- Modify if required: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: CI step `Production dependency audit` running `pnpm audit --prod --audit-level high`.

- [ ] **Step 1: Add contract assertion for the audit gate**

Test exact workflow presence of `pnpm audit --prod --audit-level high`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test`
Expected: FAIL until workflow contains the gate.

- [ ] **Step 3: Add the workflow step**

Place it after lint and before production build.

- [ ] **Step 4: Run dependency audit**

Run: `pnpm audit --prod --audit-level high`
Expected: exit 0. If not, update only the minimum affected direct production dependency and rerun.

### Task 3: Add minimal real-browser smoke coverage

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `playwright.config.ts`
- Create: `tests/browser/public-smoke.spec.ts`
- Modify: `.github/workflows/ui-quality.yml`

**Interfaces:**
- Produces: `pnpm test:browser`.
- Browser target: local `next start` server.

- [ ] **Step 1: Add contract assertion that browser smoke is wired into CI**

Verify the browser script, Chromium installation step, and browser smoke workflow step exist.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test`
Expected: FAIL until browser tooling is wired.

- [ ] **Step 3: Add Playwright as a dev dependency and minimal config**

Use one Chromium project, local base URL `http://127.0.0.1:3000`, no retries locally, one CI retry maximum if needed, and trace only on first retry.

- [ ] **Step 4: Implement non-destructive public smoke tests**

Assertions:
- `/` renders without browser page errors;
- `/login` renders;
- mobile landing page has no document-level horizontal overflow.

- [ ] **Step 5: Wire browser smoke into CI against built server**

Install Chromium, start `pnpm start`, wait for HTTP readiness, run `pnpm test:browser`, and always terminate the server.

- [ ] **Step 6: Run local browser verification**

Run: `pnpm exec playwright install chromium` then `pnpm build` then the browser smoke command against `pnpm start`.
Expected: PASS.

### Task 4: Full regression and branch review

**Files:** all changed files above.

- [ ] **Step 1: Run deterministic tests**
Run: `pnpm test`
Expected: PASS.

- [ ] **Step 2: Run UI guardrails**
Run: `pnpm audit:ui`
Expected: PASS.

- [ ] **Step 3: Run TypeScript**
Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Run lint**
Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 5: Run production dependency audit**
Run: `pnpm audit --prod --audit-level high`
Expected: PASS.

- [ ] **Step 6: Run production build and server smoke**
Run: `pnpm build`, then start server and curl `/`.
Expected: PASS.

- [ ] **Step 7: Run browser smoke**
Run browser smoke against the built local server.
Expected: PASS.

- [ ] **Step 8: Review final diff for scope creep**
Expected: only CI/test/tooling/docs changes; no product behavior or DB schema changes.

### Task 5: Merge and verify delivery

**Files:** none additional unless CI reveals a defect.

- [ ] **Step 1: Open one PR and require branch CI green**
Expected: all configured checks pass.

- [ ] **Step 2: Squash merge with `[deploy]`**
Expected: one signed merge commit on `main`.

- [ ] **Step 3: Verify post-merge GitHub Actions**
Expected: test, UI, typecheck, lint, dependency audit, build, server smoke, and browser smoke pass.

- [ ] **Step 4: Verify Vercel status**
Expected: deployment success for the merge commit.

### Task 6: Attempt `main` protection

**Files:** none; repository administration setting.

- [ ] **Step 1: Inspect available GitHub capabilities for branch protection or ruleset writes**
Expected: identify a supported administration write action or prove the connector lacks it.

- [ ] **Step 2: Enable required protection when supported**
Desired: PR required and the repository CI check required before merge/direct push bypass.

- [ ] **Step 3: Read back `main` protection**
Expected when supported: `protected: true` with required check enforcement.

If administration writes are unavailable, leave source state untouched and report the exact external blocker; do not claim protection is enabled.
