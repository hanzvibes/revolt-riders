-- REVOLT RIDERS: Prevent role escalation during account approval.
-- New accounts are always approved as member. Role promotion remains Superadmin-only.

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
