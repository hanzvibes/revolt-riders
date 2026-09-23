# Dashboard Autopilot

Surface: Dashboard / social home
Branch: `feat/autopilot-dashboard`
Status: ACTIVE
Batch size: 10
Sprint target: 8 safe tasks per hourly run
Deploy: Integration Guard only
Last Full QA checkpoint: none

## Rules
- Work only on frontend/UI/UX and follow `.autopilot/RULES.md` on main.
- Preserve existing features and data flow.
- Never modify Supabase schema, migrations, RLS, auth, permissions, secrets, DB structure, or production data.
- Do not use `[deploy]` in builder commits.
- One product task per commit.
- Low-risk isolated UI work may use Quick QA; Full QA is required by the global risk-based QA rules.
- After two failed safe repair attempts on the same task, mark `NEEDS_REVIEW` and continue with an independent task.
- If a task requires sensitive/backend work, mark `BLOCKED_BACKEND`.
- If it needs another lane/global primitive, mark `WAITING_SHARED_COMPONENT`.
- At each 10-task boundary, run Full QA + broad regression, mark READY_FOR_INTEGRATION, and stop until Integration Guard merges/releases it.
- After all tasks are DONE, enter MAINTENANCE mode: no speculative refactors.

## File ownership
Primary:
- `app/dashboard/**`
- `app/social-feed.css`
- `components/community-feed.tsx`
- `components/desktop-feed-rail.tsx`
- `app/bottom-navigation.css`

Avoid unless Integration Guard handles it:
- `components/app-shell.tsx`
- `app/globals.css`
- `app/tokens.css`
- `package.json`, lockfiles, workflows
- all `supabase/**`, `db/**`, `drizzle/**`

## Queue
- [x] 21 Dashboard Header Refinement
- [ ] 22 Sticky Header Polish
- [ ] 23 Feed Container Spacing
- [ ] 24 Post Card Vertical Rhythm
- [ ] 25 Post Card Border Polish
- [ ] 26 Author Row Alignment
- [ ] 27 Avatar Size Consistency
- [ ] 28 Author Typography
- [ ] 29 Timestamp Styling
- [ ] 30 Post Menu UI Polish
- [ ] 31 Caption Readability
- [ ] 32 Long Text Visual Handling
- [ ] 33 Mention Visual Style
- [ ] 34 Hashtag Visual Style
- [ ] 35 Action Bar Alignment
- [ ] 36 Action Button Touch Area
- [ ] 37 Action Icon Consistency
- [ ] 38 Engagement Counter Polish
- [ ] 39 Hover State Desktop
- [ ] 40 Press State Mobile
- [ ] 41 Media Grid Polish
- [ ] 42 Media Border Radius
- [ ] 43 Media Aspect Ratio Audit
- [ ] 44 Image Loading Placeholder Polish
- [ ] 45 Fullscreen Viewer Layout
- [ ] 46 Viewer Navigation Controls
- [ ] 47 Viewer Mobile Safe Area
- [ ] 48 Viewer Close Interaction
- [ ] 49 Agenda Attachment Polish
- [ ] 50 Voyager Attachment Polish
- [ ] 51 Link Preview Polish
- [ ] 52 Pinned Post Polish
- [ ] 53 Comment Preview Styling
- [ ] 54 Comment Row Spacing
- [ ] 55 Comment Input UI
- [ ] 56 Composer Entry UI
- [ ] 57 Composer Layout Polish
- [ ] 58 Composer Mobile Keyboard Safety
- [ ] 59 Loading Button State
- [ ] 60 Disabled Button State
- [ ] 61 Feed Skeleton Final Pass
- [ ] 62 Empty State Polish
- [ ] 63 Error State Polish
- [ ] 64 Dashboard Quick Action Styling
- [ ] 65 Desktop Feed Width Audit
- [ ] 66 Tablet Layout Audit
- [ ] 67 Small Phone Audit
- [ ] 68 Floating Bottom Nav Audit
- [ ] 69 Accessibility & Motion Audit
- [ ] 70 Final Dashboard Regression Pass

## Recovery checkpoint
Before starting new work, reconcile the latest task commit and tracker state. Intermediate same-lane GitHub Actions may remain in progress while the same sprint continues; only a separate active sprint lock should block a new invocation.

## Run log
Append concise entries here:
`YYYY-MM-DD HH:mm WIB | task | status | commit | QA | note`

2026-09-23 12:08 WIB | 21 Dashboard Header Refinement | QA_PENDING | f02d7b717a85b0205ebca07c2c2cf9c723a47563 | Quick QA pending branch CI | Added lane-scoped 44px create action polish, hover/press/focus/reduced-motion states; no behavior/data changes.
2026-09-23 12:59 WIB | 21 Dashboard Header Refinement | DONE | f02d7b717a85b0205ebca07c2c2cf9c723a47563 | Quick QA GREEN; UI Quality run 35820880555 success | Reconciled prior checkpoint after branch CI completed successfully. Next task: 22 Sticky Header Polish.
