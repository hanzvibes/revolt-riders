# Profile Autopilot

Surface: `/profil`
Branch: `feat/autopilot-profile`
Status: READY_FOR_INTEGRATION
Batch size: 8
Sprint target: 8 safe tasks per hourly run
Deploy: Integration Guard only
Last Full QA checkpoint: UI Quality GREEN on 016e3669dfd87573c981db199f55746ad3d960f2 / run 35923580813

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

## Recovery checkpoint
Tasks 27-34 are implemented and validated on final cumulative product head `016e3669dfd87573c981db199f55746ad3d960f2`. UI Quality run `35923580813` completed GREEN. Tasks 27-34 are DONE and the lane is READY_FOR_INTEGRATION. Do not start Task 35 until Integration Guard integrates this batch and resynchronizes the branch.

## Run log
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`

2026-09-23 10:28 WIB | 01 Profile Visual Baseline Audit | DONE | 2446d62fda818a4e83093966635576924e3c9e99 | branch QA GREEN | Baseline audit.
2026-09-23 13:00 WIB | 02 Cover Height & Composition | DONE | aa55aef2f679e4511e0c05c04546e99ff3e3fa61 | Full branch UI Quality GREEN | Reconciled checkpoint.
2026-09-23 14:03 WIB | 03 Fix MEMBER NETWORK Cover Overlap | DONE | 136e27b76d9dc7c0d1729428f0597951e5bb015f | UI Quality GREEN | Reconciled completed product commit.
2026-09-23 15:07 WIB | sprint 04-11 | DONE / READY_FOR_INTEGRATION | 28ae7a4f4d635bf9a53e2604803df1551b9c66d1 | Full cumulative UI Quality GREEN via checkpoint a870012eb651d9f05efbb9a446bdc41c8ae234dd / run 35832999808 | Tasks 04-11 validated.
2026-09-23 17:15 WIB | sprint 04-11 | INTEGRATED | 1a3fe7235a539bb0f7bc46918bf72b0783a28c00 | main integration complete | Branch resynchronized.
2026-09-23 18:22 WIB | tasks 12-15 | DONE | 777441716733f1113ed13036712b52db4bd787ad | UI Quality run 35849610000 GREEN | Reconciled partial sprint.
2026-09-23 19:35 WIB | tasks 16-19 | DONE | 7b1222b0af20495f50217a746f976df42e9198f7 | UI Quality run 35855476365 GREEN | Reconciled prior cumulative tree.
2026-09-23 21:19 WIB | tasks 20-26 | DONE / READY_FOR_INTEGRATION | 98cb4e5fb2d8fd5b1a0c60a49a4fea6958691b06 | UI Quality run 35868143352 GREEN | Reconciled cumulative profile batch.
2026-09-24 04:33 WIB | lane recovery | ACTIVE | 8e1d59e3534b765ee33d289dfde03c7a58f37712 | main synchronized | Prior Profile batch already integrated; branch resynchronized.
2026-09-24 04:36 WIB | 27 Achievement Timeline Layout | DONE | 29dd50f4976ea3f41332c67fa5cb3a1088b3d42b | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:37 WIB | 28 Locked/Unlocked Achievement States | DONE | 47106d821d2796c46852a5c0c42ec7b324e1f662 | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:38 WIB | 29 Achievement Timeline Mobile Pass | DONE | b72394a1d5f7783d04b7aa2eab2f25079344cad5 | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:39 WIB | 30 Progress + Achievement Grid Balance | DONE | 2d78c1b2d6bd3312f7e8eb3c4e515ce3447f021b | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:40 WIB | 31 Riding History Header | DONE | f37d9717b8ecb1b549a4c555a7412194b3c6cf46 | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:41 WIB | 32 Catat Riwayat CTA Polish | DONE | 74bc7bdb0f05a3e0f4a26a82667385e05a35b65b | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:42 WIB | 33 Ride Row Density | DONE | 0fd4915b13a28982a3969c5ba00a536ffcab1773 | cumulative UI Quality GREEN via run 35923580813 | [skip ci]
2026-09-24 04:43 WIB | 34 Ride Icon & Status Treatment | DONE / READY_FOR_INTEGRATION | 016e3669dfd87573c981db199f55746ad3d960f2 | UI Quality run 35923580813 GREEN | final cumulative product head
