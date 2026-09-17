-- Production controls for the operational cash ledger and event QR lifecycle.
alter table public.club_cash_transactions
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id),
  add column if not exists void_reason text;

alter table public.club_cash_transactions
  drop constraint if exists club_cash_transactions_voided_fields_check;
alter table public.club_cash_transactions
  add constraint club_cash_transactions_voided_fields_check check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and voided_by is not null and length(trim(void_reason)) between 3 and 500)
  );

create or replace function public.create_event_checkin_code(p_event_id uuid, p_code_hash text, p_active_until timestamptz)
returns table(active_until timestamptz)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role public.app_role;
begin
  select ma.role into v_role from public.member_accounts ma
  where ma.user_id = (select auth.uid()) and ma.status = 'active';
  if v_role not in ('admin', 'superadmin') then raise exception 'Akses admin diperlukan'; end if;
  if p_code_hash is null or length(p_code_hash) <> 64 then raise exception 'Kode QR tidak valid'; end if;
  if p_active_until <= now() then raise exception 'Masa berlaku QR harus di masa depan'; end if;
  if not exists (select 1 from public.events e where e.id = p_event_id and e.status = 'published') then raise exception 'Agenda published tidak ditemukan'; end if;

  update public.event_checkin_codes set active_until = now()
  where event_checkin_codes.event_id = p_event_id and event_checkin_codes.active_until > now();
  insert into public.event_checkin_codes(event_id, code_hash, active_from, active_until, created_by)
  values(p_event_id, p_code_hash, now() - interval '1 hour', p_active_until, (select auth.uid()));
  return query select p_active_until as active_until;
end; $$;

create or replace function public.void_club_cash_transaction(p_transaction_id uuid, p_reason text)
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
  if v_role not in ('treasurer', 'admin', 'superadmin') then raise exception 'Akses bendahara atau admin diperlukan'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 or length(trim(p_reason)) > 500 then raise exception 'Alasan koreksi harus 3–500 karakter'; end if;
  update public.club_cash_transactions set voided_at = now(), voided_by = (select auth.uid()), void_reason = trim(p_reason)
  where id = p_transaction_id and voided_at is null;
  if not found then raise exception 'Transaksi tidak ditemukan atau sudah dikoreksi'; end if;
end; $$;

create or replace function public.get_member_cash_summary()
returns table(total_balance numeric, income_this_month numeric, expense_this_month numeric, last_updated timestamptz)
language plpgsql security definer set search_path to ''
as $$
begin
  if (select auth.uid()) is null or not exists (select 1 from public.member_accounts ma where ma.user_id = (select auth.uid()) and ma.status = 'active') then raise exception 'Active member account required'; end if;
  return query with all_cash as (
    select transaction_type, transaction_date, amount, created_at from public.cash_transactions
    union all
    select transaction_type, transaction_date, amount, created_at from public.club_cash_transactions where voided_at is null
  ) select
    coalesce(sum(case when ct.transaction_type = 'income' then ct.amount when ct.transaction_type = 'expense' then -ct.amount else 0 end), 0)::numeric,
    coalesce(sum(case when ct.transaction_type = 'income' and date_trunc('month', ct.transaction_date) = date_trunc('month', current_date) then ct.amount else 0 end), 0)::numeric,
    coalesce(sum(case when ct.transaction_type = 'expense' and date_trunc('month', ct.transaction_date) = date_trunc('month', current_date) then ct.amount else 0 end), 0)::numeric,
    max(ct.created_at)
  from all_cash ct;
end; $$;

revoke all on function public.create_event_checkin_code(uuid,text,timestamptz) from public, anon;
revoke all on function public.void_club_cash_transaction(uuid,text) from public, anon;
grant execute on function public.create_event_checkin_code(uuid,text,timestamptz) to authenticated;
grant execute on function public.void_club_cash_transaction(uuid,text) to authenticated;
