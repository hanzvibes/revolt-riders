-- REVOLT RIDERS: My Garage / Motorcycle Passport
-- Multi-bike member garage with active-member visibility and owner-only mutations.

create table if not exists public.member_motorcycles (
  id uuid primary key default gen_random_uuid(),
  member_external_id text not null references public.member_profiles(member_external_id) on delete cascade,
  nickname text,
  brand text not null,
  model text not null,
  production_year integer,
  style text,
  engine_cc integer,
  color text,
  notes text,
  is_primary boolean not null default false,
  is_visible_to_members boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_motorcycles_brand_check check (length(trim(brand)) between 2 and 60),
  constraint member_motorcycles_model_check check (length(trim(model)) between 1 and 80),
  constraint member_motorcycles_year_check check (production_year is null or production_year between 1950 and 2100),
  constraint member_motorcycles_engine_check check (engine_cc is null or engine_cc between 50 and 5000),
  constraint member_motorcycles_notes_check check (notes is null or length(notes) <= 600)
);

create index if not exists member_motorcycles_member_idx
  on public.member_motorcycles(member_external_id, is_primary desc, created_at desc);

create unique index if not exists member_motorcycles_one_primary_idx
  on public.member_motorcycles(member_external_id)
  where is_primary = true;

alter table public.member_motorcycles enable row level security;

drop policy if exists "member_motorcycles_active_read" on public.member_motorcycles;
create policy "member_motorcycles_active_read"
on public.member_motorcycles
for select
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
      and (
        ma.member_external_id = member_motorcycles.member_external_id
        or member_motorcycles.is_visible_to_members = true
        or ma.role in ('admin','superadmin')
      )
  )
);

revoke all privileges on table public.member_motorcycles from anon;
revoke insert, update, delete on table public.member_motorcycles from authenticated;
grant select on table public.member_motorcycles to authenticated;

create or replace function public.save_member_motorcycle(
  p_id uuid default null,
  p_nickname text default null,
  p_brand text default null,
  p_model text default null,
  p_production_year integer default null,
  p_style text default null,
  p_engine_cc integer default null,
  p_color text default null,
  p_notes text default null,
  p_is_primary boolean default false,
  p_is_visible_to_members boolean default true
)
returns public.member_motorcycles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account record;
  v_result public.member_motorcycles;
  v_is_primary boolean;
begin
  select ma.member_external_id, ma.status
  into v_account
  from public.member_accounts ma
  where ma.user_id = (select auth.uid());

  if v_account is null or v_account.status <> 'active'::public.account_status then
    raise exception 'Akun member aktif diperlukan';
  end if;

  if length(trim(coalesce(p_brand, ''))) < 2 then
    raise exception 'Brand motor minimal 2 karakter';
  end if;
  if length(trim(coalesce(p_model, ''))) < 1 then
    raise exception 'Model motor wajib diisi';
  end if;
  if p_production_year is not null and (p_production_year < 1950 or p_production_year > 2100) then
    raise exception 'Tahun motor tidak valid';
  end if;
  if p_engine_cc is not null and (p_engine_cc < 50 or p_engine_cc > 5000) then
    raise exception 'Kapasitas mesin tidak valid';
  end if;
  if p_notes is not null and length(p_notes) > 600 then
    raise exception 'Catatan maksimal 600 karakter';
  end if;

  v_is_primary := coalesce(p_is_primary, false);

  if p_id is null then
    if not exists (
      select 1 from public.member_motorcycles mm
      where mm.member_external_id = v_account.member_external_id
    ) then
      v_is_primary := true;
    end if;

    if v_is_primary then
      update public.member_motorcycles
      set is_primary = false,
          updated_at = now(),
          updated_by = (select auth.uid())
      where member_external_id = v_account.member_external_id
        and is_primary = true;
    end if;

    insert into public.member_motorcycles (
      member_external_id,nickname,brand,model,production_year,style,engine_cc,color,
      notes,is_primary,is_visible_to_members,updated_by
    )
    values (
      v_account.member_external_id,
      nullif(trim(p_nickname), ''),
      trim(p_brand),
      trim(p_model),
      p_production_year,
      nullif(trim(p_style), ''),
      p_engine_cc,
      nullif(trim(p_color), ''),
      nullif(trim(p_notes), ''),
      v_is_primary,
      coalesce(p_is_visible_to_members, true),
      (select auth.uid())
    )
    returning * into v_result;
  else
    select *
    into v_result
    from public.member_motorcycles
    where id = p_id
      and member_external_id = v_account.member_external_id
    for update;

    if not found then
      raise exception 'Motor tidak ditemukan atau bukan milik akun ini';
    end if;

    if v_is_primary then
      update public.member_motorcycles
      set is_primary = false,
          updated_at = now(),
          updated_by = (select auth.uid())
      where member_external_id = v_account.member_external_id
        and id <> p_id
        and is_primary = true;
    elsif v_result.is_primary and (
      select count(*) from public.member_motorcycles
      where member_external_id = v_account.member_external_id
    ) = 1 then
      v_is_primary := true;
    end if;

    update public.member_motorcycles
    set nickname = nullif(trim(p_nickname), ''),
        brand = trim(p_brand),
        model = trim(p_model),
        production_year = p_production_year,
        style = nullif(trim(p_style), ''),
        engine_cc = p_engine_cc,
        color = nullif(trim(p_color), ''),
        notes = nullif(trim(p_notes), ''),
        is_primary = v_is_primary,
        is_visible_to_members = coalesce(p_is_visible_to_members, true),
        updated_by = (select auth.uid()),
        updated_at = now()
    where id = p_id
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

revoke all on function public.save_member_motorcycle(uuid,text,text,text,integer,text,integer,text,text,boolean,boolean) from public, anon;
grant execute on function public.save_member_motorcycle(uuid,text,text,text,integer,text,integer,text,text,boolean,boolean) to authenticated;

create or replace function public.delete_member_motorcycle(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account record;
  v_was_primary boolean;
begin
  select ma.member_external_id, ma.status
  into v_account
  from public.member_accounts ma
  where ma.user_id = (select auth.uid());

  if v_account is null or v_account.status <> 'active'::public.account_status then
    raise exception 'Akun member aktif diperlukan';
  end if;

  select is_primary
  into v_was_primary
  from public.member_motorcycles
  where id = p_id
    and member_external_id = v_account.member_external_id
  for update;

  if not found then
    raise exception 'Motor tidak ditemukan atau bukan milik akun ini';
  end if;

  delete from public.member_motorcycles where id = p_id;

  if v_was_primary then
    update public.member_motorcycles
    set is_primary = true,
        updated_by = (select auth.uid()),
        updated_at = now()
    where id = (
      select id
      from public.member_motorcycles
      where member_external_id = v_account.member_external_id
      order by created_at asc
      limit 1
    );
  end if;
end;
$$;

revoke all on function public.delete_member_motorcycle(uuid) from public, anon;
grant execute on function public.delete_member_motorcycle(uuid) to authenticated;
