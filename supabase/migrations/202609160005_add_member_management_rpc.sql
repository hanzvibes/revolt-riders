create or replace function public.upsert_member_profile(
  p_member_external_id text,
  p_full_name text,
  p_nickname text default null,
  p_city text default null,
  p_join_date date default null,
  p_club_role text default null,
  p_total_km numeric default 0,
  p_motorcycle text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_member_id text := upper(trim(p_member_external_id));
begin
  if (select auth.uid()) is null or not (select private.has_role(array['admin','superadmin']::public.app_role[])) then
    raise exception 'Akses Admin atau Superadmin diperlukan';
  end if;
  if v_member_id !~ '^RR-[0-9]{3,}$' then raise exception 'Member ID harus memakai format RR-001'; end if;
  if length(trim(p_full_name)) < 2 or length(trim(p_full_name)) > 120 then raise exception 'Nama member tidak valid'; end if;
  if coalesce(p_total_km, 0) < 0 then raise exception 'Total kilometer tidak boleh negatif'; end if;

  insert into public.member_profiles(member_external_id,full_name,nickname,city,join_date,club_role,total_km,source_file,updated_at)
  values(v_member_id,trim(p_full_name),nullif(trim(p_nickname),''),nullif(trim(p_city),''),p_join_date,nullif(trim(p_club_role),''),coalesce(p_total_km,0),'APP',now())
  on conflict(member_external_id) do update set
    full_name=excluded.full_name,nickname=excluded.nickname,city=excluded.city,join_date=excluded.join_date,
    club_role=excluded.club_role,total_km=excluded.total_km,source_file='APP',updated_at=now();

  if nullif(trim(p_motorcycle), '') is not null or exists(select 1 from public.member_details where member_external_id=v_member_id) then
    insert into public.member_details(member_external_id,motorcycle,updated_by,updated_at)
    values(v_member_id,nullif(trim(p_motorcycle),''),(select auth.uid()),now())
    on conflict(member_external_id) do update set motorcycle=excluded.motorcycle,updated_by=(select auth.uid()),updated_at=now();
  end if;
end;
$$;

revoke all on function public.upsert_member_profile(text,text,text,text,date,text,numeric,text) from public,anon,authenticated;
grant execute on function public.upsert_member_profile(text,text,text,text,date,text,numeric,text) to authenticated;

drop trigger if exists audit_member_details on public.member_details;
create trigger audit_member_details after insert or update or delete on public.member_details for each row execute function private.write_audit_log();
