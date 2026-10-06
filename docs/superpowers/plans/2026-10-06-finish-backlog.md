# Finish Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the remaining low-risk architecture/refactor/cleanup backlog for Revolt Riders, then run full regression and deployment verification.

**Architecture:** Work in bounded batches on a feature branch. Preserve existing UI/behavior unless a documented correctness bug is found. Prefer audit-driven no-ops over speculative deletion.

**Tech Stack:** Next.js, TypeScript, pnpm, Supabase, GitHub Actions, Vercel.

**Spec:** Current backlog from this conversation (tasks 9–50 after housekeeping 1–8).

## Global Constraints
- Accuracy first; YAGNI and minimal diff.
- No direct writes to `main`.
- No UI redesign.
- No database schema changes unless strictly required; prefer no-op audits.
- Browser E2E remains skipped by user request.
- One final squash merge with `[deploy]` after full CI is green.

## Review Focus
- Analytics percentages must be bounded and semantically consistent.
- Cash aggregation must not double-count legacy/current tables.
- Cleanup must not delete active Vite/Cloudflare/Drizzle paths.
- Admin dashboard changes must not duplicate/remove dedicated-page functionality incorrectly.
- CSS cleanup must not change visual behavior.

---

### Task 1: Audit Playwright config and package scripts
Audit duplicate browser-test config and unused scripts. Change only proven dead/duplicate items.

### Task 2: Refactor Admin Insights
Extract model/data helpers, fix bounded analytics correctness issues, and add characterization tests.

### Task 3: Audit Profile, Kas, Garage, Leaderboard
Measure complexity and refactor only where clearly justified; otherwise close as verified no-op.

### Task 4: Audit Admin Dashboard responsibilities
Remove only responsibilities already replaced by dedicated admin pages and preserve navigation/workflows.

### Task 5: Audit CSS ownership
Reduce only proven legacy duplication without redesign or selector churn.

### Task 6: Audit legacy stack and generated state
Audit Vite, Cloudflare, Drizzle, examples/d1, hosting/auth files, dependencies, tsbuildinfo, and Supabase temp state. Remove only proven unused tracked state/config/deps.

### Task 7: Full verification
Run contract tests, UI guardrails, TypeScript, lint, production build, smoke server, branch CI, squash merge `[deploy]`, main CI, and Vercel status.
