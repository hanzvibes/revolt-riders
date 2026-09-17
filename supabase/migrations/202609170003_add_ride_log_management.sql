-- ==============================================================================
-- REVOLT RIDERS: MANAJEMEN RIWAYAT TOURING / SOWAN (ADMIN & USER)
-- Jalankan script ini di SQL Editor Supabase untuk mengaktifkan fitur edit/tambah/hapus.
-- ==============================================================================

-- 1. Trigger otomatis: Selalu sinkronkan total_km di member_profiles saat ada perubahan di ride_logs
create or replace function public.sync_member_total_km()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id text;
  new_total numeric;
begin
  target_id := coalesce(new.member_external_id, old.member_external_id);
  if target_id is not null then
    select coalesce(sum(distance_km), 0)
    into new_total
    from public.ride_logs
    where member_external_id = target_id
      and status = 'approved'::public.ride_status;

    update public.member_profiles
    set total_km = new_total,
        updated_at = now()
    where member_external_id = target_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_member_total_km on public.ride_logs;
create trigger trg_sync_member_total_km
after insert or update or delete on public.ride_logs
for each row execute function public.sync_member_total_km();

-- 2. Kebijakan RLS (Row Level Security) untuk operasi tabel langsung
alter table public.ride_logs enable row level security;

drop policy if exists "Members and admins can insert ride logs" on public.ride_logs;
create policy "Members and admins can insert ride logs" on public.ride_logs
for insert to authenticated
with check (
  exists (
    select 1 from public.member_accounts ma
    where ma.user_id = auth.uid()
      and ma.status = 'active'
      and (
        ma.role in ('admin', 'superadmin', 'road_captain')
        or ma.member_external_id = ride_logs.member_external_id
      )
  )
);

drop policy if exists "Members and admins can update ride logs" on public.ride_logs;
create policy "Members and admins can update ride logs" on public.ride_logs
for update to authenticated
using (
  exists (
    select 1 from public.member_accounts ma
    where ma.user_id = auth.uid()
      and ma.status = 'active'
      and (
        ma.role in ('admin', 'superadmin', 'road_captain')
        or ma.member_external_id = ride_logs.member_external_id
      )
  )
);

drop policy if exists "Members and admins can delete ride logs" on public.ride_logs;
create policy "Members and admins can delete ride logs" on public.ride_logs
for delete to authenticated
using (
  exists (
    select 1 from public.member_accounts ma
    where ma.user_id = auth.uid()
      and ma.status = 'active'
      and (
        ma.role in ('admin', 'superadmin', 'road_captain')
        or ma.member_external_id = ride_logs.member_external_id
      )
  )
);

-- 3. Stored Procedure RPC manage_ride_log (Atomic, Aman & Terverifikasi)
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

    if caller_account.role not in ('admin', 'superadmin', 'road_captain')
       and caller_account.member_external_id != target_member then
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
        reviewed_at = now()
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

    if caller_account.role not in ('admin', 'superadmin', 'road_captain')
       and caller_account.member_external_id != target_member then
      raise exception 'Anda tidak memiliki izin untuk menambahkan riwayat untuk member lain.';
    end if;

    if p_km < 0 then
      raise exception 'Jarak kilometer tidak boleh kurang dari 0.';
    end if;

    insert into public.ride_logs (
      member_external_id,
      title,
      odometer_start,
      odometer_end,
      status,
      created_at,
      reviewed_at
    )
    values (
      target_member,
      coalesce(trim(p_title), 'Touring Mandiri'),
      0,
      p_km,
      'approved'::public.ride_status,
      coalesce(p_date, now()),
      now()
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
    'total_km', calculated_total
  );
end;
$$;

grant execute on function public.manage_ride_log to authenticated;
