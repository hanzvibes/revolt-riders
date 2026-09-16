create or replace function public.get_public_event_attendees(p_token text)
returns table(
  member_external_id text,
  display_name text,
  guest_count integer,
  rsvp_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  if p_token is null or length(p_token) < 32 then
    return;
  end if;

  select ei.event_id into v_event_id
  from public.event_invitations ei
  join public.events e on e.id = ei.event_id
  where ei.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and e.status = 'published'
  limit 1;

  if v_event_id is null then
    return;
  end if;

  return query
  select
    er.member_external_id,
    coalesce(nullif(md.nickname_override, ''), nullif(mp.nickname, ''), mp.full_name, er.member_external_id) as display_name,
    er.guest_count,
    er.status::text
  from public.event_rsvps er
  left join public.member_profiles mp on mp.member_external_id = er.member_external_id
  left join public.member_details md on md.member_external_id = er.member_external_id
  where er.event_id = v_event_id
    and er.status in ('attending'::public.rsvp_status, 'maybe'::public.rsvp_status)
  order by case er.status when 'attending'::public.rsvp_status then 0 else 1 end, er.responded_at asc
  limit 100;
end;
$$;

revoke all on function public.get_public_event_attendees(text) from public, anon, authenticated;
grant execute on function public.get_public_event_attendees(text) to anon, authenticated;
