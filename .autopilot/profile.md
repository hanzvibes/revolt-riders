# Profile Autopilot

Surface: `/profil`
Branch: `feat/autopilot-profile`
Status: ACTIVE
Batch size: 8
Sprint target: 8 safe tasks per hourly run
Deploy: Integration Guard only
Last Full QA checkpoint: UI Quality GREEN on 12c76e300114cb113b85bb28c4ec5e6038f1cafd

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

## Recovery checkpoint
Sprint 04-11 has been merged to main. Branch is resynchronized to current main. Next sprint starts at Task 12. Use the low-request sprint policy from .autopilot/RULES.md: intermediate product commits use [skip ci], and only the final product commit triggers remote UI Quality.

## Run log
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`

2026-09-23 10:28 WIB | 01 Profile Visual Baseline Audit | DONE | 2446d62fda818a4e83093966635576924e3c9e99 | branch QA GREEN | Baseline audit.
2026-09-23 13:00 WIB | 02 Cover Height & Composition | DONE | aa55aef2f679e4511e0c05c04546e99ff3e3fa61 | Full branch UI Quality GREEN | Reconciled checkpoint.
2026-09-23 14:03 WIB | 03 Fix MEMBER NETWORK Cover Overlap | DONE | 136e27b76d9dc7c0d1729428f0597951e5bb015f | UI Quality GREEN | Reconciled completed product commit.
2026-09-23 14:37 WIB | sprint 04-11 | STARTED | 3494eed7bdf61c5e3f0dbd29a834696269aac1a2 | start checkpoint GREEN | Reconciled tracker and branch once.
2026-09-23 14:38 WIB | 04 Avatar Scale & Position | QA_PENDING | 1fcde4c402b51a2fd923a5a62346006366435353 | cumulative QA pending | Profile-scoped avatar sizing/anchoring.
2026-09-23 14:38 WIB | 05 Edit Profile Button Hierarchy | QA_PENDING | 5dfda41f81475bd2ed19faa773180d8c93070c04 | cumulative QA pending | Compact secondary edit action.
2026-09-23 14:39 WIB | 06 Name & Verified Icon Alignment | QA_PENDING | 99e7fe07ffda1e430907f06ba941fa995ec2ae43 | cumulative QA pending | Identity lockup alignment.
2026-09-23 14:39 WIB | 07 Full Name Secondary Hierarchy | QA_PENDING | adcb9c91f546feab79b45208ee3e7d1c7ec4effe | cumulative QA pending | Secondary legal-name hierarchy.
2026-09-23 14:40 WIB | 08 Handle, Role & Active Row Polish | QA_PENDING | 7b0782832c40424e7fb8e8f69c69068e00b0f7e8 | cumulative QA pending | Compact wrapping metadata row.
2026-09-23 14:40 WIB | 09 Bio Readability | QA_PENDING | d623157409ad2ebb139f30f44f09a250df7927d1 | cumulative QA pending | Supporting-copy rhythm.
2026-09-23 14:40 WIB | 10 Member Meta Row Spacing | QA_PENDING | f245d036cb5cff3b61b51404f3e6de1aba7c7e66 | cumulative QA pending | Member fact spacing; no tree delta beyond already-staged profile CSS.
2026-09-23 14:40 WIB | 11 Profile Stats Row Polish | QA_PENDING | 28ae7a4f4d635bf9a53e2604803df1551b9c66d1 | final UI Quality run 35832947928 pending | Eight safe tasks implemented. Final cumulative QA pending; not READY yet.

2026-09-23 15:07 WIB | sprint 04-11 | DONE / READY_FOR_INTEGRATION | 28ae7a4f4d635bf9a53e2604803df1551b9c66d1 | Full cumulative UI Quality GREEN via checkpoint a870012eb651d9f05efbb9a446bdc41c8ae234dd / run 35832999808 | Checkpoint changed only tracker file, so tasks 04-11 are validated and ready for Integration Guard.

2026-09-23 17:15 WIB | sprint 04-11 | INTEGRATED | 1a3fe7235a539bb0f7bc46918bf72b0783a28c00 | main integration complete | Branch resynchronized; next task: 12 Quick Actions Layout.

2026-09-23 18:22 WIB | tasks 12-15 | DONE | 777441716733f1113ed13036712b52db4bd787ad | UI Quality run 35849610000 GREEN | Reconciled partial sprint; final cumulative remote CI passed. Next task: 16 Edit Profile Sheet Header.
