# Revolt Riders production database

Project ref: `uloqjgwgupuaatdixvsa` (Singapore).

The production schema was created on 15 September 2026. It includes member account mapping, account approval requests, events, hashed invitation tokens, RSVP, check-in codes, attendance, ride logs, announcements, app settings, and audit logs.

All exposed tables have Row Level Security enabled. Public invitation and RSVP operations are limited to token-validated RPC functions. RSVP and attendance tables are included in the `supabase_realtime` publication.

Google Sheets remains canonical for member, riding/KM, and finance datasets. Supabase remains canonical for authentication and transactional application data.

## Google Sheets production setup

1. Create a Google Cloud service account and enable the Google Sheets API.
2. Share the Member/Riding and Finance spreadsheets to the service-account email as **Viewer**.
3. Add the `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, spreadsheet ID, and range variables from `.env.example` to Vercel. Keep every variable server-only.
4. Use header rows in every configured range. The application refreshes the required dataset every 15 seconds and accepts at most 1,000 rows per response.

`/api/sheets/members` and `/api/sheets/riding` require an active member account. `/api/sheets/finance` additionally requires Treasurer, Admin, or Superadmin.
