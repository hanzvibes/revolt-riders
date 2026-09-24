# Profile Autopilot

Surface: `/profil`
Branch: `feat/autopilot-profile`
Status: READY_FOR_INTEGRATION
Batch size: 8
Sprint target: 8 safe tasks per hourly run
Deploy: Integration Guard only
Last Full QA checkpoint: UI Quality GREEN on 9455635bd7bc31bfe43c7431db62c65d78ada6f2 / run 35943655558

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
- After 8 tasks in the current sprint, run final Full QA + broad regression, mark READY_FOR_INTEGRATION, and stop until Integration Guard releases that sprint.
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
- [x] 03 Fix MEMBER NETWORK Cover Overlap
- [x] 04 Avatar Scale & Position
- [x] 05 Edit Profile Button Hierarchy
- [x] 06 Name & Verified Icon Alignment
- [x] 07 Full Name Secondary Hierarchy
- [x] 08 Handle, Role & Active Row Polish
- [x] 09 Bio Readability
- [x] 10 Member Meta Row Spacing
- [x] 11 Profile Stats Row Polish
- [x] 12 Quick Actions Layout
- [x] 13 Hero Small-Phone Composition
- [x] 14 Hero Tablet Composition
- [x] 15 Hero Desktop Width & Balance
- [x] 16 Edit Profile Sheet Header
- [x] 17 Edit Profile Field Density
- [x] 18 Input Focus, Error & Success States
- [x] 19 Edit Sheet Keyboard & Safe-Area
- [x] 20 Save Button Loading/Disabled State
- [x] 21 Road Progress Card Hierarchy
- [x] 22 Road Level Typography
- [x] 23 Progress Track Polish
- [x] 24 Milestone Scale Readability
- [x] 25 Milestone Callout Polish
- [x] 26 Achievement Header Hierarchy
- [x] 27 Achievement Timeline Layout
- [x] 28 Locked/Unlocked Achievement States
- [x] 29 Achievement Timeline Mobile Pass
- [x] 30 Progress + Achievement Grid Balance
- [x] 31 Riding History Header
- [x] 32 Catat Riwayat CTA Polish
- [x] 33 Ride Row Density
- [x] 34 Ride Icon & Status Treatment
- [x] 35 Long Ride Title Handling
- [x] 36 Ride Metadata, Odometer & Event Tags
- [x] 37 Rejected Reason Presentation
- [x] 38 Edit/Delete Ride Tap Targets
- [x] 39 Ride Empty State
- [x] 40 Ride Error State
- [ ] 41 Profile Loading Skeleton Pass
- [ ] 42 Logged-Out & Verification States
- [ ] 43 Logout Action Placement
- [x] 44 Keyboard Focus Audit
- [x] 45 Mobile Touch Target Audit
- [ ] 46 Reduced Motion Audit
- [ ] 47 Small Phone Stress Test
- [ ] 48 Tablet/Desktop Responsive Pass
- [ ] 49 Visual Regression & Consistency Audit
- [ ] 50 Final Profile UAT & Polish

## Recovery checkpoint
Tasks 35-40 and 44-45 form the validated eight-task post-integration batch. Final cumulative head 9455635bd7bc31bfe43c7431db62c65d78ada6f2 passed UI Quality run 35943655558. Lane is READY_FOR_INTEGRATION; do not start Tasks 41-43 or 46+ until Integration Guard merges/resynchronizes this batch.

## Run log
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`

2026-09-23 15:07 WIB | sprint 04-11 | DONE / READY_FOR_INTEGRATION | 28ae7a4f4d635bf9a53e2604803df1551b9c66d1 | Full cumulative UI Quality GREEN via checkpoint a870012eb651d9f05efbb9a446bdc41c8ae234dd / run 35832999808 | Tasks 04-11 validated.
2026-09-23 17:15 WIB | sprint 04-11 | INTEGRATED | 1a3fe7235a539bb0f7bc46918bf72b0783a28c00 | main integration complete | Branch resynchronized.
2026-09-23 18:22 WIB | tasks 12-15 | DONE | 777441716733f1113ed13036712b52db4bd787ad | UI Quality run 35849610000 GREEN | Reconciled partial sprint.
2026-09-23 19:35 WIB | tasks 16-19 | DONE | 7b1222b0af20495f50217a746f976df42e9198f7 | UI Quality run 35855476365 GREEN | Reconciled prior cumulative tree.
2026-09-23 21:19 WIB | tasks 20-26 | DONE / READY_FOR_INTEGRATION | 98cb4e5fb2d8fd5b1a0c60a49a4fea6958691b06 | UI Quality run 35868143352 GREEN | Reconciled cumulative profile batch.
2026-09-24 04:33 WIB | lane recovery | ACTIVE | 8e1d59e3534b765ee33d289dfde03c7a58f37712 | main synchronized | Prior Profile batch already integrated; branch resynchronized.
2026-09-24 04:36-04:43 WIB | tasks 27-34 | DONE / READY_FOR_INTEGRATION | 016e3669dfd87573c981db199f55746ad3d960f2 | UI Quality run 35923580813 GREEN | Eight-task cumulative batch validated.
2026-09-24 07:33 WIB | lane recovery | ACTIVE | e7e62a538b824a6ca33512103ba0c60ea5e39833 | main synchronized | Prior Profile batch already integrated; branch fast-forwarded before product work.
2026-09-24 07:34 WIB | 35 Long Ride Title Handling | IMPLEMENTED / QA_PENDING | 67d3cdeaf1238176de2b5de5c8044e7e6d7a1917 | cumulative QA pending | [skip ci]
2026-09-24 07:35 WIB | 36 Ride Metadata, Odometer & Event Tags | IMPLEMENTED / QA_PENDING | a760a4265b505bbf5bf8704cb1937cbb752a8307 | cumulative QA pending | [skip ci]
2026-09-24 07:36 WIB | 37 Rejected Reason Presentation | IMPLEMENTED / QA_PENDING | c0e4f2182710f80450d38ad9debaf9e3d93fbc10 | cumulative QA pending | [skip ci]
2026-09-24 07:37 WIB | 38 Edit/Delete Ride Tap Targets | IMPLEMENTED / QA_PENDING | 7953f3f7a92a1b2c9bb810805d2b4ed40267bf05 | cumulative QA pending | [skip ci]
2026-09-24 07:38 WIB | 39 Ride Empty State | IMPLEMENTED / QA_PENDING | f4f1ff6d75318b6f2bd21957a0071432cd770276 | cumulative QA pending | [skip ci]
2026-09-24 07:39 WIB | 40 Ride Error State | IMPLEMENTED / QA_PENDING | 2325a434ca927bba28a6b6fc1ec54abbfbde16ba | UI Quality not visible on single final check | final cumulative product head
2026-09-24 07:45 WIB | tasks 35-40 | DONE / ACTIVE | 2325a434ca927bba28a6b6fc1ec54abbfbde16ba | UI Quality run 35939151018 GREEN | Reconciled partial batch; next task: 41 Profile Loading Skeleton Pass.
2026-09-24 08:35 WIB | 44 Keyboard Focus Audit | IMPLEMENTED / QA_PENDING | 6ea22e1f9a1273994ffd14f3cf5463ead1e8e4a6 | cumulative QA pending | [skip ci]; independent safe CSS task while structural runner unavailable.
2026-09-24 08:36 WIB | 45 Mobile Touch Target Audit | IMPLEMENTED / QA_PENDING | 9455635bd7bc31bfe43c7431db62c65d78ada6f2 | UI Quality not visible on single final check | final cumulative product head; current batch now 8 implemented tasks.
2026-09-24 09:38 WIB | tasks 35-40,44-45 | DONE / READY_FOR_INTEGRATION | 9455635bd7bc31bfe43c7431db62c65d78ada6f2 | UI Quality run 35943655558 GREEN | Eight-task cumulative batch validated; product work stopped for Integration Guard.
