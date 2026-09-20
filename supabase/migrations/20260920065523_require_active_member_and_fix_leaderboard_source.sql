-- REVOLT RIDERS: Require active membership for internal reads and keep leaderboard KM single-source.

drop policy if exists "member_profiles_authenticated_read" on public.member_profiles;
create policy "member_profiles_authenticated_read"
on public.member_profiles
for select
to authenticated
using (
  exists (
    select 1 from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  )
);

drop policy if exists "member_details_authenticated_read" on public.member_details;
create policy "member_details_authenticated_read"
on public.member_details
for select
to authenticated
using (
  exists (
    select 1 from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  )
);

drop policy if exists "ride_logs_authenticated_approved_read" on public.ride_logs;
create policy "ride_logs_authenticated_approved_read"
on public.ride_logs
for select
to authenticated
using (
  status = 'approved'::public.ride_status
  and exists (
    select 1 from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  )
);

create or replace function public.get_riding_leaderboard()
returns table(member_external_id text, full_name text, total_km numeric)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  ) then
    raise exception 'Active member account required';
  end if;

  return query
  select
    mp.member_external_id,
    case
      when mp.nickname is not null and length(trim(mp.nickname)) > 0
      then mp.nickname || ' (' || mp.full_name || ')'
      else mp.full_name
    end as full_name,
    round(coalesce(mp.total_km, 0))::numeric as total_km
  from public.member_profiles mp
  order by coalesce(mp.total_km, 0) desc, mp.member_external_id asc;
end;
$$;

revoke all on function public.get_riding_leaderboard() from public, anon;
grant execute on function public.get_riding_leaderboard() to authenticated;
