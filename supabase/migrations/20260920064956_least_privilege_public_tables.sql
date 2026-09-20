-- REVOLT RIDERS: Least-privilege public table access.
-- Public workflows use scoped RPCs; internal member data requires authentication.

drop policy if exists "Public can view join request by token" on public.join_requests;
drop policy if exists "Public can submit join request" on public.join_requests;
revoke all privileges on table public.join_requests from anon;

drop policy if exists "Public can view member profiles" on public.member_profiles;
revoke all privileges on table public.member_profiles from anon;

drop policy if exists "Public can view member details" on public.member_details;
revoke all privileges on table public.member_details from anon;

drop policy if exists "Public can view approved ride logs" on public.ride_logs;
drop policy if exists "ride_logs_authenticated_approved_read" on public.ride_logs;
create policy "ride_logs_authenticated_approved_read"
on public.ride_logs
for select
to authenticated
using (status = 'approved'::public.ride_status);
revoke all privileges on table public.ride_logs from anon;

revoke all privileges on table public.club_gallery from anon;
grant select on table public.club_gallery to anon;

drop policy if exists "Public can view published events" on public.events;
