-- REVOLT RIDERS: Lock processed ride mutations for regular members.
-- Regular members may only update/delete their own pending ride logs.
-- Staff roles retain correction privileges.

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
  caller_user_id := (select auth.uid());
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
    where id = p_ride_id
    for update;

    if target_record is null then
      raise exception 'Data kegiatan tidak ditemukan.';
    end if;

    target_member := target_record.member_external_id;

    if not is_staff and caller_account.member_external_id != target_member then
      raise exception 'Anda tidak memiliki izin untuk mengubah riwayat member lain.';
    end if;

    if not is_staff and target_record.status <> 'pending'::public.ride_status then
      raise exception 'Ride yang sudah diproses tidak dapat diubah atau dihapus oleh member.';
    end if;

    if p_action = 'delete' then
      delete from public.ride_logs where id = p_ride_id;
    elsif p_action = 'update' then
      if p_km < 0 then
        raise exception 'Jarak kilometer tidak boleh kurang dari 0.';
      end if;

      update public.ride_logs
      set
        title = coalesce(nullif(trim(p_title), ''), title),
        odometer_start = 0,
        odometer_end = p_km,
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

    if not is_staff and caller_account.member_external_id != target_member then
      raise exception 'Anda tidak memiliki izin untuk menambahkan riwayat untuk member lain.';
    end if;

    if p_km < 0 then
      raise exception 'Jarak kilometer tidak boleh kurang dari 0.';
    end if;

    if is_staff then
      initial_status := 'approved'::public.ride_status;
    else
      initial_status := 'pending'::public.ride_status;
    end if;

    insert into public.ride_logs (
      member_external_id, title, odometer_start, odometer_end, status,
      created_at, reviewed_at, reviewed_by, submitted_by
    )
    values (
      target_member,
      coalesce(nullif(trim(p_title), ''), 'Touring Mandiri'),
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

revoke all on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz) from public, anon;
grant execute on function public.manage_ride_log(text, uuid, text, text, numeric, timestamptz) to authenticated;
