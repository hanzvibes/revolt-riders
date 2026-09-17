-- ==============================================================================
-- REVOLT RIDERS: COMPREHENSIVE PRODUCTION SYSTEM FIXES
-- 1. Fix QR Code checkin ambiguous column 'active_until'
-- 2. Prevent ID RR lock on registration & provide reject_member_account_request RPC
-- 3. Fix Total KM double counting in get_member_dashboard_stats()
-- 4. Enforce pending status for regular members in manage_ride_log (auto-approved for staff)
-- 5. Delete agenda permanently (delete_event RPC & purge cancelled events)
-- ==============================================================================

-- 1. QR Code Ambiguity Fix: Explicitly qualify all column names and alias returns
create or replace function public.create_event_checkin_code(
  p_event_id uuid,
  p_code_hash text,
  p_active_until timestamptz
)
returns table(active_until timestamptz)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role public.app_role;
begin
  select ma.role into v_role
  from public.member_accounts ma
  where ma.user_id = (select auth.uid()) and ma.status = 'active';

  if v_role not in ('road_captain', 'admin', 'superadmin') then
    raise exception 'Akses road captain atau admin diperlukan';
  end if;

  update public.event_checkin_codes
  set active_until = now()
  where event_checkin_codes.event_id = p_event_id
    and event_checkin_codes.active_until > now();

  insert into public.event_checkin_codes(event_id, code_hash, active_from, active_until, created_by)
  values(p_event_id, p_code_hash, now() - interval '1 hour', p_active_until, (select auth.uid()));

  return query select p_active_until as active_until;
end; $$;

grant execute on function public.create_event_checkin_code(uuid, text, timestamptz) to authenticated;

-- 2. Pendaftaran Akun: Remove unique constraint locking member_external_id on rejected/failed requests
do $$
begin
  alter table public.member_account_requests drop constraint if exists member_account_requests_member_external_id_key;
exception when others then null;
end $$;

drop index if exists public.member_account_requests_member_external_id_key;
create index if not exists idx_member_account_requests_member_ext on public.member_account_requests(member_external_id);

-- RPC for admin to reject / delete unapproved request, freeing up the ID RR immediately
create or replace function public.reject_member_account_request(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role public.app_role;
begin
  select ma.role into v_role from public.member_accounts ma
  where ma.user_id = (select auth.uid()) and ma.status = 'active';

  if v_role not in ('admin', 'superadmin') then
    raise exception 'Akses admin diperlukan untuk menolak pendaftaran';
  end if;

  delete from public.member_account_requests
  where id = p_request_id;
end; $$;

grant execute on function public.reject_member_account_request(uuid, text) to authenticated;

-- 3. Total Kilometer: Audit and eliminate double-counting
-- The dashboard stats must read single source of truth from member_profiles.total_km
create or replace function public.get_member_dashboard_stats()
returns table(total_members bigint, total_km numeric, cash_balance numeric, last_updated timestamp with time zone)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'
  ) then
    raise exception 'Active member account required';
  end if;

  return query
  with all_cash as (
    select transaction_type, amount, created_at from public.cash_transactions
    union all
    select transaction_type, amount, created_at
    from public.club_cash_transactions
    where voided_at is null
  )
  select
    (select count(*) from public.member_profiles)::bigint,
    (select coalesce(sum(member_profile.total_km), 0) from public.member_profiles as member_profile)::numeric,
    (select coalesce(sum(case when cash.transaction_type = 'income'::public.cash_transaction_type then cash.amount when cash.transaction_type = 'expense'::public.cash_transaction_type then -cash.amount else 0 end), 0) from all_cash as cash)::numeric,
    greatest(
      coalesce((select max(member_profile.updated_at) from public.member_profiles as member_profile), '-infinity'::timestamptz),
      coalesce((select max(ride.updated_at) from public.ride_logs as ride), '-infinity'::timestamptz),
      coalesce((select max(cash.created_at) from all_cash as cash), '-infinity'::timestamptz)
    );
end; $$;

grant execute on function public.get_member_dashboard_stats() to authenticated;

-- 4. Validasi Riding & manage_ride_log: Regular member inserts must be 'pending'
-- Only staff (admin, superadmin, road_captain) can directly create 'approved' logs
create or replace function public.manage_ride_log(
  p_action text,
  p_ride_id uuid default null,
  p_member_external_id text default null,
  p_title text default null,
  p_km numeric default 0,
  p_date timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid;
  caller_account record;
  target_record record;
  target_member text;
  new_ride_id uuid;
  calculated_total numeric;
  is_staff boolean;
  initial_status public.ride_status;
begin
  caller_user_id := auth.uid();
  if caller_user_id is null then
    raise exception 'Sesi login tidak ditemukan. Harap masuk terlebih dahulu.';
  end if;

  select role, status, member_external_id
  into caller_account
  from public.member_accounts
  where user_id = caller_user_id;

  if caller_account is null or caller_account.status != 'active' then
    raise exception 'Akun Anda belum aktif atau belum terverifikasi.';
  end if;

  is_staff := caller_account.role in ('admin', 'superadmin', 'road_captain');

  if p_action = 'update' or p_action = 'delete' then
    if p_ride_id is null then
      raise exception 'ID kegiatan harus disertakan.';
    end if;

    select * into target_record
    from public.ride_logs
    where id = p_ride_id;

    if target_record is null then
      raise exception 'Data kegiatan tidak ditemukan.';
    end if;

    target_member := target_record.member_external_id;

    if not is_staff and caller_account.member_external_id != target_member then
      raise exception 'Anda tidak memiliki izin untuk mengubah riwayat member lain.';
    end if;

    if p_action = 'delete' then
      delete from public.ride_logs where id = p_ride_id;
    elsif p_action = 'update' then
      if p_km < 0 then
        raise exception 'Jarak kilometer tidak boleh kurang dari 0.';
      end if;

      update public.ride_logs
      set
        title = coalesce(trim(p_title), title),
        odometer_start = 0,
        odometer_end = p_km,
        created_at = coalesce(p_date, created_at),
        reviewed_at = case when is_staff then now() else reviewed_at end,
        reviewed_by = case when is_staff then caller_user_id else reviewed_by end
      where id = p_ride_id;
    end if;

  elsif p_action = 'create' then
    target_member := p_member_external_id;
    if target_member is null or trim(target_member) = '' then
      target_member := caller_account.member_external_id;
    end if;

    if target_member is null then
      raise exception 'Member external ID harus ditentukan.';
    end if;

    if not is_staff and caller_account.member_external_id != target_member then
      raise exception 'Anda tidak memiliki izin untuk menambahkan riwayat untuk member lain.';
    end if;

    if p_km < 0 then
      raise exception 'Jarak kilometer tidak boleh kurang dari 0.';
    end if;

    -- Staff entries are immediately approved; Regular member entries are pending
    if is_staff then
      initial_status := 'approved'::public.ride_status;
    else
      initial_status := 'pending'::public.ride_status;
    end if;

    insert into public.ride_logs (
      member_external_id,
      title,
      odometer_start,
      odometer_end,
      status,
      created_at,
      reviewed_at,
      reviewed_by,
      submitted_by
    )
    values (
      target_member,
      coalesce(trim(p_title), 'Touring Mandiri'),
      0,
      p_km,
      initial_status,
      coalesce(p_date, now()),
      case when is_staff then now() else null end,
      case when is_staff then caller_user_id else null end,
      caller_user_id
    )
    returning id into new_ride_id;

  else
    raise exception 'Aksi tidak valid: %', p_action;
  end if;

  -- Recalculate member total_km ONLY from approved logs
  select coalesce(sum(distance_km), 0)
  into calculated_total
  from public.ride_logs
  where member_external_id = target_member
    and status = 'approved'::public.ride_status;

  update public.member_profiles
  set total_km = calculated_total,
      updated_at = now()
  where member_external_id = target_member;

  return jsonb_build_object(
    'success', true,
    'action', p_action,
    'ride_id', coalesce(new_ride_id, p_ride_id),
    'member_external_id', target_member,
    'status', case when p_action = 'create' then initial_status::text else null end,
    'total_km', calculated_total
  );
end;
$$;

grant execute on function public.manage_ride_log to authenticated;

-- 5. Agenda Deletion: Permanently delete events cascading related data
create or replace function public.delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  select ma.role into v_role from public.member_accounts ma
  where ma.user_id = (select auth.uid()) and ma.status = 'active';

  if v_role not in ('admin', 'superadmin') then
    raise exception 'Akses admin diperlukan untuk menghapus agenda';
  end if;

  -- 1. Detach ride logs so ride distances are safely retained
  update public.ride_logs set event_id = null where event_id = p_event_id;

  -- 2. Delete invitations, rsvps, attendance, checkin codes
  delete from public.event_checkin_codes where event_id = p_event_id;
  delete from public.event_attendance where event_id = p_event_id;
  delete from public.event_rsvps where event_id = p_event_id;
  delete from public.event_invitations where event_id = p_event_id;

  -- 3. Delete the event permanently
  delete from public.events where id = p_event_id;
end; $$;

grant execute on function public.delete_event(uuid) to authenticated;

-- Purge any orphaned or previously cancelled events permanently
delete from public.event_checkin_codes where event_id in (select id from public.events where status = 'cancelled');
delete from public.event_attendance where event_id in (select id from public.events where status = 'cancelled');
delete from public.event_rsvps where event_id in (select id from public.events where status = 'cancelled');
delete from public.event_invitations where event_id in (select id from public.events where status = 'cancelled');
update public.ride_logs set event_id = null where event_id in (select id from public.events where status = 'cancelled');
delete from public.events where status = 'cancelled';

-- 6. Leaderboard KM: Single source of truth from member_profiles.total_km
-- Eliminates double-counting and rounds to whole KM integer
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
