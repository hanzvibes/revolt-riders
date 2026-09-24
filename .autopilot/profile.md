# Profile Autopilot

Surface: `/profil`
Branch: `feat/autopilot-profile`
Status: MAINTENANCE
Batch size: 8
Sprint target: 8 safe tasks per hourly run
Deploy: Integration Guard only
Last Full QA checkpoint: UI Quality GREEN on main merge commit d004e9f3410a451daeb7ef8c68bf34c9510bf250 / run 36014107067

## Rules
- Frontend/UI/UX only and follow `.autopilot/RULES.md` on main.
- Existing profile reads/writes must keep the same behavior.
- Do not change Supabase queries, tables, schema, migrations, RLS, auth, permissions, secrets, or production data.
- Do not use `[deploy]` in builder commits.
- One product task per commit.
- After Task 50, enter MAINTENANCE mode after Integration Guard merges, confirms main QA GREEN, and resynchronizes this branch. Only evidence-based fixes afterward.

## File ownership
Primary: `app/profil/**`
Allowed with strict selector scope: existing CSS rules targeting only `.profile-*` or `.member-passport-*`.
Do not edit Dashboard-owned files, `app/bottom-navigation.css`, `components/app-shell.tsx`, global tokens/design primitives, package/lock/workflow files, or backend/Supabase/DB files.

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
- [x] 41 Profile Loading Skeleton Pass
- [x] 42 Logged-Out & Verification States
- [x] 43 Logout Action Placement
- [x] 44 Keyboard Focus Audit
- [x] 45 Mobile Touch Target Audit
- [x] 46 Reduced Motion Audit
- [x] 47 Small Phone Stress Test
- [x] 48 Tablet/Desktop Responsive Pass
- [x] 49 Visual Regression & Consistency Audit
- [x] 50 Final Profile UAT & Polish

## Recovery checkpoint
All 50 Profile tasks are complete and integrated. Final cumulative product head `ff2f311ca529feaf2cf0ea19aab18576319109fa` passed UI Quality run `36008826890`; final Profile sprint was merged to main at `d004e9f3410a451daeb7ef8c68bf34c9510bf250`, and main UI Quality run `36014107067` completed GREEN. Lane is MAINTENANCE; no speculative polish.

## Run log
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`

2026-09-24 10:07 WIB | profile batch 35-40,44-45 | INTEGRATED | d443be639f034ebefe5bb12c38b413b73ab7187a | main UI Quality run 35949202468 GREEN | Branch resynchronized; final sprint opened.
2026-09-24 10:37 WIB | tasks 46-48 | IMPLEMENTED | bf2cd1e16cafa8eefc18ad83e475d08546b6685e | UI Quality run 35952205016 GREEN | Responsive final-sprint work validated.
2026-09-24 20:54 WIB | final tasks 41-43,49-50 | QA_PENDING | ff2f311ca529feaf2cf0ea19aab18576319109fa | UI Quality run 36008826890 | Final five Profile tasks implemented; Task 50 sole cumulative CI trigger.
2026-09-24 21:35 WIB | final tasks 41-43,49-50 | DONE / READY_FOR_INTEGRATION | ff2f311ca529feaf2cf0ea19aab18576319109fa | UI Quality run 36008826890 GREEN | Exact final cumulative head validated; Profile queue is 50/50 complete.
2026-09-24 21:53 WIB | final Profile integration | DONE / MAINTENANCE | d004e9f3410a451daeb7ef8c68bf34c9510bf250 | main UI Quality run 36014107067 GREEN | Final Profile sprint integrated; branch synchronization owned by Integration Guard; final release gate opened.
