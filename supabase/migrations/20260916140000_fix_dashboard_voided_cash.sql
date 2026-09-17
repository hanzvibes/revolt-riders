-- Keep dashboard cash totals consistent with the production cash ledger.
-- Corrected transactions remain auditable, but must not affect balances.
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
end;
$$;
