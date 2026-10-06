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

### Task 1: Audit Playwright config and package scripts — DONE
- No Playwright config, dependency, or package script is tracked: verified no-op.
- Existing package scripts remain purposeful. `db:generate` is paired with the tracked Drizzle/D1 scaffold; test/lint/build/audit scripts are active in CI/workflows.

### Task 2: Refactor Admin Insights — DONE
- Extracted `insights-model.ts` and `insights-data.ts`.
- RSVP response rate now uses unique invited member-event pairs as the denominator and ignores orphan responses, so it cannot exceed 100%.
- Attendance rate now uses unique `attending` RSVP member-event pairs and counts only matching check-ins, matching Admin Attendance semantics.
- `club_cash_transactions` excludes voided transactions. The legacy `cash_transactions` + current `club_cash_transactions` union is intentional and already used by database summary/dashboard functions, so both sources remain.
- Added characterization tests for normal, duplicate, empty-denominator, and data-error behavior.

### Task 3: Audit Profile, Kas, Garage, Leaderboard — DONE / VERIFIED NO-OP
- Profile is large but remains one cohesive member workspace and already delegates ride mutation logic to shared services/cache/dialogs.
- Kas is a cohesive finance workspace with secure RPC boundaries and production-contract coverage; no correctness defect was found that justifies a risky structural split.
- Garage is a bounded owner-managed CRUD workspace with RPC-only mutation contracts.
- Leaderboard is primarily read/presentation logic with one KM source and existing contract coverage.
- File length alone is not used as a reason to refactor; no behavior-preserving split was compelling enough to justify churn in this batch.

### Task 4: Audit Admin Dashboard responsibilities — DONE / VERIFIED NO-OP
- Dedicated Events, Members, Attendance, Join Requests, and Insights pages now exist.
- `/admin` still acts as a consolidated operations cockpit: event context is shared by invitation generation, RSVP monitoring, QR rotation, account-request handling, and quick operational actions.
- Existing production contracts also protect the legacy Official KM sync and Superadmin role boundary in this route.
- Removing event/role controls would change current admin UX rather than merely remove dead responsibility, so no dashboard workflow was deleted in this low-risk pass.

### Task 5: Audit CSS ownership — DONE / VERIFIED NO-OP
- Ownership remains layered: `tokens.css` for tokens, `globals.css` for global/base legacy rules, `system-ui.css` for shared application UI, `native-admin.css` for admin surfaces, `social-feed.css` for feed surfaces, `landing.css` for landing, plus route-specific Dashboard/Profile/QR styles.
- `scripts/audit-ui-css.mjs` already enforces UI debt budgets in CI.
- Without browser E2E (explicitly skipped), deleting legacy selectors would be speculative and could create visual regressions, so no selector churn was performed.

### Task 6: Audit legacy stack and generated state — DONE
- Vite/vinext, Cloudflare plugin/types/wrangler, `.openai/hosting.json`, and `build/sites-vite-plugin.ts` are connected by `vite.config.ts` and remain active alternate-hosting/tooling infrastructure.
- Drizzle ORM/Kit, `db/`, `drizzle.config.ts`, `drizzle/`, and `examples/d1/` remain an intentional opt-in D1 scaffold; `db:generate` is therefore retained.
- `cloudflare-env.d.ts` supports the Cloudflare/D1 scaffold and remains.
- Removed unused `app/chatgpt-auth.ts`; no imports/usages exist, while local Sites auth mocking lives in the active Vite plugin.
- Stopped tracking generated `tsconfig.tsbuildinfo` and `supabase/.temp/cli-latest`; added `*.tsbuildinfo` and `/supabase/.temp/` ignore rules.

### Task 7: Full verification — IN PROGRESS
Run contract tests, UI guardrails, TypeScript, lint, production build, smoke server, branch CI, squash merge `[deploy]`, main CI, and Vercel status.
