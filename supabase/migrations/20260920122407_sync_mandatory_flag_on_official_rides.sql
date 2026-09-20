create or replace function public.save_event_activity(
  p_event_id uuid,
  p_counts_as_mandatory boolean default false,
  p_official_distance_km numeric default null,
  p_official_support text default null,
  p_activity_summary text default null,
  p_member_external_ids text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_role public.app_role;
  v_status public.account_status;
  v_event record;
  v_ids text[];
  v_missing text[];
  v_removed integer := 0;
  v_participant_count integer := 0;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  select ma.role, ma.status
  into v_role, v_status
  from public.member_accounts ma
  where ma.user_id = v_user_id;

  if v_status <> 'active'::public.account_status
     or v_role not in ('admin'::public.app_role, 'superadmin'::public.app_role) then
    raise exception 'Akses Admin atau Superadmin diperlukan.';
  end if;

  select e.id, e.title, e.status, e.start_at
  into v_event
  from public.events e
  where e.id = p_event_id
  for update;

  if v_event is null then
    raise exception 'Agenda tidak ditemukan.';
  end if;

  if p_official_distance_km is not null and p_official_distance_km < 0 then
    raise exception 'Jarak resmi tidak boleh negatif.';
  end if;

  select coalesce(array_agg(distinct trim(x)) filter (where trim(x) <> ''), '{}'::text[])
  into v_ids
  from unnest(coalesce(p_member_external_ids, '{}'::text[])) as x;

  select coalesce(array_agg(v.member_external_id), '{}'::text[])
  into v_missing
  from unnest(v_ids) as v(member_external_id)
  left join public.member_profiles mp
    on mp.member_external_id = v.member_external_id
  where mp.member_external_id is null;

  if cardinality(v_missing) > 0 then
    raise exception 'Member tidak terdaftar: %', array_to_string(v_missing, ', ');
  end if;

  delete from public.ride_logs rl
  where rl.event_id = p_event_id
    and rl.source_type = 'official_agenda'
    and not (rl.member_external_id = any(v_ids));
  get diagnostics v_removed = row_count;

  delete from public.event_participants ep
  where ep.event_id = p_event_id
    and not (ep.member_external_id = any(v_ids));

  insert into public.event_participants (event_id, member_external_id, added_by)
  select p_event_id, member_external_id, v_user_id
  from unnest(v_ids) as member_external_id
  on conflict (event_id, member_external_id) do nothing;

  update public.events
  set
    counts_as_mandatory = coalesce(p_counts_as_mandatory, false),
    official_distance_km = p_official_distance_km,
    official_support = nullif(trim(coalesce(p_official_support, '')), ''),
    activity_summary = nullif(trim(coalesce(p_activity_summary, '')), ''),
    updated_at = now()
  where id = p_event_id;

  update public.ride_logs
  set counts_as_mandatory = coalesce(p_counts_as_mandatory, false)
  where event_id = p_event_id
    and source_type = 'official_agenda'
    and counts_as_mandatory is distinct from coalesce(p_counts_as_mandatory, false);

  select count(*)
  into v_participant_count
  from public.event_participants ep
  where ep.event_id = p_event_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'event.activity.update',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'participants', v_participant_count,
      'official_distance_km', p_official_distance_km,
      'counts_as_mandatory', coalesce(p_counts_as_mandatory, false),
      'official_support', nullif(trim(coalesce(p_official_support, '')), ''),
      'removed_official_rides', v_removed
    )
  );

  return jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'participant_count', v_participant_count,
    'removed_official_rides', v_removed
  );
end;
$function$;

revoke all on function public.save_event_activity(uuid, boolean, numeric, text, text, text[]) from public;
revoke all on function public.save_event_activity(uuid, boolean, numeric, text, text, text[]) from anon;
grant execute on function public.save_event_activity(uuid, boolean, numeric, text, text, text[]) to authenticated;
