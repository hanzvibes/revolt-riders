-- REVOLT RIDERS: Phase 1 security hardening
-- Generated from production migration 20260920064108.

create or replace function public.get_public_join_request(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rec record;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return null;
  end if;

  select
    jr.id,
    jr.full_name,
    jr.city,
    jr.instagram,
    jr.whatsapp,
    jr.status,
    jr.accepted_at,
    jr.confirmed_at,
    jr.activated_at,
    jr.assigned_member_id
  into v_rec
  from public.join_requests jr
  where jr.confirmation_token = trim(p_token)
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_rec.id,
    'full_name', v_rec.full_name,
    'city', v_rec.city,
    'instagram', v_rec.instagram,
    'whatsapp', v_rec.whatsapp,
    'status', v_rec.status,
    'accepted_at', v_rec.accepted_at,
    'confirmed_at', v_rec.confirmed_at,
    'activated_at', v_rec.activated_at,
    'assigned_member_id', v_rec.assigned_member_id
  );
end;
$$;

revoke all on function public.get_public_join_request(text) from public;
grant execute on function public.get_public_join_request(text) to anon, authenticated;

drop policy if exists "Members and admins can insert ride logs" on public.ride_logs;
drop policy if exists "Members and admins can update ride logs" on public.ride_logs;
drop policy if exists "Members and admins can delete ride logs" on public.ride_logs;

revoke execute on function public.accept_join_request(uuid) from public, anon;
revoke execute on function public.activate_join_request(uuid, text) from public, anon;
revoke execute on function public.check_in_with_code(text) from public, anon;
revoke execute on function public.delete_event(uuid) from public, anon;
revoke execute on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz) from public, anon;
revoke execute on function public.reject_join_request(uuid, text) from public, anon;
revoke execute on function public.reject_member_account_request(uuid, text) from public, anon;
revoke execute on function public.get_riding_leaderboard() from public, anon;

grant execute on function public.check_in_with_code(text) to authenticated;
grant execute on function public.delete_event(uuid) to authenticated;
grant execute on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz) to authenticated;
grant execute on function public.reject_member_account_request(uuid, text) to authenticated;
grant execute on function public.get_riding_leaderboard() to authenticated;

revoke execute on function public.sync_member_total_km() from public, anon, authenticated;
