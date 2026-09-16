-- Event lifecycle fields keep cancellations visible to staff and auditable.
alter table public.events
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id),
  add column if not exists cancellation_reason text;

alter table public.events
  drop constraint if exists events_cancellation_reason_check;
alter table public.events
  add constraint events_cancellation_reason_check
  check (cancellation_reason is null or char_length(cancellation_reason) between 3 and 500);

-- Distance is database-derived and a linked ride must reference a riding agenda.
create or replace function private.validate_ride_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.odometer_end <= new.odometer_start then
    raise exception 'Odometer akhir harus lebih besar dari odometer awal';
  end if;

  if new.event_id is not null and not exists (
    select 1 from public.events e
    where e.id = new.event_id
      and e.type in ('riding'::public.event_type, 'touring'::public.event_type)
      and e.status in ('published'::public.event_status, 'completed'::public.event_status)
  ) then
    raise exception 'Agenda riding tidak valid atau tidak aktif';
  end if;

  new.distance_km := new.odometer_end - new.odometer_start;
  return new;
end;
$$;

drop trigger if exists validate_ride_log on public.ride_logs;
create trigger validate_ride_log
before insert or update of event_id, odometer_start, odometer_end on public.ride_logs
for each row execute function private.validate_ride_log();

-- Push subscriptions are private to their owner. Only the authenticated user can manage theirs.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  event_reminders boolean not null default true,
  announcement_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists push_subscriptions_owner_all on public.push_subscriptions;
create policy push_subscriptions_owner_all on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists notification_preferences_owner_all on public.notification_preferences;
create policy notification_preferences_owner_all on public.notification_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
