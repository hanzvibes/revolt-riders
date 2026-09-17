-- ==============================================================================
-- REVOLT RIDERS: FIX RIDING LEADERBOARD RPC
-- Memastikan Leaderboard membaca Single Source of Truth dari member_profiles.total_km
-- tanpa menduplikasi penjumlahan dengan ride_logs (mencegah double-counting)
-- serta membulatkan angka KM ke bilangan bulat terdekat.
-- ==============================================================================

create or replace function public.get_riding_leaderboard()
returns table(member_external_id text, full_name text, total_km numeric)
language plpgsql
security definer
set search_path = ''
as $$
begin
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
end; $$;

revoke all on function public.get_riding_leaderboard() from public;
grant execute on function public.get_riding_leaderboard() to anon, authenticated;
