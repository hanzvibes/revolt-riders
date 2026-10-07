# Revolt Riders

Official web app and PWA for **Revolt Riders Situbondo**. The application manages member access, riding activity, agenda and invitations, check-in, club cash, leaderboard, community feed, Voyager activity, and admin operations.

Production: **https://www.revoltriders.my.id**

## Stack

- **Next.js 16** + React 19 + TypeScript
- **Supabase** for Auth, PostgreSQL, RLS, RPC, Realtime, Storage, and Edge Functions
- **Vercel** for production hosting and analytics
- **Google Sheets API** for optional read-only member, riding, and finance synchronization
- **PWA** service worker + web manifest for installable/mobile use
- **pnpm 11.25.0** on Node.js **>= 22.13.0**

The production application does **not** use Cloudflare Workers, D1, Drizzle, Vite, Vinext, or Wrangler.

## Main Modules

- Dashboard / community feed
- Member directory and digital member profile
- Riding log, approval, and verified KM
- Agenda, invitations, RSVP, and attendance
- QR/manual check-in
- Kas Revolt
- Leaderboard
- Voyager activity and photo verification
- Garage
- Bulletins and notifications
- Admin workspaces for members, events, attendance, join requests, and insights

## Local Setup

### Requirements

- Node.js >= 22.13.0
- pnpm 11.25.0

### Install

```bash
pnpm install --frozen-lockfile
```

Create a local `.env.local` with the environment variables required for the surfaces you are testing. Never commit environment files or credentials.

### Run development server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Environment Variables

### Supabase

Required by the web application:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The browser key is intentionally publishable. Never expose a Supabase `service_role` or secret key to client code.

The password-reset Edge Function uses Supabase-managed server secrets:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` must exist only in the Supabase server/Edge Function environment.

### Google Sheets

Only needed when the Google Sheets synchronization endpoints are enabled:

```text
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

GOOGLE_MEMBERS_SPREADSHEET_ID=
GOOGLE_MEMBERS_RANGE=

GOOGLE_RIDING_SPREADSHEET_ID=
GOOGLE_RIDING_RANGE=

GOOGLE_FINANCE_SPREADSHEET_ID=
GOOGLE_FINANCE_RANGE=
```

The service account uses read-only spreadsheet scope.

### Site URL

Vercel config sets:

```text
NEXT_PUBLIC_SITE_URL=https://www.revoltriders.my.id
```

## Commands

```bash
# Development
pnpm dev

# Repository tests
pnpm test

# CSS/UI guardrails
pnpm audit:ui

# TypeScript check
pnpm exec tsc --noEmit

# Lint
pnpm lint

# Production build
pnpm build

# Run the production build locally
pnpm start
```

## Verification

The GitHub Actions **UI Quality** workflow runs on `main`, `fix/**`, and `feat/**` changes and verifies:

1. frozen dependency install
2. repository/contract tests
3. UI/CSS guardrails
4. TypeScript
5. ESLint
6. production Next.js build
7. production-server smoke test

A successful build is not treated as proof that every authenticated interaction works. Browser/manual verification is still required for UI changes that depend on real sessions or production data.

## Deployment

Production is hosted on Vercel.

`vercel.json` intentionally deploys only commits whose message contains:

```text
[deploy]
```

Use one grouped deploy commit after a batch has passed verification instead of pushing deploy-triggering micro-commits.

## Supabase

Database history lives in:

```text
supabase/migrations/
```

Important rules:

- keep RLS enabled on exposed user-data tables
- prefer scoped RPCs for sensitive mutations
- never use user-editable metadata as authorization
- review `SECURITY DEFINER` functions carefully
- keep service-role credentials server-only
- verify migration changes against the live Supabase project before declaring them production-safe

The repository also contains:

```text
supabase/functions/admin-reset-member-password/
```

for the authenticated admin password-reset flow.

## Project Structure

```text
app/                 Next.js App Router pages, route handlers, and CSS
components/          shared UI and feature components
context/             authenticated client data/cache context
hooks/               shared React hooks
lib/                 domain helpers and server/client integrations
public/              PWA assets, icons, manifest, service worker
scripts/             repository verification utilities
supabase/migrations/ database schema and security history
supabase/functions/  Supabase Edge Functions
tests/               repository, contract, behavior, and security tests
```

Several larger product surfaces are already split into model/data/action/view modules. New refactors should follow existing modular areas rather than adding another global abstraction layer.

## CSS Ownership

Shared design tokens live in:

```text
app/tokens.css
```

The large stylesheet entrypoints are now thin ownership routers:

```text
app/system-ui.css        -> app/styles/system/
app/social-feed.css      -> app/styles/social/
app/native-admin.css     -> app/styles/admin/
```

`app/globals.css` is limited to framework/theme concerns. Older global surfaces were moved without changing cascade order into explicit owners under `app/styles/legacy/`, `app/styles/shared/`, and `app/styles/invitation.css`.

The floating mobile navigation is owned by:

```text
app/bottom-navigation.css
```

Do not add another late `final-polish` stylesheet to override existing rules. Extend the existing feature owner and remove superseded rules in the same change.

## Privacy

This repository is public.

Do **not** commit real member source datasets, exports, addresses, birth dates, private contact data, or production CSV files.

Protected paths include:

```text
DataMember.md
members.csv
public/members_import.csv
lib/data/member-touring-data.ts
private-data/
```

Use anonymized/fake fixtures for tests and examples.

> Note: removing a sensitive file from the current tree does not remove it from older Git history. Historical sensitive-data cleanup must be handled as a separate repository-history operation.

## Working Rules

- Keep changes small and YAGNI.
- Preserve existing business behavior during structural refactors.
- Add regression coverage for bug fixes and architecture boundaries.
- Run tests, TypeScript, lint, build, and smoke checks before a deploy commit.
- Prefer one logical `[deploy]` commit per verified batch.
