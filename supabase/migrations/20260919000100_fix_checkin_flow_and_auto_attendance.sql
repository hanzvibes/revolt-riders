-- ==============================================================================
-- REVOLT RIDERS: FIX CHECK-IN FLOW & ZERO-CLICK ATTENDANCE RPC
-- 1. Remove length(p_code) < 32 limitation that blocked RR-XXXXXXXXXXXX codes
-- 2. Clean/extract code from URL parameter if full link was scanned
-- 3. Return structured attendance data including already_checked_in flag
-- ==============================================================================

drop function if exists public.check_in_with_code(text);

create or replace function public.check_in_with_code(p_code text)
returns table(
  attendance_id uuid,
  event_id uuid,
  event_title text,
  already_checked_in boolean,
  checked_in_at timestamptz,
  member_name text
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid;
  v_member_external_id text;
  v_member_name text;
  v_event_id uuid;
  v_event_title text;
  v_clean_code text;
  v_code_hash text;
  v_existing_id uuid;
  v_existing_checked_in_at timestamptz;
  v_new_id uuid;
  v_new_checked_in_at timestamptz;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'Autentikasi diperlukan. Silakan masuk terlebih dahulu.';
  end if;

  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'Kode check-in tidak valid';
  end if;

  -- Clean code: if a full URL or query string was passed (e.g. https://.../check-in?code=RR-XXX or ?code=RR-XXX)
  v_clean_code := trim(p_code);
  if position('code=' in lower(v_clean_code)) > 0 then
    v_clean_code := split_part(split_part(v_clean_code, 'code=', 2), '&', 1);
  end if;
  v_clean_code := upper(trim(v_clean_code));

  if length(v_clean_code) < 4 then
    raise exception 'Kode check-in tidak valid';
  end if;

  -- Verify active member
  select ma.member_external_id, coalesce(mp.nickname, mp.full_name, ma.member_external_id)
  into v_member_external_id, v_member_name
  from public.member_accounts ma
  left join public.member_profiles mp on mp.member_external_id = ma.member_external_id
  where ma.user_id = v_user_id
    and ma.status = 'active';

  if v_member_external_id is null then
    raise exception 'Akun member belum aktif atau tidak terhubung';
  end if;

  -- Compute SHA-256 hash of the cleaned code
  v_code_hash := encode(extensions.digest(v_clean_code, 'sha256'), 'hex');

  -- Look up active event checkin code
  select ec.event_id, e.title
  into v_event_id, v_event_title
  from public.event_checkin_codes ec
  join public.events e on e.id = ec.event_id
  where ec.code_hash = v_code_hash
    and now() between ec.active_from and ec.active_until
    and e.status = 'published'
  order by ec.created_at desc
  limit 1;

  if v_event_id is null then
    raise exception 'Kode check-in tidak aktif atau masa berlaku QR telah berakhir.';
  end if;

  -- Check if member already checked in
  select ea.id, ea.checked_in_at
  into v_existing_id, v_existing_checked_in_at
  from public.event_attendance ea
  where ea.event_id = v_event_id
    and ea.member_external_id = v_member_external_id
  limit 1;

  if v_existing_id is not null then
    return query select
      v_existing_id as attendance_id,
      v_event_id as event_id,
      v_event_title as event_title,
      true as already_checked_in,
      v_existing_checked_in_at as checked_in_at,
      v_member_name as member_name;
    return;
  end if;

  -- Insert new attendance record
  insert into public.event_attendance as ea (
    event_id, member_external_id, method, checked_in_by
  )
  values (
    v_event_id, v_member_external_id, 'qr', v_user_id
  )
  returning ea.id, ea.checked_in_at into v_new_id, v_new_checked_in_at;

  return query select
    v_new_id as attendance_id,
    v_event_id as event_id,
    v_event_title as event_title,
    false as already_checked_in,
    v_new_checked_in_at as checked_in_at,
    v_member_name as member_name;
end;
$function$;

grant execute on function public.check_in_with_code(text) to authenticated;
