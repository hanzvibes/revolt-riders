-- REVOLT RIDERS: Validate member-account claims at the database boundary.

create unique index if not exists idx_member_account_requests_pending_member_ext_unique
on public.member_account_requests(member_external_id)
where status = 'pending'::public.account_request_status;

create or replace function private.create_member_account_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id text;
begin
  v_member_id := upper(nullif(trim(new.raw_user_meta_data ->> 'member_external_id'), ''));

  if v_member_id is null then
    return new;
  end if;

  if v_member_id !~ '^RR-[0-9]{3,}$' then
    raise exception 'Format ID member tidak valid.';
  end if;

  if not exists (
    select 1 from public.member_profiles mp
    where mp.member_external_id = v_member_id
  ) then
    raise exception 'ID member tidak terdaftar sebagai member resmi.';
  end if;

  if exists (
    select 1 from public.member_accounts ma
    where ma.member_external_id = v_member_id
  ) then
    raise exception 'ID member sudah terhubung ke akun lain.';
  end if;

  if exists (
    select 1 from public.member_account_requests mar
    where mar.member_external_id = v_member_id
      and mar.status = 'pending'::public.account_request_status
      and mar.user_id <> new.id
  ) then
    raise exception 'ID member sedang dalam proses verifikasi akun lain.';
  end if;

  insert into public.member_account_requests (user_id, member_external_id, email)
  values (new.id, v_member_id, new.email)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.approve_member_account_request(
  p_request_id uuid,
  p_role text default 'member'
)
returns public.member_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.member_account_requests;
  v_result public.member_accounts;
begin
  if not (select private.has_role(array['admin','superadmin']::public.app_role[])) then
    raise exception 'Akses admin diperlukan';
  end if;

  if coalesce(nullif(trim(p_role), ''), 'member') <> 'member' then
    raise exception 'Akun baru harus disetujui sebagai member. Perubahan role hanya dapat dilakukan oleh Superadmin.';
  end if;

  select * into v_request
  from public.member_account_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Permintaan akun tidak ditemukan atau sudah diproses';
  end if;

  if not exists (
    select 1 from public.member_profiles mp
    where mp.member_external_id = v_request.member_external_id
  ) then
    raise exception 'ID member tidak lagi terdaftar sebagai member resmi';
  end if;

  if exists (
    select 1 from public.member_accounts ma
    where ma.member_external_id = v_request.member_external_id
  ) then
    raise exception 'ID member sudah terhubung ke akun lain';
  end if;

  insert into public.member_accounts (user_id, member_external_id, role)
  values (v_request.user_id, v_request.member_external_id, 'member'::public.app_role)
  returning * into v_result;

  update public.member_account_requests
  set status = 'approved',
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = v_request.id;

  return v_result;
end;
$$;

revoke all on function public.approve_member_account_request(uuid, text) from public, anon;
grant execute on function public.approve_member_account_request(uuid, text) to authenticated;
