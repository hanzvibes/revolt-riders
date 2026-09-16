# Revolt Riders production database

Project ref: `uloqjgwgupuaatdixvsa` (Singapore).

The production schema was created on 15 September 2026. It includes member account mapping, account approval requests, events, hashed invitation tokens, RSVP, check-in codes, attendance, ride logs, announcements, app settings, and audit logs.

All exposed tables have Row Level Security enabled. Public invitation and RSVP operations are limited to token-validated RPC functions. RSVP and attendance tables are included in the `supabase_realtime` publication.

Google Sheets remains canonical for member, riding/KM, and finance datasets. Supabase remains canonical for authentication and transactional application data.
