drop function if exists public.manage_ride_log(text, uuid, text, text, numeric, timestamptz);

create function public.manage_ride_log(
  p_action text,
  p_ride_id uuid default null,
  p_member_external_id text default null,
  p_title text default null,
  p_km numeric default 0,
  p_date timestamptz default now(),
  p_event_id uuid default null,
  p_odometer_start numeric default null,
  p_odometer_end numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_user_id uuid;
  caller_account record;
  target_record record;
  target_member text;
  new_ride_id uuid;
  calculated_total numeric;
  is_staff boolean;
  initial_status public.ride_status;
  effective_start numeric;
  effective_end numeric;
begin
  caller_user_id := (select auth.uid());
  if caller_user_id is null then
    raise exception 'Sesi login tidak ditemukan. Harap masuk terlebih dahulu.';
  end if;

  select role, status, member_external_id
  into caller_account
  from public.member_accounts
  where user_id = caller_user_id;

  if caller_account is null or caller_account.status <> 'active'::public.account_status then
    raise exception 'Akun Anda belum aktif atau belum terverifikasi.';
  end if;

  is_staff := caller_account.role in (
    'admin'::public.app_role,
    'superadmin'::public.app_role,
    'road_captain'::public.app_role
  );

  if p_action in ('update', 'delete') then
    if p_ride_id is null then
      raise exception 'ID kegiatan harus disertakan.';
    end if;

    select *
    into target_record
    from public.ride_logs
    where id = p_ride_id
    for update;

    if target_record is null then
      raise exception 'Data kegiatan tidak ditemukan.';
    end if;

    if target_record.source_type = 'official_agenda' then
      raise exception 'Official Agenda Distance hanya dapat diubah melalui sinkronisasi agenda.';
    end if;

    target_member := target_record.member_external_id;

    if not is_staff and caller_account.member_external_id <> target_member then
      raise exception 'Anda tidak memiliki izin untuk mengubah riwayat member lain.';
    end if;

    if not is_staff and target_record.status <> 'pending'::public.ride_status then
      raise exception 'Ride yang sudah diproses tidak dapat diubah atau dihapus oleh member.';
    end if;

    if p_action = 'delete' then
      delete from public.ride_logs
      where id = p_ride_id;
    else
      if p_km <= 0 then
        raise exception 'Jarak kilometer harus lebih besar dari 0.';
      end if;

      effective_start := coalesce(p_odometer_start, 0);
      effective_end := coalesce(p_odometer_end, effective_start + p_km);

      if effective_end <= effective_start then
        raise exception 'Odometer akhir harus lebih besar dari odometer awal.';
      end if;

      update public.ride_logs
      set
        title = coalesce(nullif(trim(p_title), ''), title),
        event_id = coalesce(p_event_id, event_id),
        odometer_start = effective_start,
        odometer_end = effective_end,
        created_at = coalesce(p_date, created_at),
        reviewed_at = case when is_staff then now() else reviewed_at end,
        reviewed_by = case when is_staff then caller_user_id else reviewed_by end
      where id = p_ride_id;
    end if;

  elsif p_action = 'create' then
    target_member := nullif(trim(p_member_external_id), '');
    if target_member is null then
      target_member := caller_account.member_external_id;
    end if;

    if target_member is null then
      raise exception 'Member external ID harus ditentukan.';
    end if;

    if not is_staff and caller_account.member_external_id <> target_member then
      raise exception 'Anda tidak memiliki izin untuk menambahkan riwayat untuk member lain.';
    end if;

    effective_start := coalesce(p_odometer_start, 0);
    effective_end := coalesce(p_odometer_end, effective_start + p_km);

    if effective_end <= effective_start then
      raise exception 'Jarak kilometer harus lebih besar dari 0.';
    end if;

    initial_status := case
      when is_staff then 'approved'::public.ride_status
      else 'pending'::public.ride_status
    end;

    insert into public.ride_logs (
      event_id,
      member_external_id,
      title,
      odometer_start,
      odometer_end,
      status,
      created_at,
      reviewed_at,
      reviewed_by,
      submitted_by,
      source_type
    )
    values (
      p_event_id,
      target_member,
      coalesce(nullif(trim(p_title), ''), 'Touring Mandiri'),
      effective_start,
      effective_end,
      initial_status,
      coalesce(p_date, now()),
      case when is_staff then now() else null end,
      case when is_staff then caller_user_id else null end,
      caller_user_id,
      'member_submission'
    )
    returning id into new_ride_id;

  else
    raise exception 'Aksi tidak valid: %', p_action;
  end if;

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
$function$;

revoke all on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz, uuid, numeric, numeric) from public;
revoke all on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz, uuid, numeric, numeric) from anon;
grant execute on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz, uuid, numeric, numeric) to authenticated;

create or replace function public.review_ride_log(
  p_ride_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_user_id uuid;
  caller_account record;
  target_record record;
  next_status public.ride_status;
begin
  caller_user_id := (select auth.uid());
  if caller_user_id is null then
    raise exception 'Sesi pengurus tidak ditemukan.';
  end if;

  select role, status
  into caller_account
  from public.member_accounts
  where user_id = caller_user_id;

  if caller_account is null
     or caller_account.status <> 'active'::public.account_status
     or caller_account.role not in (
       'road_captain'::public.app_role,
       'admin'::public.app_role,
       'superadmin'::public.app_role
     ) then
    raise exception 'Akses Road Captain, Admin, atau Superadmin diperlukan.';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Status review tidak valid.';
  end if;

  if p_status = 'rejected' and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Alasan penolakan wajib diisi.';
  end if;

  next_status := p_status::public.ride_status;

  select *
  into target_record
  from public.ride_logs
  where id = p_ride_id
  for update;

  if target_record is null then
    raise exception 'Ride log tidak ditemukan.';
  end if;

  if target_record.source_type = 'official_agenda' then
    raise exception 'Official Agenda Distance tidak melalui alur validasi manual.';
  end if;

  if target_record.status <> 'pending'::public.ride_status then
    raise exception 'Ride log ini sudah diproses.';
  end if;

  update public.ride_logs
  set
    status = next_status,
    reviewed_by = caller_user_id,
    reviewed_at = now(),
    rejection_reason = case
      when next_status = 'rejected'::public.ride_status then trim(p_reason)
      else null
    end
  where id = p_ride_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    caller_user_id,
    'ride.review',
    'ride_log',
    p_ride_id::text,
    jsonb_build_object(
      'status', next_status::text,
      'member_external_id', target_record.member_external_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'ride_id', p_ride_id,
    'status', next_status::text,
    'member_external_id', target_record.member_external_id
  );
end;
$function$;

revoke all on function public.review_ride_log(uuid, text, text) from public;
revoke all on function public.review_ride_log(uuid, text, text) from anon;
grant execute on function public.review_ride_log(uuid, text, text) to authenticated;
