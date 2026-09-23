# Profile Autopilot

Surface: `/profil`
Branch: `feat/autopilot-profile`
Status: ACTIVE
Batch size: 10
Deploy: Integration Guard only

## Rules
- Frontend/UI/UX only. Existing profile reads/writes must keep the same behavior.
- Do not change Supabase queries, tables, schema, migrations, RLS, auth, permissions, secrets, or production data.
- Do not use `[deploy]` in builder commits.
- One task at a time with QA before DONE.
- If a task unexpectedly needs backend/data work, mark BLOCKED and continue.
- Safe frontend regression fixes are allowed in REPAIR mode.
- At each 10-task boundary, run broad regression, mark READY_FOR_INTEGRATION, and stop until Integration Guard releases the batch.
- After Task 50, enter MAINTENANCE mode. Only evidence-based fixes, no random redesign/refactor.

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
- [ ] 01 Profile Visual Baseline Audit
- [ ] 02 Cover Height & Composition
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

## Run log
Append concise entries here:
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`
