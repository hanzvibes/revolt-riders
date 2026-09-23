# Profile Autopilot

Surface: `/profil`
Branch: `feat/autopilot-profile`
Status: ACTIVE
Batch size: 10
Sprint target: 8 safe tasks per hourly run
Deploy: Integration Guard only
Last Full QA checkpoint: none

## Rules
- Frontend/UI/UX only and follow `.autopilot/RULES.md` on main.
- Existing profile reads/writes must keep the same behavior.
- Do not change Supabase queries, tables, schema, migrations, RLS, auth, permissions, secrets, or production data.
- Do not use `[deploy]` in builder commits.
- One product task per commit.
- Low-risk isolated UI work may use Quick QA; Full QA is required by the global risk-based QA rules.
- After two failed safe repair attempts on the same task, mark `NEEDS_REVIEW` and continue with an independent task.
- Backend/data requirement => `BLOCKED_BACKEND`.
- Cross-lane/global primitive requirement => `WAITING_SHARED_COMPONENT`.
- At each 10-task boundary, run Full QA + broad regression, mark READY_FOR_INTEGRATION, and stop until Integration Guard releases the batch.
- After Task 50, enter MAINTENANCE mode. Only evidence-based fixes.

## File ownership
Primary:
- `app/profil/**`

Allowed with strict selector scope:
- existing CSS rules that target only `.profile-*` or `.member-passport-*`

Do not edit:
- dashboard feed files
- `app/bottom-navigation.css`
- `components/app-shell.tsx`
- global tokens/design primitives
- package/lock/workflow files
- backend/Supabase/DB files

## Queue
- [x] 01 Profile Visual Baseline Audit
- [x] 02 Cover Height & Composition
- [ ] 03 Fix MEMBER NETWORK Cover Overlap
- [ ] 04 Avatar Scale & Position
- [ ] 05 Edit Profile Button Hierarchy
- [ ] 06 Name & Verified Icon Alignment
- [ ] 07 Full Name Secondary Hierarchy
- [ ] 08 Handle, Role & Active Row Polish
- [ ] 09 Bio Readability
- [ ] 10 Member Meta Row Spacing
- [ ] 11 Profile Stats Row Polish
- [ ] 12 Quick Actions Layout
- [ ] 13 Hero Small-Phone Composition
- [ ] 14 Hero Tablet Composition
- [ ] 15 Hero Desktop Width & Balance
- [ ] 16 Edit Profile Sheet Header
- [ ] 17 Edit Profile Field Density
- [ ] 18 Input Focus, Error & Success States
- [ ] 19 Edit Sheet Keyboard & Safe-Area
- [ ] 20 Save Button Loading/Disabled State
- [ ] 21 Road Progress Card Hierarchy
- [ ] 22 Road Level Typography
- [ ] 23 Progress Track Polish
- [ ] 24 Milestone Scale Readability
- [ ] 25 Milestone Callout Polish
- [ ] 26 Achievement Header Hierarchy
- [ ] 27 Achievement Timeline Layout
- [ ] 28 Locked/Unlocked Achievement States
- [ ] 29 Achievement Timeline Mobile Pass
- [ ] 30 Progress + Achievement Grid Balance
- [ ] 31 Riding History Header
- [ ] 32 Catat Riwayat CTA Polish
- [ ] 33 Ride Row Density
- [ ] 34 Ride Icon & Status Treatment
- [ ] 35 Long Ride Title Handling
- [ ] 36 Ride Metadata, Odometer & Event Tags
- [ ] 37 Rejected Reason Presentation
- [ ] 38 Edit/Delete Ride Tap Targets
- [ ] 39 Ride Empty State
- [ ] 40 Ride Error State
- [ ] 41 Profile Loading Skeleton Pass
- [ ] 42 Logged-Out & Verification States
- [ ] 43 Logout Action Placement
- [ ] 44 Keyboard Focus Audit
- [ ] 45 Mobile Touch Target Audit
- [ ] 46 Reduced Motion Audit
- [ ] 47 Small Phone Stress Test
- [ ] 48 Tablet/Desktop Responsive Pass
- [ ] 49 Visual Regression & Consistency Audit
- [ ] 50 Final Profile UAT & Polish

## Baseline findings
- Profile is already organized into a social identity hero, member stats/quick actions, road-level progress, achievement timeline, riding history, edit-profile sheet, and ride edit flow.
- Existing Supabase reads/writes and auth behavior are explicitly out of scope and remain untouched.
- Highest-priority visual risks for the first batch are cover/avatar overlap, dense identity metadata on small screens, inconsistent hierarchy between hero/stat/action regions, and inline-styled riding rows that will need later profile-scoped cleanup.
- Task 02 onward can be implemented without changing data contracts by keeping changes to `/profil` markup/classes and strictly profile-scoped styles.

## Recovery checkpoint
Before starting new work, reconcile the latest task commit and tracker state. Intermediate same-lane GitHub Actions may remain in progress while the same sprint continues; only a separate active sprint lock should block a new invocation.

## Run log
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`

2026-09-23 10:28 WIB | 01 Profile Visual Baseline Audit | DONE | 2446d62fda818a4e83093966635576924e3c9e99 | branch QA GREEN | Audited current /profil structure and established safe frontend-only priorities; no product/data behavior changed.
2026-09-23 11:29 WIB | 02 Cover Height & Composition | QA_PENDING | aa55aef2f679e4511e0c05c04546e99ff3e3fa61 | Quick QA unavailable: no same-lane GitHub Actions run; remote execution device unavailable | Implemented profile-scoped cover composition in app/profil/layout.tsx; task remains unchecked until required QA can run. No backend/data/shared-global changes.

2026-09-23 13:00 WIB | 02 Cover Height & Composition | DONE | aa55aef2f679e4511e0c05c04546e99ff3e3fa61 | Full branch UI Quality GREEN via checkpoint run 35818641585 on d16079b4522339deff8aec01b35071a5ca8ac712 | Reconciled cancelled task run: checkpoint commit changed only .autopilot/profile.md, so successful branch workflow validates the task tree. Next task: 03 Fix MEMBER NETWORK Cover Overlap.
