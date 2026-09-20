alter type public.event_type add value if not exists 'voyager';

alter table public.events
  add column if not exists counts_as_mandatory boolean not null default false,
  add column if not exists official_distance_km numeric(10,2),
  add column if not exists official_support text,
  add column if not exists activity_summary text,
  add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_official_distance_nonnegative'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_official_distance_nonnegative
      check (official_distance_km is null or official_distance_km >= 0);
  end if;
end $$;

alter table public.ride_logs
  add column if not exists source_type text not null default 'member_submission',
  add column if not exists counts_as_mandatory boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ride_logs_source_type_check'
      and conrelid = 'public.ride_logs'::regclass
  ) then
    alter table public.ride_logs
      add constraint ride_logs_source_type_check
      check (source_type in ('member_submission', 'official_agenda'));
  end if;
end $$;

create unique index if not exists ride_logs_official_event_member_unique
  on public.ride_logs (event_id, member_external_id)
  where source_type = 'official_agenda' and event_id is not null;

create index if not exists ride_logs_mandatory_member_date_idx
  on public.ride_logs (member_external_id, created_at desc)
  where status = 'approved'::public.ride_status and counts_as_mandatory = true;

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_external_id text not null references public.member_profiles(member_external_id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, member_external_id)
);

create index if not exists event_participants_event_idx
  on public.event_participants (event_id, created_at);

create index if not exists event_participants_member_idx
  on public.event_participants (member_external_id, created_at desc);

alter table public.event_participants enable row level security;

revoke all privileges on table public.event_participants from anon;
revoke insert, update, delete on table public.event_participants from authenticated;
grant select on table public.event_participants to authenticated;

drop policy if exists event_participants_active_member_read on public.event_participants;
create policy event_participants_active_member_read
on public.event_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  )
  and (
    exists (
      select 1
      from public.events e
      where e.id = event_participants.event_id
        and e.status in ('published'::public.event_status, 'completed'::public.event_status)
    )
    or (select private.has_role(array['admin','superadmin']::public.app_role[]))
  )
);

drop policy if exists club_gallery_active_member_event_read on public.club_gallery;
create policy club_gallery_active_member_event_read
on public.club_gallery
for select
to authenticated
using (
  event_id is not null
  and exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  )
  and exists (
    select 1
    from public.events e
    where e.id = club_gallery.event_id
      and e.status in ('published'::public.event_status, 'completed'::public.event_status)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-activity',
  'club-activity',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active members can read club activity media" on storage.objects;
create policy "Active members can read club activity media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'club-activity'
  and exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  )
);

drop policy if exists "Admins can upload club activity media" on storage.objects;
create policy "Admins can upload club activity media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'club-activity'
  and (select private.has_role(array['admin','superadmin']::public.app_role[]))
);

drop policy if exists "Admins can update club activity media" on storage.objects;
create policy "Admins can update club activity media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'club-activity'
  and (select private.has_role(array['admin','superadmin']::public.app_role[]))
)
with check (
  bucket_id = 'club-activity'
  and (select private.has_role(array['admin','superadmin']::public.app_role[]))
);

drop policy if exists "Admins can delete club activity media" on storage.objects;
create policy "Admins can delete club activity media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'club-activity'
  and (select private.has_role(array['admin','superadmin']::public.app_role[]))
);

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

create or replace function public.sync_event_official_rides(
  p_event_id uuid
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
  v_synced integer := 0;
  v_deleted integer := 0;
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

  select
    e.id,
    e.title,
    e.start_at,
    e.official_distance_km,
    e.counts_as_mandatory
  into v_event
  from public.events e
  where e.id = p_event_id
  for update;

  if v_event is null then
    raise exception 'Agenda tidak ditemukan.';
  end if;

  if v_event.official_distance_km is null or v_event.official_distance_km <= 0 then
    raise exception 'Isi Official Trip Distance terlebih dahulu.';
  end if;

  delete from public.ride_logs rl
  where rl.event_id = p_event_id
    and rl.source_type = 'official_agenda'
    and not exists (
      select 1
      from public.event_participants ep
      where ep.event_id = p_event_id
        and ep.member_external_id = rl.member_external_id
    );
  get diagnostics v_deleted = row_count;

  insert into public.ride_logs (
    event_id,
    member_external_id,
    odometer_start,
    odometer_end,
    title,
    status,
    submitted_by,
    reviewed_by,
    reviewed_at,
    created_at,
    source_type,
    counts_as_mandatory
  )
  select
    p_event_id,
    ep.member_external_id,
    0,
    v_event.official_distance_km,
    v_event.title,
    'approved'::public.ride_status,
    v_user_id,
    v_user_id,
    now(),
    v_event.start_at,
    'official_agenda',
    v_event.counts_as_mandatory
  from public.event_participants ep
  where ep.event_id = p_event_id
  on conflict (event_id, member_external_id)
    where source_type = 'official_agenda' and event_id is not null
  do update set
    odometer_start = 0,
    odometer_end = excluded.odometer_end,
    title = excluded.title,
    status = 'approved'::public.ride_status,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = now(),
    created_at = excluded.created_at,
    counts_as_mandatory = excluded.counts_as_mandatory,
    updated_at = now();

  get diagnostics v_synced = row_count;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    'event.official_rides.sync',
    'event',
    p_event_id::text,
    jsonb_build_object(
      'synced_members', v_synced,
      'removed_stale_rides', v_deleted,
      'official_distance_km', v_event.official_distance_km,
      'counts_as_mandatory', v_event.counts_as_mandatory
    )
  );

  return jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'synced_members', v_synced,
    'removed_stale_rides', v_deleted,
    'official_distance_km', v_event.official_distance_km,
    'counts_as_mandatory', v_event.counts_as_mandatory
  );
end;
$function$;

revoke all on function public.sync_event_official_rides(uuid) from public;
revoke all on function public.sync_event_official_rides(uuid) from anon;
grant execute on function public.sync_event_official_rides(uuid) to authenticated;

create or replace function public.delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role public.app_role;
  v_user_id uuid;
begin
  v_user_id := (select auth.uid());

  select ma.role
  into v_role
  from public.member_accounts ma
  where ma.user_id = v_user_id
    and ma.status = 'active'::public.account_status;

  if v_role not in ('admin'::public.app_role, 'superadmin'::public.app_role) then
    raise exception 'Akses admin diperlukan untuk menghapus agenda';
  end if;

  delete from public.ride_logs
  where event_id = p_event_id
    and source_type = 'official_agenda';

  update public.ride_logs
  set event_id = null
  where event_id = p_event_id
    and source_type <> 'official_agenda';

  delete from public.club_gallery where event_id = p_event_id;
  delete from public.event_participants where event_id = p_event_id;
  delete from public.event_checkin_codes where event_id = p_event_id;
  delete from public.event_attendance where event_id = p_event_id;
  delete from public.event_rsvps where event_id = p_event_id;
  delete from public.event_invitations where event_id = p_event_id;

  delete from public.events where id = p_event_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (v_user_id, 'event.delete', 'event', p_event_id::text, '{}'::jsonb);
end;
$function$;

revoke all on function public.delete_event(uuid) from public;
revoke all on function public.delete_event(uuid) from anon;
grant execute on function public.delete_event(uuid) to authenticated;
